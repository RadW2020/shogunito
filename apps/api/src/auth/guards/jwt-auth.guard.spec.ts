import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { User } from '../../entities/user.entity';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let configService: ConfigService;

  const mockExecutionContext = (isPublic = false): ExecutionContext => {
    const request = {
      user: undefined,
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
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('true'),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should inject mock user when auth is disabled', () => {
      jest.spyOn(configService, 'get').mockReturnValue('false');
      const guardWithAuthDisabled = new JwtAuthGuard(reflector, configService);
      const context = mockExecutionContext();
      const request = context.switchToHttp().getRequest();

      const result = guardWithAuthDisabled.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toBeDefined();
      expect(request.user.role).toBe('admin');
      expect(request.user.email).toBe('admin@shogun.com');
    });

    it('should allow access when auth is enabled and route is public', () => {
      jest.spyOn(configService, 'get').mockReturnValue('true');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const guardWithAuthEnabled = new JwtAuthGuard(reflector, configService);
      const context = mockExecutionContext(true);

      const result = guardWithAuthEnabled.canActivate(context);

      expect(result).toBe(true);
    });

    it('should call super.canActivate when auth is enabled and route is not public', () => {
      jest.spyOn(configService, 'get').mockReturnValue('true');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const guardWithAuthEnabled = new JwtAuthGuard(reflector, configService);
      const context = mockExecutionContext(false);
      const superCanActivateSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      const result = guardWithAuthEnabled.canActivate(context);

      expect(superCanActivateSpy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should default to auth enabled when AUTH_ENABLED is not set', () => {
      // Mock get to return undefined, but the guard uses 'true' as default
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'AUTH_ENABLED') {
          return defaultValue || 'true';
        }
        return undefined;
      });
      const guardWithDefault = new JwtAuthGuard(reflector, configService);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const context = mockExecutionContext(false);
      const superCanActivateSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      guardWithDefault.canActivate(context);

      expect(superCanActivateSpy).toHaveBeenCalled();
    });

    it('should handle case-insensitive AUTH_ENABLED value', () => {
      jest.spyOn(configService, 'get').mockReturnValue('FALSE');
      const guardWithAuthDisabled = new JwtAuthGuard(reflector, configService);
      const context = mockExecutionContext();
      const request = context.switchToHttp().getRequest();

      const result = guardWithAuthDisabled.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toBeDefined();
    });
  });
});
