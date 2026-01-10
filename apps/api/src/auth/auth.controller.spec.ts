import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ValidateResetTokenDto } from './dto/validate-reset-token.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: 123,
    email: 'test@example.com',
    name: 'Test User',
    role: 'member' as const,
  };

  const mockTokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 900,
    tokenType: 'Bearer',
  };

  const mockRequest = {
    ip: '127.0.0.1',
    headers: {
      'x-forwarded-for': undefined,
      'x-real-ip': undefined,
      'user-agent': 'test-agent',
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            logout: jest.fn(),
            refreshTokens: jest.fn(),
            getProfile: jest.fn(),
            requestPasswordReset: jest.fn(),
            validateResetToken: jest.fn(),
            resetPassword: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'AUTH_ENABLED') {
                return 'true';
              }
              return defaultValue;
            }),
          },
        },
      ],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtRefreshGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'new@example.com',
      name: 'New User',
      password: 'Password123',
    };

    it('should register a new user', async () => {
      authService.register.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const result = await controller.register(registerDto, mockRequest);

      expect(authService.register).toHaveBeenCalledWith(registerDto, '127.0.0.1', 'test-agent');
      expect(result).toEqual({ user: mockUser, tokens: mockTokens });
    });

    it('should extract IP from x-forwarded-for header', async () => {
      const reqWithForwarded = {
        ip: undefined,
        headers: {
          ...mockRequest.headers,
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      } as any;

      authService.register.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      await controller.register(registerDto, reqWithForwarded);

      expect(authService.register).toHaveBeenCalledWith(registerDto, '192.168.1.1', 'test-agent');
    });

    it('should extract IP from x-real-ip header', async () => {
      const reqWithRealIp = {
        ...mockRequest,
        ip: undefined,
        headers: {
          ...mockRequest.headers,
          'x-real-ip': '10.0.0.1',
        },
      };

      authService.register.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      await controller.register(registerDto, reqWithRealIp);

      expect(authService.register).toHaveBeenCalledWith(registerDto, '10.0.0.1', 'test-agent');
    });

    it('should use unknown when IP cannot be determined', async () => {
      const reqWithoutIp = {
        ip: undefined,
        headers: {
          'x-forwarded-for': undefined,
          'x-real-ip': undefined,
          'user-agent': 'test-agent',
        },
      } as any;

      authService.register.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      await controller.register(registerDto, reqWithoutIp);

      expect(authService.register).toHaveBeenCalledWith(registerDto, 'unknown', 'test-agent');
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      authService.login.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const result = await controller.login(loginDto, mockRequest);

      expect(authService.login).toHaveBeenCalledWith(loginDto, '127.0.0.1', 'test-agent');
      expect(result).toEqual({ user: mockUser, tokens: mockTokens });
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const user = { id: 123, tokenFamily: 'family-123' };
      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(user as any);

      expect(authService.logout).toHaveBeenCalledWith(123, 'family-123');
      expect(result).toEqual({ message: 'Logout exitoso' });
    });

    it('should logout without tokenFamily', async () => {
      const user = { id: 123 };
      authService.logout.mockResolvedValue(undefined);

      await controller.logout(user as any);

      expect(authService.logout).toHaveBeenCalledWith(123, undefined);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const req = {
        ...mockRequest,
        user: {
          sub: '123',
          refreshToken: 'refresh-token',
          jti: 'jti-123',
        },
      };

      authService.refreshTokens.mockResolvedValue(mockTokens);

      const result = await controller.refreshTokens(req);

      expect(authService.refreshTokens).toHaveBeenCalledWith(
        123,
        'refresh-token',
        'jti-123',
        '127.0.0.1',
        'test-agent',
      );
      expect(result).toEqual(mockTokens);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const user = { id: 123 };
      authService.getProfile.mockResolvedValue(mockUser as any);

      const result = await controller.getProfile(user as any);

      expect(authService.getProfile).toHaveBeenCalledWith(123);
      expect(result).toEqual(mockUser);
    });
  });

  describe('health', () => {
    it('should return health status', () => {
      const result = controller.health();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('service', 'auth');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('authStatus', () => {
    it('should return auth enabled status', () => {
      configService.get.mockReturnValue('true');

      const result = controller.authStatus();

      expect(result).toHaveProperty('authEnabled', true);
      expect(result).toHaveProperty('mockUser', null);
    });

    it('should return mock user when auth is disabled', () => {
      configService.get.mockReturnValue('false');

      const result = controller.authStatus();

      expect(result).toHaveProperty('authEnabled', false);
      expect(result).toHaveProperty('mockUser');
      expect(result.mockUser).toHaveProperty('id', 'mock-user-id');
      expect(result.mockUser).toHaveProperty('email', 'admin@shogun.com');
      expect(result.mockUser).toHaveProperty('role', 'admin');
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should request password reset', async () => {
      authService.requestPasswordReset.mockResolvedValue({
        message: 'Email sent',
      });

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(authService.requestPasswordReset).toHaveBeenCalledWith(forgotPasswordDto);
      expect(result).toEqual({ message: 'Email sent' });
    });
  });

  describe('validateResetToken', () => {
    const validateResetTokenDto: ValidateResetTokenDto = {
      token: 'reset-token-123',
    };

    it('should validate reset token', async () => {
      authService.validateResetToken.mockResolvedValue({
        valid: true,
      });

      const result = await controller.validateResetToken(validateResetTokenDto);

      expect(authService.validateResetToken).toHaveBeenCalledWith('reset-token-123');
      expect(result).toEqual({ valid: true });
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      token: 'reset-token-123',
      newPassword: 'NewPassword123',
    };

    it('should reset password', async () => {
      authService.resetPassword.mockResolvedValue({
        message: 'Password reset successfully',
      });

      const result = await controller.resetPassword(resetPasswordDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
      expect(result).toEqual({ message: 'Password reset successfully' });
    });
  });
});
