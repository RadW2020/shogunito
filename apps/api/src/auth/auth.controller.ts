import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ValidateResetTokenDto } from './dto/validate-reset-token.dto';
import type { JwtPayloadWithRefreshToken, TokenResponse } from './interfaces/jwt-payload.interface';

interface CurrentUserPayload {
  id: number;
  email: string;
  name: string;
  role: string;
  tokenFamily?: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar nuevo usuario',
    description: 'Crea una nueva cuenta de usuario en el sistema.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
    schema: {
      example: {
        user: {
          id: 'uuid',
          email: 'user@example.com',
          name: 'John Doe',
          role: 'member',
        },
        tokens: {
          accessToken: 'jwt-token',
          refreshToken: 'refresh-token',
          expiresIn: 900,
          tokenType: 'Bearer',
        },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    const ipAddress =
      req.ip ||
      (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : undefined) ||
      (typeof realIp === 'string' ? realIp : undefined) ||
      'unknown';
    const userAgent = req.headers['user-agent'];
    return this.authService.register(registerDto, ipAddress, userAgent);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Autentica un usuario y retorna tokens de acceso.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    schema: {
      example: {
        user: {
          id: 'uuid',
          email: 'user@example.com',
          name: 'John Doe',
          role: 'member',
        },
        tokens: {
          accessToken: 'jwt-token',
          refreshToken: 'refresh-token',
          expiresIn: 900,
          tokenType: 'Bearer',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    const ipAddress =
      req.ip ||
      (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : undefined) ||
      (typeof realIp === 'string' ? realIp : undefined) ||
      'unknown';
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cerrar sesión',
    description: 'Invalida el refresh token del usuario',
  })
  @ApiResponse({ status: 200, description: 'Logout exitoso' })
  async logout(@CurrentUser() user: CurrentUserPayload) {
    // Revocar la familia de tokens si está disponible en el payload
    await this.authService.logout(Number(user.id), user.tokenFamily);
    return { message: 'Logout exitoso' };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Refrescar tokens',
    description:
      'Genera nuevos tokens usando el refresh token. Implementa rotación automática y detección de replay attacks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens renovados exitosamente',
    schema: {
      example: {
        accessToken: 'new-jwt-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Refresh token inválido o replay attack detectado. Todos los tokens han sido revocados.',
  })
  async refreshTokens(
    @Req() req: Request & { user: JwtPayloadWithRefreshToken },
  ): Promise<TokenResponse> {
    const userId = req.user.sub;
    const refreshToken = req.user.refreshToken;
    const jti = req.user.jti;

    // Validate required fields
    if (!userId) {
      throw new UnauthorizedException('Invalid token: missing user ID');
    }

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    if (!jti) {
      throw new UnauthorizedException('Invalid token: missing token ID');
    }

    // Convert userId to number and validate
    const userIdNumber = Number(userId);
    if (isNaN(userIdNumber) || userIdNumber <= 0) {
      throw new UnauthorizedException('Invalid user ID in token');
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    const ipAddress =
      req.ip ||
      (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : undefined) ||
      (typeof realIp === 'string' ? realIp : undefined) ||
      'unknown';
    const userAgent = req.headers['user-agent'];

    return this.authService.refreshTokens(userIdNumber, refreshToken, jti, ipAddress, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener perfil de usuario',
    description: 'Retorna la información del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil obtenido exitosamente',
    schema: {
      example: {
        id: 'uuid',
        email: 'user@example.com',
        name: 'John Doe',
        role: 'member',
        isActive: true,
        lastLoginAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    },
  })
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getProfile(Number(user.id));
  }

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Verifica que el servicio de autenticación esté funcionando',
  })
  @ApiResponse({
    status: 200,
    description: 'Servicio funcionando correctamente',
  })
  health() {
    return {
      status: 'ok',
      service: 'auth',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('status')
  @ApiOperation({
    summary: 'Estado de autenticación',
    description:
      'Retorna si la autenticación está habilitada y el usuario mock si está deshabilitada',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de autenticación',
    schema: {
      example: {
        authEnabled: false,
        mockUser: {
          id: 'mock-user-id',
          email: 'admin@shogun.com',
          name: 'Development User',
          role: 'admin',
        },
      },
    },
  })
  authStatus() {
    const authEnabled =
      this.configService.get<string>('AUTH_ENABLED', 'true').toLowerCase() !== 'false';
    return {
      authEnabled,
      mockUser: !authEnabled
        ? {
            id: 'mock-user-id',
            email: 'admin@shogun.com',
            name: 'Development User',
            role: 'admin',
            isActive: true,
          }
        : null,
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar recuperación de contraseña',
    description: 'Envía un correo electrónico con instrucciones para restablecer la contraseña',
  })
  @ApiResponse({
    status: 200,
    description: 'Correo de recuperación enviado',
    schema: {
      example: {
        message:
          'Si el correo existe en nuestro sistema, recibirás un email con instrucciones para restablecer tu contraseña.',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Error al enviar el correo' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(forgotPasswordDto);
  }

  @Public()
  @Post('validate-reset-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validar token de recuperación',
    description: 'Verifica si el token de recuperación es válido y no ha expirado',
  })
  @ApiResponse({
    status: 200,
    description: 'Token validado',
    schema: {
      example: {
        valid: true,
      },
    },
  })
  async validateResetToken(@Body() validateResetTokenDto: ValidateResetTokenDto) {
    return this.authService.validateResetToken(validateResetTokenDto.token);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restablecer contraseña',
    description: 'Restablece la contraseña del usuario usando el token recibido por correo',
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada exitosamente',
    schema: {
      example: {
        message:
          'Tu contraseña ha sido actualizada exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  @ApiResponse({ status: 403, description: 'Cuenta desactivada' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
