import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FailedAttemptsTrackerGuard } from './failed-attempts-tracker.guard';
import { AuditLog } from '../../entities/audit-log.entity';
import { SlackService } from '../../notifications/slack/slack.service';
import { Request } from 'express';

describe('FailedAttemptsTrackerGuard', () => {
  let guard: FailedAttemptsTrackerGuard;
  let auditLogRepository: any;
  let slackService: any;
  let configService: jest.Mocked<ConfigService>;

  const mockRequest = {
    body: {
      email: 'test@example.com',
      password: 'password123',
    },
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'test-agent',
    },
  } as unknown as Request;

  const mockExecutionContext = (request: Request = mockRequest): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FailedAttemptsTrackerGuard,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            save: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: SlackService,
          useValue: {
            sendAlert: jest.fn().mockResolvedValue(undefined),
            notifyFailedLogin: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'NODE_ENV') return 'production';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    guard = module.get<FailedAttemptsTrackerGuard>(FailedAttemptsTrackerGuard);
    auditLogRepository = module.get(getRepositoryToken(AuditLog));
    slackService = module.get(SlackService);
    configService = module.get(ConfigService);

    // Clear attempts map before each test
    (guard as any).recentAttempts.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear attempts map after each test
    (guard as any).recentAttempts.clear();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow requests in development environment', () => {
      configService.get.mockReturnValue('development');
      const guardDev = new FailedAttemptsTrackerGuard(
        auditLogRepository,
        slackService,
        configService,
      );

      const context = mockExecutionContext();
      const result = guardDev.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow requests in test environment', () => {
      configService.get.mockReturnValue('test');
      const guardTest = new FailedAttemptsTrackerGuard(
        auditLogRepository,
        slackService,
        configService,
      );

      const context = mockExecutionContext();
      const result = guardTest.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow requests when no previous attempts', () => {
      const context = mockExecutionContext();
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow requests when attempts are below threshold', () => {
      const context = mockExecutionContext();

      // Make 4 attempts (below threshold of 5)
      for (let i = 0; i < 4; i++) {
        guard.canActivate(context);
      }

      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should block requests after max attempts within lockout period', async () => {
      const context = mockExecutionContext();

      // Log 5 failed attempts to trigger lockout
      for (let i = 0; i < 5; i++) {
        await guard.logFailedAttempt(
          'test@example.com',
          '127.0.0.1',
          'test-agent',
          'Invalid credentials',
        );
      }

      // 6th attempt should be blocked
      expect(() => guard.canActivate(context)).toThrow(HttpException);
      expect(() => guard.canActivate(context)).toThrow('Too many failed login attempts');
    });

    it('should allow requests after lockout period expires', async () => {
      const context = mockExecutionContext();

      // Log 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await guard.logFailedAttempt(
          'test@example.com',
          '127.0.0.1',
          'test-agent',
          'Invalid credentials',
        );
      }

      // Mock time to be after lockout period (15 minutes)
      const attempts = (guard as any).recentAttempts;
      const key = 'test@example.com:127.0.0.1';
      if (attempts.has(key)) {
        const oldAttempts = attempts.get(key);
        const newAttempts = oldAttempts.map((attempt: any) => ({
          ...attempt,
          timestamp: new Date(Date.now() - 16 * 60 * 1000), // 16 minutes ago
        }));
        attempts.set(key, newAttempts);
      }

      // Should allow after lockout expires
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should block IPs with too many distributed attempts', async () => {
      const context = mockExecutionContext();

      // Log many failed attempts from same IP with different usernames
      for (let i = 0; i < 16; i++) {
        await guard.logFailedAttempt(
          `user${i}@example.com`,
          '127.0.0.1',
          'test-agent',
          'Invalid credentials',
        );
      }

      // Next attempt from same IP should be blocked
      expect(() => guard.canActivate(context)).toThrow(HttpException);
      expect(() => guard.canActivate(context)).toThrow(
        'Too many failed login attempts from this IP',
      );
    });

    it('should handle requests without email in body', () => {
      const requestWithoutEmail = {
        ...mockRequest,
        body: {},
      } as unknown as Request;

      const context = mockExecutionContext(requestWithoutEmail);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle requests without IP address', () => {
      const requestWithoutIP = {
        ...mockRequest,
        ip: undefined,
      } as unknown as Request;

      const context = mockExecutionContext(requestWithoutIP);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
