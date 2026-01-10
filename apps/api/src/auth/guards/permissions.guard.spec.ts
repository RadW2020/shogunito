import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY, Permission } from '../decorators/permissions.decorator';
import { User } from '../../entities/user.entity';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
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

  const mockExecutionContext = (
    user?: User,
    requiredPermissions?: Permission[],
  ): ExecutionContext => {
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
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no permissions are required', () => {
      const context = mockExecutionContext(mockUser);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when permissions array is empty', () => {
      const context = mockExecutionContext(mockUser);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      const context = mockExecutionContext(undefined, [Permission.PROJECT_CREATE]);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.PROJECT_CREATE]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User not authenticated');
    });

    it('should allow access when user has required permissions', () => {
      const directorUser: User = {
        ...mockUser,
        role: 'director' as const,
        hashPassword: jest.fn(),
        validatePassword: jest.fn(),
      } as User;
      const context = mockExecutionContext(directorUser, [Permission.PROJECT_CREATE]);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.PROJECT_CREATE]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required permissions', () => {
      const viewerUser: User = {
        ...mockUser,
        role: 'reviewer',
        hashPassword: jest.fn(),
        validatePassword: jest.fn(),
      } as User;
      const context = mockExecutionContext(viewerUser, [Permission.PROJECT_CREATE]);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.PROJECT_CREATE]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Insufficient permissions');
    });

    it('should allow access when user has multiple required permissions', () => {
      const adminUser: User = {
        ...mockUser,
        role: 'admin' as const,
        hashPassword: jest.fn(),
        validatePassword: jest.fn(),
      } as User;
      const context = mockExecutionContext(adminUser, [
        Permission.PROJECT_CREATE,
        Permission.PROJECT_UPDATE,
      ]);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Permission.PROJECT_CREATE, Permission.PROJECT_UPDATE]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user lacks one of multiple required permissions', () => {
      const producerUser: User = {
        ...mockUser,
        role: 'producer' as const,
        hashPassword: jest.fn(),
        validatePassword: jest.fn(),
      } as User;
      const context = mockExecutionContext(producerUser, [
        Permission.PROJECT_CREATE,
        Permission.USER_DELETE, // Producer doesn't have this
      ]);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Permission.PROJECT_CREATE, Permission.USER_DELETE]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should include required permissions in error message', () => {
      const viewerUser: User = {
        ...mockUser,
        role: 'reviewer',
        hashPassword: jest.fn(),
        validatePassword: jest.fn(),
      } as User;
      const requiredPermissions = [Permission.PROJECT_CREATE, Permission.PROJECT_UPDATE];
      const context = mockExecutionContext(viewerUser, requiredPermissions);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredPermissions);

      try {
        guard.canActivate(context);
      } catch (error: any) {
        expect(error.message).toContain('Insufficient permissions');
        expect(error.message).toContain('Required:');
      }
    });
  });
});
