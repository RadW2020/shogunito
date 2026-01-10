import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;
  let configService: jest.Mocked<ConfigService>;

  const mockPayload: JwtPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    role: 'member',
    jti: 'jti-123',
    tokenFamily: 'family-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtRefreshStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtRefreshStrategy>(JwtRefreshStrategy);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return payload with refresh token from request', () => {
      const mockRequest = {
        get: jest.fn((header: string) => {
          if (header === 'authorization') return 'Bearer refresh-token-123';
          return undefined;
        }),
      } as unknown as Request;

      const result = strategy.validate(mockRequest, mockPayload);

      expect(result).toEqual({
        ...mockPayload,
        refreshToken: 'refresh-token-123',
      });
    });

    it('should handle missing authorization header', () => {
      const mockRequest = {
        get: jest.fn(() => undefined),
      } as unknown as Request;

      expect(() => strategy.validate(mockRequest, mockPayload)).toThrow('Refresh token not provided');
    });

    it('should extract token correctly from Bearer header', () => {
      const mockRequest = {
        get: jest.fn((header: string) => {
          if (header === 'authorization') return 'Bearer token-with-spaces';
          return undefined;
        }),
      } as unknown as Request;

      const result = strategy.validate(mockRequest, mockPayload);

      expect(result.refreshToken).toBe('token-with-spaces');
    });
  });
});
