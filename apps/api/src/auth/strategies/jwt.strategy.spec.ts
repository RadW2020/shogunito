import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: jest.Mocked<UsersService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: 123,
    email: 'test@example.com',
    name: 'Test User',
    role: 'member' as const,
    isActive: true,
  };

  const mockPayload: JwtPayload = {
    sub: '123',
    email: 'test@example.com',
    role: 'member',
    jti: 'jti-123',
    tokenFamily: 'family-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'JWT_SECRET') return 'test-secret';
              return defaultValue;
            }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    usersService = module.get(UsersService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user data when user exists and is active', async () => {
      usersService.findOne.mockResolvedValue(mockUser as any);

      const result = await strategy.validate(mockPayload);

      expect(usersService.findOne).toHaveBeenCalledWith(123);
      expect(result).toEqual({
        id: 123,
        email: 'test@example.com',
        name: 'Test User',
        role: 'member',
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      usersService.findOne.mockResolvedValue(null);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      usersService.findOne.mockResolvedValue(inactiveUser as any);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
