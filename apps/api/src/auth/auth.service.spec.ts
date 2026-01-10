import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { RefreshTokenService } from './refresh-token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let emailService: jest.Mocked<EmailService>;
  let refreshTokenService: jest.Mocked<RefreshTokenService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: '$2b$10$hashedpassword',
    role: 'member' as const,
    isActive: true,
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Base config values that should be preserved in all tests
  const baseConfig: Record<string, any> = {
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_REFRESH_EXPIRES_IN: '7d',
    JWT_REFRESH_EXPIRES_IN_SECONDS: '604800',
    ALLOWED_REGISTRATION_EMAILS: '*',
    PASSWORD_RESET_URL: 'https://app.shogun.com/reset-password',
    PASSWORD_RESET_TOKEN_EXPIRY: '3600000',
  };

  // Helper function to create a config mock that preserves base values
  const createConfigMock = (overrides: Record<string, any> = {}) => {
    return jest.fn((key: string, defaultValue?: any) => {
      const config = { ...baseConfig, ...overrides };
      return config[key] !== undefined ? config[key] : defaultValue;
    });
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmailWithPassword: jest.fn(),
            findByEmail: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            updateRefreshToken: jest.fn(),
            updateLastLogin: jest.fn(),
            updatePasswordResetToken: jest.fn(),
            findByPasswordResetToken: jest.fn(),
            clearPasswordResetToken: jest.fn(),
            resetPassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: createConfigMock(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendPasswordResetEmail: jest.fn(),
            sendPasswordChangedEmail: jest.fn(),
          },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            generateJti: jest.fn(),
            generateTokenFamily: jest.fn(),
            createRefreshToken: jest.fn(),
            validateRefreshToken: jest.fn(),
            rotateRefreshToken: jest.fn(),
            revokeTokenFamily: jest.fn(),
            revokeAllUserTokens: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    emailService = module.get(EmailService);
    refreshTokenService = module.get(RefreshTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('user-123');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null when user does not exist', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should throw ForbiddenException when user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      usersService.findByEmailWithPassword.mockResolvedValue(inactiveUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.validateUser('test@example.com', 'password123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'new@example.com',
      name: 'New User',
      password: 'Password123',
    };

    it('should register user successfully', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser as any);
      jwtService.signAsync.mockResolvedValue('token');
      refreshTokenService.generateJti.mockReturnValue('jti-123');
      refreshTokenService.generateTokenFamily.mockReturnValue('family-123');
      refreshTokenService.createRefreshToken.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(usersService.create).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
    });

    it('should throw BadRequestException when email is missing', async () => {
      const invalidDto = { ...registerDto, email: '' };

      await expect(service.register(invalidDto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when password is too short', async () => {
      const invalidDto = { ...registerDto, password: 'short' };

      await expect(service.register(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when password lacks uppercase', async () => {
      const invalidDto = { ...registerDto, password: 'password123' };

      await expect(service.register(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when password lacks lowercase', async () => {
      const invalidDto = { ...registerDto, password: 'PASSWORD123' };

      await expect(service.register(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when password lacks number', async () => {
      const invalidDto = { ...registerDto, password: 'Password' };

      await expect(service.register(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when email is invalid format', async () => {
      const invalidDto = { ...registerDto, email: 'invalid-email' };

      await expect(service.register(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when name is missing', async () => {
      const invalidDto = { ...registerDto, name: '' };

      await expect(service.register(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when email is null', async () => {
      const invalidDto = { ...registerDto, email: null };

      await expect(service.register(invalidDto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when password is null', async () => {
      const invalidDto = { ...registerDto, password: null };

      await expect(service.register(invalidDto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when email is not in allowed list', async () => {
      configService.get.mockImplementation(
        createConfigMock({
          ALLOWED_REGISTRATION_EMAILS: 'allowed@example.com,other@example.com',
        }),
      );
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when ALLOWED_REGISTRATION_EMAILS is not configured', async () => {
      configService.get.mockImplementation(
        createConfigMock({
          ALLOWED_REGISTRATION_EMAILS: undefined,
        }),
      );
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(ForbiddenException);
    });

    it('should allow registration when email is in allowed list', async () => {
      configService.get.mockImplementation(
        createConfigMock({
          ALLOWED_REGISTRATION_EMAILS: 'new@example.com,other@example.com',
        }),
      );
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser as any);
      jwtService.signAsync.mockResolvedValue('token');
      refreshTokenService.generateJti.mockReturnValue('jti-123');
      refreshTokenService.generateTokenFamily.mockReturnValue('family-123');
      refreshTokenService.createRefreshToken.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
    });

    it('should allow registration when ALLOWED_REGISTRATION_EMAILS is "*"', async () => {
      configService.get.mockImplementation(
        createConfigMock({
          ALLOWED_REGISTRATION_EMAILS: '*',
        }),
      );
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser as any);
      jwtService.signAsync.mockResolvedValue('token');
      refreshTokenService.generateJti.mockReturnValue('jti-123');
      refreshTokenService.generateTokenFamily.mockReturnValue('family-123');
      refreshTokenService.createRefreshToken.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
    });

    it('should throw ConflictException when email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should exclude sensitive data from user in response', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser as any);
      jwtService.signAsync.mockResolvedValue('token');
      refreshTokenService.generateJti.mockReturnValue('jti-123');
      refreshTokenService.generateTokenFamily.mockReturnValue('family-123');
      refreshTokenService.createRefreshToken.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('refreshToken');
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('token');
      refreshTokenService.generateJti.mockReturnValue('jti-123');
      refreshTokenService.generateTokenFamily.mockReturnValue('family-123');
      refreshTokenService.createRefreshToken.mockResolvedValue(undefined);
      usersService.updateLastLogin.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(usersService.updateLastLogin).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke specific token family', async () => {
      refreshTokenService.revokeTokenFamily.mockResolvedValue(undefined);
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      await service.logout('user-123', 'token-family-123');

      expect(refreshTokenService.revokeTokenFamily).toHaveBeenCalledWith(
        'token-family-123',
        'user-123',
      );
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith('user-123', null);
    });

    it('should revoke all tokens when no family specified', async () => {
      refreshTokenService.revokeAllUserTokens.mockResolvedValue(undefined);
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      await service.logout('user-123');

      expect(refreshTokenService.revokeAllUserTokens).toHaveBeenCalledWith('user-123');
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith('user-123', null);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const storedToken = {
        tokenFamily: 'family-123',
        userId: 'user-123',
      };

      usersService.findOne.mockResolvedValue(mockUser as any);
      refreshTokenService.validateRefreshToken.mockResolvedValue(storedToken as any);
      refreshTokenService.generateJti.mockReturnValue('new-jti-123');
      jwtService.signAsync.mockResolvedValue('new-token');
      refreshTokenService.rotateRefreshToken.mockResolvedValue(undefined);
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.refreshTokens('user-123', 'refresh-token', 'jti-123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(refreshTokenService.rotateRefreshToken).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user not found', async () => {
      usersService.findOne.mockResolvedValue(null);

      await expect(service.refreshTokens('user-123', 'refresh-token', 'jti-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('requestPasswordReset', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should send password reset email', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      usersService.updatePasswordResetToken.mockResolvedValue(undefined);
      emailService.sendPasswordResetEmail.mockResolvedValue(true);

      const result = await service.requestPasswordReset(forgotPasswordDto);

      expect(usersService.updatePasswordResetToken).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
    });

    it('should not throw error when user does not exist (security)', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.requestPasswordReset(forgotPasswordDto);
      expect(result).toHaveProperty('message');
    });

    it('should return same message when user is inactive (security)', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      usersService.findByEmail.mockResolvedValue(inactiveUser as any);

      const result = await service.requestPasswordReset(forgotPasswordDto);

      expect(result).toHaveProperty('message');
      expect(usersService.updatePasswordResetToken).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should clear token when email sending fails', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      usersService.updatePasswordResetToken.mockResolvedValue(undefined);
      emailService.sendPasswordResetEmail.mockRejectedValue(new Error('Email error'));
      usersService.clearPasswordResetToken.mockResolvedValue(undefined);

      await expect(service.requestPasswordReset(forgotPasswordDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(usersService.clearPasswordResetToken).toHaveBeenCalledWith(mockUser.id);
    });

    it('should use default expiry when PASSWORD_RESET_TOKEN_EXPIRY is not configured', async () => {
      configService.get.mockImplementation(
        createConfigMock({
          PASSWORD_RESET_TOKEN_EXPIRY: undefined,
        }),
      );
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      usersService.updatePasswordResetToken.mockResolvedValue(undefined);
      emailService.sendPasswordResetEmail.mockResolvedValue(true);

      await service.requestPasswordReset(forgotPasswordDto);

      expect(usersService.updatePasswordResetToken).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(String),
        expect.any(Date),
      );
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      token: 'reset-token-123',
      newPassword: 'NewPassword123',
    };

    it('should reset password successfully', async () => {
      usersService.findByPasswordResetToken.mockResolvedValue(mockUser as any);
      usersService.resetPassword.mockResolvedValue(undefined);
      emailService.sendPasswordChangedEmail = jest.fn().mockResolvedValue(undefined);

      const result = await service.resetPassword(resetPasswordDto);

      expect(usersService.resetPassword).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
    });

    it('should throw BadRequestException when token is invalid', async () => {
      usersService.findByPasswordResetToken.mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      usersService.findByPasswordResetToken.mockResolvedValue(inactiveUser as any);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(ForbiddenException);
    });

    it('should not fail when email confirmation fails', async () => {
      usersService.findByPasswordResetToken.mockResolvedValue(mockUser as any);
      usersService.resetPassword.mockResolvedValue(undefined);
      emailService.sendPasswordChangedEmail.mockRejectedValue(new Error('Email error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.resetPassword(resetPasswordDto);

      expect(result).toHaveProperty('message');
      expect(usersService.resetPassword).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('validateResetToken', () => {
    it('should return valid when token exists', async () => {
      usersService.findByPasswordResetToken.mockResolvedValue(mockUser as any);

      const result = await service.validateResetToken('valid-token');

      expect(result.valid).toBe(true);
    });

    it('should return invalid when token does not exist', async () => {
      usersService.findByPasswordResetToken.mockResolvedValue(null);

      const result = await service.validateResetToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  describe('getProfile', () => {
    it('should return user profile without sensitive data', async () => {
      usersService.findOne.mockResolvedValue(mockUser as any);

      const result = await service.getProfile('user-123');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result.id).toBe('user-123');
    });
  });

  describe('generateTokens', () => {
    it('should generate tokens with default expiry values', async () => {
      configService.get.mockImplementation(
        createConfigMock({
          JWT_REFRESH_EXPIRES_IN_SECONDS: undefined,
          JWT_SECRET: undefined,
          JWT_EXPIRES_IN: undefined,
          JWT_REFRESH_SECRET: undefined,
          JWT_REFRESH_EXPIRES_IN: undefined,
        }),
      );
      jwtService.signAsync.mockResolvedValue('token');
      refreshTokenService.generateJti.mockReturnValue('jti-123');
      refreshTokenService.generateTokenFamily.mockReturnValue('family-123');
      refreshTokenService.createRefreshToken.mockResolvedValue(undefined);
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.generateTokens('user-123', 'test@example.com', 'member');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.expiresIn).toBe(900);
      expect(result.tokenType).toBe('Bearer');
      expect(refreshTokenService.createRefreshToken).toHaveBeenCalled();
      expect(usersService.updateRefreshToken).toHaveBeenCalled();
    });

    it('should generate tokens with custom expiry values', async () => {
      configService.get.mockImplementation(
        createConfigMock({
          JWT_SECRET: 'custom-secret',
          JWT_EXPIRES_IN: '30m',
          JWT_REFRESH_SECRET: 'custom-refresh-secret',
          JWT_REFRESH_EXPIRES_IN: '14d',
          JWT_REFRESH_EXPIRES_IN_SECONDS: '1209600',
        }),
      );
      jwtService.signAsync.mockResolvedValue('token');
      refreshTokenService.generateJti.mockReturnValue('jti-123');
      refreshTokenService.generateTokenFamily.mockReturnValue('family-123');
      refreshTokenService.createRefreshToken.mockResolvedValue(undefined);
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.generateTokens(
        'user-123',
        'test@example.com',
        'member',
        '127.0.0.1',
        'test-agent',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(refreshTokenService.createRefreshToken).toHaveBeenCalledWith(
        'user-123',
        'token',
        'jti-123',
        'family-123',
        1209600,
        '127.0.0.1',
        'test-agent',
      );
    });
  });

  describe('refreshTokens', () => {
    it('should use default refresh expiry when not configured', async () => {
      configService.get.mockImplementation(
        createConfigMock({
          JWT_REFRESH_EXPIRES_IN_SECONDS: undefined,
        }),
      );

      const storedToken = {
        tokenFamily: 'family-123',
        userId: 'user-123',
      };

      usersService.findOne.mockResolvedValue(mockUser as any);
      refreshTokenService.validateRefreshToken.mockResolvedValue(storedToken as any);
      refreshTokenService.generateJti.mockReturnValue('new-jti-123');
      jwtService.signAsync.mockResolvedValue('new-token');
      refreshTokenService.rotateRefreshToken.mockResolvedValue(undefined);
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.refreshTokens('user-123', 'refresh-token', 'jti-123');

      expect(result).toHaveProperty('accessToken');
      expect(refreshTokenService.rotateRefreshToken).toHaveBeenCalledWith(
        'jti-123',
        'new-token',
        'new-jti-123',
        604800, // default 7 days
        undefined,
        undefined,
      );
    });

    it('should pass ipAddress and userAgent to rotateRefreshToken', async () => {
      const storedToken = {
        tokenFamily: 'family-123',
        userId: 'user-123',
      };

      usersService.findOne.mockResolvedValue(mockUser as any);
      refreshTokenService.validateRefreshToken.mockResolvedValue(storedToken as any);
      refreshTokenService.generateJti.mockReturnValue('new-jti-123');
      jwtService.signAsync.mockResolvedValue('new-token');
      refreshTokenService.rotateRefreshToken.mockResolvedValue(undefined);
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      await service.refreshTokens(
        'user-123',
        'refresh-token',
        'jti-123',
        '192.168.1.1',
        'custom-agent',
      );

      expect(refreshTokenService.rotateRefreshToken).toHaveBeenCalledWith(
        'jti-123',
        'new-token',
        'new-jti-123',
        604800,
        '192.168.1.1',
        'custom-agent',
      );
    });
  });
});
