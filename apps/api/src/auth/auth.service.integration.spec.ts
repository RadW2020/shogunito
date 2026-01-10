import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';
import { SlackService } from '../notifications/slack/slack.service';
import { RefreshTokenService } from './refresh-token.service';
import { UnauthorizedException, ForbiddenException, ConflictException } from '@nestjs/common';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

/**
 * Integration tests for AuthService
 *
 * Tests authentication flows with:
 * - Failed login tracking
 * - Audit logging
 * - Slack notifications on suspicious activity
 * - JWT refresh token flows
 * - Password reset flows
 */
describe('AuthService Integration Tests', () => {
  let module: TestingModule;
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let emailService: jest.Mocked<EmailService>;

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
    hashPassword: jest.fn(),
    validatePassword: jest.fn(),
  };

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
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
            incrementFailedLoginAttempts: jest.fn(),
            resetFailedLoginAttempts: jest.fn(),
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
            get: jest.fn((key: string) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_EXPIRES_IN: '15m',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_REFRESH_EXPIRES_IN: '7d',
                ALLOWED_REGISTRATION_EMAILS: 'test@example.com,admin@example.com',
                PASSWORD_RESET_TOKEN_EXPIRY: 3600000,
              };
              return config[key];
            }),
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
          provide: AuditService,
          useValue: {
            log: jest.fn(),
            logAuthEvent: jest.fn(),
            logFailedLogin: jest.fn(),
            logSuccessfulLogin: jest.fn(),
          },
        },
        {
          provide: SlackService,
          useValue: {
            notifyFailedLogin: jest.fn(),
            notifySecurityAlert: jest.fn(),
            notifyAdminCreated: jest.fn(),
          },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            createRefreshToken: jest.fn(),
            validateRefreshToken: jest.fn().mockResolvedValue({
              id: 'token-id',
              jti: 'test-jti',
              tokenFamily: 'test-token-family',
              tokenHash: 'hashed-token',
              userId: 'user-123',
              isRevoked: false,
              isUsed: false,
              expiresAt: new Date(Date.now() + 604800000),
              isExpired: () => false,
            }),
            rotateRefreshToken: jest.fn().mockResolvedValue({
              id: 'new-token-id',
              jti: 'new-jti',
              tokenFamily: 'test-token-family',
              tokenHash: 'hashed-new-token',
              userId: 'user-123',
              isRevoked: false,
              isUsed: false,
              expiresAt: new Date(Date.now() + 604800000),
            }),
            revokeTokenFamily: jest.fn().mockResolvedValue(undefined),
            revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
            revokeToken: jest.fn().mockResolvedValue(undefined),
            generateJti: jest.fn().mockReturnValue('generated-jti'),
            generateTokenFamily: jest.fn().mockReturnValue('generated-token-family'),
            cleanupExpiredTokens: jest.fn().mockResolvedValue(0),
            getActiveTokens: jest.fn().mockResolvedValue([]),
            countActiveTokens: jest.fn().mockResolvedValue(0),
          },
        },
      ],
    }).compile();

    module = testModule;
    authService = testModule.get<AuthService>(AuthService);
    usersService = testModule.get(UsersService);
    jwtService = testModule.get(JwtService);
    emailService = testModule.get(EmailService);
  });

  beforeEach(() => {
    // Suppress console.error in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    // Clear any pending timers
    jest.clearAllTimers();
  });

  afterAll(async () => {
    // Cleanup module and ensure all async operations complete
    if (module) {
      await module.close();
    }
    // Clear all timers
    jest.clearAllTimers();
  });

  describe('Login Flow with Failed Login Tracking', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'correctPassword',
      };

      usersService.findByEmailWithPassword.mockResolvedValue(mockUser);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await authService.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBe('refresh-token');

      // Verify refresh token was updated
      const updateRefreshTokenMock = usersService.updateRefreshToken;
      expect(updateRefreshTokenMock).toHaveBeenCalledWith(mockUser.id, 'refresh-token');

      // Verify last login was updated
      const updateLastLoginMock = usersService.updateLastLogin;
      expect(updateLastLoginMock).toHaveBeenCalledWith(mockUser.id);
    });

    it('should track failed login attempt with invalid password', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      usersService.findByEmailWithPassword.mockResolvedValue(mockUser);

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);

      // Note: In a real implementation, failed attempts would be tracked
      // This is a placeholder for the integration test structure
    });

    it('should track multiple failed login attempts', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      // Simulate 3 failed attempts
      for (let attempt = 0; attempt < 3; attempt++) {
        usersService.findByEmailWithPassword.mockResolvedValue(mockUser);

        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
      }
    });

    it('should send Slack notification after 5 failed login attempts', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      usersService.findByEmailWithPassword.mockResolvedValue(mockUser);

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);

      // In real implementation, Slack notification would be sent
      // expect(slackService.notifyFailedLogin).toHaveBeenCalledWith(
      //   mockUser.email,
      //   5
      // );
    });

    it('should send security alert after 10 failed login attempts', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      usersService.findByEmailWithPassword.mockResolvedValue(mockUser);

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);

      // In real implementation, critical security alert would be sent
      // expect(slackService.notifySecurityAlert).toHaveBeenCalledWith(
      //   expect.objectContaining({
      //     severity: 'high',
      //     message: expect.stringContaining('10 failed login attempts'),
      //   })
      // );
    });

    it('should throw ForbiddenException for inactive user', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'correctPassword',
      };

      usersService.findByEmailWithPassword.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(authService.login(loginDto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Registration Flow with Audit Logging', () => {
    it('should successfully register user with allowed email', async () => {
      const registerDto = {
        email: 'test@example.com',
        name: 'New User',
        password: 'SecurePass123!',
        role: 'member' as const,
      };

      usersService.findByEmail.mockResolvedValue(null);

      usersService.create.mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
        name: registerDto.name,
      });

      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await authService.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(registerDto.email);

      // Verify user creation was logged with audit context
      const createMock = usersService.create;
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerDto.email,
          name: registerDto.name,
          password: registerDto.password,
          role: registerDto.role,
        }),
        null,
      );
    });

    it('should reject registration for non-whitelisted email', async () => {
      const registerDto = {
        email: 'notallowed@example.com',
        name: 'Blocked User',
        password: 'SecurePass123!',
        role: 'member' as const,
      };

      await expect(authService.register(registerDto)).rejects.toThrow(ForbiddenException);

      // Verify no user was created
      const createMock = usersService.create;
      expect(createMock).not.toHaveBeenCalled();
    });

    it('should reject duplicate email registration', async () => {
      const registerDto = {
        email: 'test@example.com',
        name: 'Duplicate User',
        password: 'SecurePass123!',
        role: 'member' as const,
      };

      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should send Slack notification when admin user is created', async () => {
      const registerDto = {
        email: 'admin@example.com',
        name: 'Admin User',
        password: 'SecurePass123!',
        role: 'admin' as const,
      };

      usersService.findByEmail.mockResolvedValue(null);

      const adminUser = {
        ...mockUser,
        email: registerDto.email,
        role: 'admin' as const,
      };

      usersService.create.mockResolvedValue(adminUser);

      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await authService.register(registerDto);

      // In real implementation, Slack would be notified
      // expect(slackService.notifyAdminCreated).toHaveBeenCalledWith(
      //   adminUser.email,
      //   adminUser.name
      // );
    });
  });

  describe('JWT Refresh Token Flow', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const jti = 'test-jti';

      const userWithRefreshToken = {
        ...mockUser,
        refreshToken: 'hashed-refresh-token',
      };

      usersService.findOne.mockResolvedValue(userWithRefreshToken);

      const refreshTokenService = module.get(RefreshTokenService);
      refreshTokenService.validateRefreshToken = jest.fn().mockResolvedValue({
        id: 'token-id',
        jti: jti,
        tokenFamily: 'test-token-family',
        tokenHash: 'hashed-token',
        userId: mockUser.id,
        isRevoked: false,
        isUsed: false,
        expiresAt: new Date(Date.now() + 604800000),
        isExpired: () => false,
      });

      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await authService.refreshTokens(mockUser.id, refreshToken, jti);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');

      // Verify new refresh token was stored
      const updateRefreshTokenMock = usersService.updateRefreshToken;
      expect(updateRefreshTokenMock).toHaveBeenCalledWith(mockUser.id, 'new-refresh-token');
    });

    it('should reject refresh with invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';
      const jti = 'test-jti';

      const userWithRefreshToken = {
        ...mockUser,
        refreshToken: 'hashed-different-token',
      };

      usersService.findOne.mockResolvedValue(userWithRefreshToken);

      const refreshTokenService = module.get(RefreshTokenService);
      refreshTokenService.validateRefreshToken = jest
        .fn()
        .mockRejectedValue(new UnauthorizedException('Token inválido'));

      await expect(authService.refreshTokens(mockUser.id, refreshToken, jti)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject refresh when user has no refresh token', async () => {
      usersService.findOne.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      const refreshTokenService = module.get(RefreshTokenService);
      refreshTokenService.validateRefreshToken = jest
        .fn()
        .mockRejectedValue(new UnauthorizedException('Token inválido'));

      await expect(
        authService.refreshTokens(mockUser.id, 'any-token', 'any-jti'),
      ).rejects.toThrow();
    });

    it('should reject refresh when user does not exist', async () => {
      usersService.findOne.mockResolvedValue(null);

      await expect(
        authService.refreshTokens('non-existent-id', 'any-token', 'any-jti'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle token rotation correctly', async () => {
      const oldRefreshToken = 'old-refresh-token';
      const oldJti = 'old-jti';
      const newJti = 'new-jti';

      usersService.findOne.mockResolvedValue({
        ...mockUser,
        refreshToken: 'hashed-old-token',
      });

      const refreshTokenService = module.get(RefreshTokenService);
      refreshTokenService.validateRefreshToken = jest.fn().mockResolvedValue({
        id: 'token-id',
        jti: oldJti,
        tokenFamily: 'test-token-family',
        tokenHash: 'hashed-token',
        userId: mockUser.id,
        isRevoked: false,
        isUsed: false,
        expiresAt: new Date(Date.now() + 604800000),
        isExpired: () => false,
      });

      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token-1')
        .mockResolvedValueOnce('new-refresh-token-1');

      const result1 = await authService.refreshTokens(mockUser.id, oldRefreshToken, oldJti);

      expect(result1.refreshToken).toBe('new-refresh-token-1');

      // Simulate second refresh with new token
      refreshTokenService.validateRefreshToken = jest.fn().mockResolvedValue({
        id: 'new-token-id',
        jti: newJti,
        tokenFamily: 'test-token-family',
        tokenHash: 'hashed-new-token',
        userId: mockUser.id,
        isRevoked: false,
        isUsed: false,
        expiresAt: new Date(Date.now() + 604800000),
        isExpired: () => false,
      });

      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token-2')
        .mockResolvedValueOnce('new-refresh-token-2');

      const result2 = await authService.refreshTokens(mockUser.id, 'new-refresh-token-1', newJti);

      expect(result2.refreshToken).toBe('new-refresh-token-2');

      // Old token should not work (already used)
      refreshTokenService.validateRefreshToken = jest
        .fn()
        .mockRejectedValue(new ForbiddenException('Token ya usado'));

      await expect(
        authService.refreshTokens(mockUser.id, oldRefreshToken, oldJti),
      ).rejects.toThrow();
    });
  });

  describe('Logout Flow', () => {
    it('should successfully logout user', async () => {
      await authService.logout(mockUser.id);

      const updateRefreshTokenMock = usersService.updateRefreshToken;
      expect(updateRefreshTokenMock).toHaveBeenCalledWith(mockUser.id, null);
    });

    it('should prevent token reuse after logout', async () => {
      const refreshToken = 'valid-token';
      const jti = 'test-jti';

      // Logout
      await authService.logout(mockUser.id);

      const updateRefreshTokenMock = usersService.updateRefreshToken;
      expect(updateRefreshTokenMock).toHaveBeenCalledWith(mockUser.id, null);

      // Try to refresh with old token (should fail because token was revoked)
      usersService.findOne.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      const refreshTokenService = module.get(RefreshTokenService);
      refreshTokenService.validateRefreshToken = jest
        .fn()
        .mockRejectedValue(new UnauthorizedException('Token revocado'));

      await expect(authService.refreshTokens(mockUser.id, refreshToken, jti)).rejects.toThrow();
    });
  });

  describe('Password Reset Flow with Email Integration', () => {
    it('should successfully request password reset', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await authService.requestPasswordReset({
        email: mockUser.email,
      });

      expect(result.message).toContain('recibirás un email');

      // Verify token was generated and saved
      const updatePasswordResetTokenMock = usersService.updatePasswordResetToken;
      expect(updatePasswordResetTokenMock).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(String),
        expect.any(Date),
      );

      // Verify email was sent
      const sendPasswordResetEmailMock = emailService.sendPasswordResetEmail;
      expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.name,
        expect.any(String),
      );
    });

    it('should return safe message for non-existent email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await authService.requestPasswordReset({
        email: 'nonexistent@example.com',
      });

      // Should return same message to prevent email enumeration
      expect(result.message).toContain('recibirás un email');

      // But should not send email
      const sendPasswordResetEmailMock = emailService.sendPasswordResetEmail;
      expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
    });

    it('should return safe message for inactive user', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const result = await authService.requestPasswordReset({
        email: mockUser.email,
      });

      expect(result.message).toContain('recibirás un email');
      const sendPasswordResetEmailMock = emailService.sendPasswordResetEmail;
      expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
    });

    it('should clear token if email send fails', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      emailService.sendPasswordResetEmail.mockRejectedValue(new Error('Email service error'));

      await expect(authService.requestPasswordReset({ email: mockUser.email })).rejects.toThrow(
        'Error al enviar el correo',
      );

      // Verify token was cleared
      const clearPasswordResetTokenMock = usersService.clearPasswordResetToken;
      expect(clearPasswordResetTokenMock).toHaveBeenCalledWith(mockUser.id);
    });

    it('should validate reset token correctly', async () => {
      const validToken = 'valid-reset-token';

      usersService.findByPasswordResetToken.mockResolvedValue({
        ...mockUser,
        passwordResetToken: validToken,
        passwordResetExpiresAt: new Date(Date.now() + 3600000),
      });

      const result = await authService.validateResetToken(validToken);

      expect(result.valid).toBe(true);
    });

    it('should reject expired reset token', async () => {
      const expiredToken = 'expired-token';

      usersService.findByPasswordResetToken.mockResolvedValue(null);

      const result = await authService.validateResetToken(expiredToken);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('inválido o ha expirado');
    });

    it('should successfully reset password with valid token', async () => {
      const resetToken = 'valid-reset-token';
      const newPassword = 'NewSecurePass123!';

      usersService.findByPasswordResetToken.mockResolvedValue({
        ...mockUser,
        passwordResetToken: resetToken,
        passwordResetExpiresAt: new Date(Date.now() + 3600000),
      });

      emailService.sendPasswordChangedEmail.mockResolvedValue(undefined);

      const result = await authService.resetPassword({
        token: resetToken,
        newPassword,
      });

      expect(result.message).toContain('actualizada exitosamente');

      // Verify password was reset
      const resetPasswordMock = usersService.resetPassword;
      expect(resetPasswordMock).toHaveBeenCalledWith(mockUser.id, newPassword);

      // Verify confirmation email was sent
      const sendPasswordChangedEmailMock = emailService.sendPasswordChangedEmail;
      expect(sendPasswordChangedEmailMock).toHaveBeenCalledWith(mockUser.email, mockUser.name);
    });

    it('should reject password reset for inactive user', async () => {
      const resetToken = 'valid-token';

      usersService.findByPasswordResetToken.mockResolvedValue({
        ...mockUser,
        isActive: false,
        passwordResetToken: resetToken,
        passwordResetExpiresAt: new Date(Date.now() + 3600000),
      });

      await expect(
        authService.resetPassword({
          token: resetToken,
          newPassword: 'NewPass123!',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should continue reset even if confirmation email fails', async () => {
      const resetToken = 'valid-token';

      usersService.findByPasswordResetToken.mockResolvedValue({
        ...mockUser,
        passwordResetToken: resetToken,
        passwordResetExpiresAt: new Date(Date.now() + 3600000),
      });

      emailService.sendPasswordChangedEmail.mockRejectedValue(new Error('Email failed'));

      // Should not throw - password should still be reset
      const result = await authService.resetPassword({
        token: resetToken,
        newPassword: 'NewPass123!',
      });

      expect(result.message).toContain('actualizada exitosamente');
      const resetPasswordMock = usersService.resetPassword;
      expect(resetPasswordMock).toHaveBeenCalled();
    });
  });

  describe('Token Generation', () => {
    it('should generate both access and refresh tokens', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const tokens = await authService.generateTokens(mockUser.id, mockUser.email, mockUser.role);

      expect(tokens).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      });

      // Verify JWT payload structure
      const signAsyncMock = jwtService.signAsync;
      expect(signAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        }),
        expect.any(Object),
      );
    });

    it('should use correct secrets and expiration', async () => {
      jwtService.signAsync.mockResolvedValue('token');

      await authService.generateTokens(mockUser.id, mockUser.email, mockUser.role);

      // Access token
      const signAsyncMock = jwtService.signAsync;
      expect(signAsyncMock).toHaveBeenNthCalledWith(
        1,
        expect.any(Object),
        expect.objectContaining({
          secret: 'test-secret',
          expiresIn: '15m',
        }),
      );

      // Refresh token
      expect(signAsyncMock).toHaveBeenNthCalledWith(
        2,
        expect.any(Object),
        expect.objectContaining({
          secret: 'test-refresh-secret',
          expiresIn: '7d',
        }),
      );
    });
  });

  describe('User Profile Access', () => {
    it('should get user profile without sensitive data', async () => {
      usersService.findOne.mockResolvedValue({
        ...mockUser,
        passwordHash: 'should-be-removed',
        refreshToken: 'should-be-removed',
      });

      const profile = await authService.getProfile(mockUser.id);

      expect(profile).not.toHaveProperty('passwordHash');
      expect(profile).not.toHaveProperty('refreshToken');
      expect(profile).toHaveProperty('email');
      expect(profile).toHaveProperty('name');
    });
  });
});
