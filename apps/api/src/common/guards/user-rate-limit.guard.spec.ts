import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { UserRateLimitGuard, UserRateLimit } from './user-rate-limit.guard';
import { User } from '../../entities/user.entity';

describe('UserRateLimitGuard', () => {
  let guard: UserRateLimitGuard;
  let reflector: Reflector;

  const mockExecutionContext = (user?: User | { id?: string; sub?: string }) => {
    const request = {
      method: 'POST',
      route: { path: '/test' },
      url: '/test',
      user,
    };

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRateLimitGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<UserRateLimitGuard>(UserRateLimitGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up the requests map
    (guard as any).requestsMap.clear();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow request when no rate limit is configured', () => {
      const context = mockExecutionContext();
      jest.spyOn(reflector, 'get').mockReturnValue(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow request when user is not authenticated', () => {
      const context = mockExecutionContext();
      const options = { limit: 10, ttl: 60000 };
      jest.spyOn(reflector, 'get').mockReturnValue(options);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow request when user has no id or sub', () => {
      const context = mockExecutionContext({});
      const options = { limit: 10, ttl: 60000 };
      jest.spyOn(reflector, 'get').mockReturnValue(options);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow first request within limit', () => {
      const user: User = { id: 'user-123' } as User;
      const context = mockExecutionContext(user);
      const options = { limit: 10, ttl: 60000 };
      jest.spyOn(reflector, 'get').mockReturnValue(options);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow requests up to the limit', () => {
      const user: User = { id: 'user-123' } as User;
      const context = mockExecutionContext(user);
      const options = { limit: 3, ttl: 60000 };
      jest.spyOn(reflector, 'get').mockReturnValue(options);

      // Make 3 requests
      expect(guard.canActivate(context)).toBe(true);
      expect(guard.canActivate(context)).toBe(true);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw HttpException when rate limit is exceeded', () => {
      const user: User = { id: 'user-123' } as User;
      const context = mockExecutionContext(user);
      const options = { limit: 2, ttl: 60000 };
      jest.spyOn(reflector, 'get').mockReturnValue(options);

      // Make 2 requests (within limit)
      guard.canActivate(context);
      guard.canActivate(context);

      // Third request should exceed limit
      expect(() => guard.canActivate(context)).toThrow(HttpException);
      expect(() => guard.canActivate(context)).toThrow(
        expect.objectContaining({
          status: HttpStatus.TOO_MANY_REQUESTS,
        }),
      );
    });

    it('should reset count after TTL expires', async () => {
      const user: User = { id: 'user-123' } as User;
      const context = mockExecutionContext(user);
      const options = { limit: 2, ttl: 100 }; // 100ms TTL
      jest.spyOn(reflector, 'get').mockReturnValue(options);

      // Make 2 requests (within limit)
      guard.canActivate(context);
      guard.canActivate(context);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should allow request again after TTL expires
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should track requests per user and endpoint separately', () => {
      const user1: User = { id: 'user-123' } as User;
      const user2: User = { id: 'user-456' } as User;
      const context1 = mockExecutionContext(user1);
      const context2 = mockExecutionContext(user2);
      const options = { limit: 2, ttl: 60000 };
      jest.spyOn(reflector, 'get').mockReturnValue(options);

      // User 1 makes 2 requests
      guard.canActivate(context1);
      guard.canActivate(context1);

      // User 2 should still be able to make requests
      expect(guard.canActivate(context2)).toBe(true);
      expect(guard.canActivate(context2)).toBe(true);

      // User 1 should be rate limited
      expect(() => guard.canActivate(context1)).toThrow(HttpException);
    });

    it('should use sub when id is not available', () => {
      const user = { sub: 'user-sub-123' };
      const context = mockExecutionContext(user);
      const options = { limit: 2, ttl: 60000 };
      jest.spyOn(reflector, 'get').mockReturnValue(options);

      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should include reset time in error message', () => {
      const user: User = { id: 'user-123' } as User;
      const context = mockExecutionContext(user);
      const options = { limit: 1, ttl: 60000 };
      jest.spyOn(reflector, 'get').mockReturnValue(options);

      guard.canActivate(context);

      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const exception = error as HttpException;
        const response = exception.getResponse() as any;
        expect(response.resetIn).toBeDefined();
        expect(response.limit).toBe(1);
      }
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear cleanup interval', () => {
      const cleanupInterval = (guard as any).cleanupInterval;
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      guard.onModuleDestroy();

      expect(clearIntervalSpy).toHaveBeenCalledWith(cleanupInterval);
    });
  });
});

describe('UserRateLimit decorator', () => {
  it('should set metadata on method descriptor', () => {
    const options = { limit: 100, ttl: 60000 };
    const target = {};
    const propertyKey = 'testMethod';
    const descriptor: PropertyDescriptor = {
      value: jest.fn(),
      writable: true,
      enumerable: true,
      configurable: true,
    };

    const result = UserRateLimit(options)(target, propertyKey, descriptor);

    expect(result).toBe(descriptor);
    const metadata = Reflect.getMetadata('user_rate_limit', descriptor.value);
    expect(metadata).toEqual(options);
  });

  it('should set metadata on class when no descriptor', () => {
    const options = { limit: 100, ttl: 60000 };
    const target = {};

    const result = UserRateLimit(options)(target);

    expect(result).toBe(target);
    const metadata = Reflect.getMetadata('user_rate_limit', target);
    expect(metadata).toEqual(options);
  });
});
