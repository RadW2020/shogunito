import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { User } from '../entities/user.entity';

import { JwtPayload, TokenResponse } from './interfaces/jwt-payload.interface';
import { EmailService } from '../email/email.service';
import { RefreshTokenService } from './refresh-token.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'passwordHash' | 'hashPassword' | 'validatePassword'> | null> {
    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    if (!user.isActive) {
      throw new ForbiddenException('Usuario desactivado');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...result } = user;
    return result as Omit<User, 'passwordHash' | 'hashPassword' | 'validatePassword'>;
  }

  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ user: Partial<User>; tokens: any }> {
    // Validate required fields manually (in case ValidationPipe doesn't catch missing fields)
    // When transform: true, missing fields become undefined
    // Simply check if values are undefined, null, or empty strings
    if (
      !registerDto?.email ||
      (typeof registerDto.email === 'string' && registerDto.email.trim() === '')
    ) {
      throw new BadRequestException('El email es requerido');
    }
    if (
      !registerDto?.name ||
      (typeof registerDto.name === 'string' && registerDto.name.trim() === '')
    ) {
      throw new BadRequestException('El nombre es requerido');
    }
    if (
      !registerDto?.password ||
      (typeof registerDto.password === 'string' && registerDto.password.trim() === '')
    ) {
      throw new BadRequestException('La contraseña es requerida');
    }

    // Validate email format (since ValidationPipe doesn't seem to be working correctly)
    if (typeof registerDto.email === 'string') {
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(registerDto.email.trim())) {
        throw new BadRequestException('Email inválido');
      }
    }

    // Validate password format (since ValidationPipe doesn't seem to be working correctly)
    if (typeof registerDto.password === 'string') {
      if (registerDto.password.length < 8) {
        throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(registerDto.password)) {
        throw new BadRequestException(
          'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
        );
      }
    }

    // Verificar si el registro está restringido a una lista de emails permitidos
    const allowedEmails = this.configService.get<string>('ALLOWED_REGISTRATION_EMAILS');

    if (allowedEmails) {
      // Si el valor es '*', permitir todos los emails (útil para tests)
      if (allowedEmails.trim() === '*') {
        // Permitir registro sin restricciones
      } else {
        // Si hay una lista de emails permitidos, validar que el email esté en la lista
        const allowedEmailsList = allowedEmails
          .split(',')
          .map((email) => email.trim().toLowerCase())
          .filter((email) => email.length > 0);

        const emailLower = registerDto.email.toLowerCase();

        if (!allowedEmailsList.includes(emailLower)) {
          throw new ForbiddenException(
            'El registro está restringido. Tu email no está en la lista de emails permitidos.',
          );
        }
      }
    } else {
      // Si no hay lista configurada, deshabilitar el registro por seguridad
      throw new ForbiddenException('El registro de nuevos usuarios está deshabilitado.');
    }

    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Map legacy roles to current roles
    let role: 'admin' | 'director' | 'artist' | 'member' = 'member';
    if (registerDto.role) {
      switch (registerDto.role) {
        case 'admin':
          role = 'admin';
          break;
        case 'producer':
        case 'reviewer':
          // Legacy roles mapped to director
          role = 'director';
          break;
        case 'artist':
          role = 'artist';
          break;
        case 'member':
        default:
          role = 'member';
          break;
      }
    }

    const user = await this.usersService.create(
      {
        email: registerDto.email,
        name: registerDto.name,
        password: registerDto.password,
        role,
      },
      null, // Self-registration, no createdBy
    );

    const tokens = await this.generateTokens(user.id, user.email, user.role, ipAddress, userAgent);

    const { passwordHash, refreshToken, ...userWithoutSensitiveData } = user;
    // Explicitly exclude sensitive fields
    void passwordHash;
    void refreshToken;

    return {
      user: userWithoutSensitiveData,
      tokens,
    };
  }

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ user: Partial<User>; tokens: any }> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, ipAddress, userAgent);
    await this.usersService.updateLastLogin(user.id);

    return {
      user,
      tokens,
    };
  }

  async logout(userId: number, tokenFamily?: string): Promise<void> {
    if (tokenFamily) {
      // Revocar solo la familia de tokens específica
      await this.refreshTokenService.revokeTokenFamily(tokenFamily, userId);
    } else {
      // Revocar todos los tokens del usuario
      await this.refreshTokenService.revokeAllUserTokens(userId);
    }

    // Mantener compatibilidad con el campo refreshToken del user
    await this.usersService.updateRefreshToken(userId, null);
  }

  /**
   * Refresca los tokens con rotación automática
   * Detecta y previene replay attacks
   */
  async refreshTokens(
    userId: number,
    refreshToken: string,
    jti: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenResponse> {
    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new ForbiddenException('Usuario no encontrado');
    }

    // Validar el refresh token (esto detectará replay attacks)
    const storedToken = await this.refreshTokenService.validateRefreshToken(jti, refreshToken);

    // Generar nuevos JTI y token
    const newJti = this.refreshTokenService.generateJti();
    const newTokenFamily = storedToken.tokenFamily; // Mantener la misma familia

    // Generar los nuevos tokens
    const payload: JwtPayload = {
      sub: String(userId), // JWT requires string, but userId is now number
      email: user.email,
      role: user.role,
      jti: newJti,
      tokenFamily: newTokenFamily,
    };

    const refreshExpiresIn =
      parseInt(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_SECONDS')) || 604800; // 7 días

    const [accessToken, newRefreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'your-refresh-secret',
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    // ROTACIÓN: Marcar el token viejo como usado y crear uno nuevo
    await this.refreshTokenService.rotateRefreshToken(
      jti,
      newRefreshToken,
      newJti,
      refreshExpiresIn,
      ipAddress,
      userAgent,
    );

    // Mantener compatibilidad guardando el hash en el usuario
    await this.usersService.updateRefreshToken(userId, newRefreshToken);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900, // 15 minutes in seconds
      tokenType: 'Bearer',
    };
  }

  /**
   * Genera nuevos tokens para login/registro
   * Crea una nueva familia de tokens
   */
  async generateTokens(
    userId: number,
    email: string,
    role: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Generar IDs únicos para el token y la familia
    const jti = this.refreshTokenService.generateJti();
    const tokenFamily = this.refreshTokenService.generateTokenFamily();

    const payload: JwtPayload = {
      sub: String(userId), // JWT requires string, but userId is now number
      email,
      role,
      jti,
      tokenFamily,
    };

    const refreshExpiresIn =
      parseInt(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_SECONDS')) || 604800; // 7 días por defecto

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'your-refresh-secret',
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    // Guardar el refresh token en la base de datos
    await this.refreshTokenService.createRefreshToken(
      userId,
      refreshToken,
      jti,
      tokenFamily,
      refreshExpiresIn,
      ipAddress,
      userAgent,
    );

    // Mantener compatibilidad guardando el hash en el usuario también
    await this.usersService.updateRefreshToken(userId, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      tokenType: 'Bearer',
    };
  }

  async getProfile(userId: number): Promise<Partial<User>> {
    const user = await this.usersService.findOne(userId);

    const { passwordHash, refreshToken, ...profile } = user;
    // Explicitly exclude sensitive fields
    void passwordHash;
    void refreshToken;
    return profile;
  }

  /**
   * Solicitar recuperación de contraseña
   */
  async requestPasswordReset(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    // Buscar usuario por email
    const user = await this.usersService.findByEmail(email);

    // Por seguridad, siempre devolver el mismo mensaje aunque el usuario no exista
    // Esto evita que se puedan enumerar emails válidos
    if (!user) {
      return {
        message:
          'Si el correo existe en nuestro sistema, recibirás un email con instrucciones para restablecer tu contraseña.',
      };
    }

    // Verificar que el usuario esté activo
    if (!user.isActive) {
      return {
        message:
          'Si el correo existe en nuestro sistema, recibirás un email con instrucciones para restablecer tu contraseña.',
      };
    }

    // Generar token seguro
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Calcular fecha de expiración (default: 1 hora)
    const expiryConfig = this.configService.get('PASSWORD_RESET_TOKEN_EXPIRY');
    const expiryMs = Number(expiryConfig) || 3600000;
    const expiresAt = new Date(Date.now() + expiryMs);

    // Guardar token en la base de datos
    await this.usersService.updatePasswordResetToken(user.id, resetToken, expiresAt);

    // Enviar email con el link de recuperación
    try {
      await this.emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
    } catch {
      // Si falla el envío del email, limpiar el token
      await this.usersService.clearPasswordResetToken(user.id);
      throw new BadRequestException(
        'Error al enviar el correo de recuperación. Por favor, intenta de nuevo más tarde.',
      );
    }

    return {
      message:
        'Si el correo existe en nuestro sistema, recibirás un email con instrucciones para restablecer tu contraseña.',
    };
  }

  /**
   * Validar token de recuperación
   */
  async validateResetToken(token: string): Promise<{ valid: boolean; message?: string }> {
    const user = await this.usersService.findByPasswordResetToken(token);

    if (!user) {
      return {
        valid: false,
        message: 'El token es inválido o ha expirado.',
      };
    }

    return {
      valid: true,
    };
  }

  /**
   * Resetear contraseña con token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    // Buscar usuario por token válido
    const user = await this.usersService.findByPasswordResetToken(token);

    if (!user) {
      throw new BadRequestException('El token es inválido o ha expirado.');
    }

    // Verificar que el usuario esté activo
    if (!user.isActive) {
      throw new ForbiddenException('La cuenta está desactivada.');
    }

    // Resetear la contraseña
    await this.usersService.resetPassword(user.id, newPassword);

    // Enviar email de confirmación
    try {
      await this.emailService.sendPasswordChangedEmail(user.email, user.name);
    } catch (error) {
      // Si falla el envío del email de confirmación, solo loguearlo
      // No queremos fallar todo el proceso si la contraseña ya se cambió
      console.error('Error al enviar email de confirmación:', error);
    }

    return {
      message:
        'Tu contraseña ha sido actualizada exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.',
    };
  }
}
