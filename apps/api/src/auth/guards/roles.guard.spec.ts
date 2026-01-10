import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User } from '../../entities/user.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'producer',
    passwordHash: 'hashed',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    hashPassword: jest.fn(),
    validatePassword: jest.fn(),
  } as User;

  const mockExecutionContext = (user?: User, requiredRoles?: string[]): ExecutionContext => {
    const request = {
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
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      const context = mockExecutionContext(mockUser);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has one of the required roles', () => {
      const context = mockExecutionContext(mockUser, ['producer', 'director']);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['producer', 'director']);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user does not have any of the required roles', () => {
      const context = mockExecutionContext(mockUser, ['admin', 'director']);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'director']);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should allow access when user role matches exactly', () => {
      const context = mockExecutionContext(mockUser, ['producer']);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['producer']);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user is undefined', () => {
      const context = mockExecutionContext(undefined, ['producer']);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['producer']);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should allow access when user role is in multiple required roles', () => {
      const adminUser: User = {
        ...mockUser,
        role: 'admin' as const,
        hashPassword: jest.fn(),
        validatePassword: jest.fn(),
      } as User;
      const context = mockExecutionContext(adminUser, ['admin', 'director', 'producer']);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'director', 'producer']);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle case sensitivity correctly', () => {
      const context = mockExecutionContext(mockUser, ['Producer']);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Producer']);

      const result = guard.canActivate(context);

      // Should be false because 'producer' !== 'Producer'
      expect(result).toBe(false);
    });

    it('should work with empty roles array', () => {
      const context = mockExecutionContext(mockUser, []);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const result = guard.canActivate(context);

      // When empty array, some() returns false, but guard checks !requiredRoles first
      // Since [] is truthy, it will call some() which returns false
      expect(result).toBe(false);
    });
  });
});
