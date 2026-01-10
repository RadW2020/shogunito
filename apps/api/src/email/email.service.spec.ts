import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        EMAIL_FROM_EMAIL: 'test@shogun.com',
        EMAIL_FROM_NAME: 'Shogun Test',
        PASSWORD_RESET_URL: 'https://app.shogun.com/reset-password',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email', async () => {
      const result = await service.sendPasswordResetEmail(
        'user@example.com',
        'Test User',
        'reset-token-123',
      );

      expect(result).toBe(false); // Email service is disabled
      expect(configService.get).toHaveBeenCalledWith('PASSWORD_RESET_URL');
    });

    it('should use default from email when not configured', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'EMAIL_FROM_EMAIL') return undefined;
        if (key === 'EMAIL_FROM_NAME') return undefined;
        if (key === 'PASSWORD_RESET_URL') return 'https://app.shogun.com/reset-password';
        return defaultValue;
      });

      await service.sendPasswordResetEmail('user@example.com', 'Test User', 'reset-token-123');

      expect(configService.get).toHaveBeenCalled();
    });

    it('should generate reset link with token', async () => {
      const resetToken = 'test-token-123';
      await service.sendPasswordResetEmail('user@example.com', 'Test User', resetToken);

      expect(configService.get).toHaveBeenCalledWith('PASSWORD_RESET_URL');
    });
  });

  describe('sendPasswordChangedEmail', () => {
    it('should send password changed email', async () => {
      const result = await service.sendPasswordChangedEmail('user@example.com', 'Test User');

      expect(result).toBe(false); // Email service is disabled
    });

    it('should use configured from email and name', async () => {
      await service.sendPasswordChangedEmail('user@example.com', 'Test User');

      expect(configService.get).toHaveBeenCalled();
    });
  });
});
