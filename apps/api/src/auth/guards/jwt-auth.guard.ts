import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { User } from '../../entities/user.entity';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private authEnabled: boolean;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    super();
    // Check if auth is enabled (defaults to true if not specified)
    const authEnabledValue = this.configService.get<string>('AUTH_ENABLED', 'true');
    this.authEnabled = authEnabledValue.toLowerCase() !== 'false';
  }

  canActivate(context: ExecutionContext) {
    // If auth is disabled, allow all requests and inject a mock user
    if (!this.authEnabled) {
      const request = context.switchToHttp().getRequest<Request & { user: User }>();
      // Inject a mock admin user when auth is disabled
      request.user = {
        id: 1, // Mock user ID for development
        email: 'admin@shogunito.com',
        name: 'Development User',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;
      return true;
    }

    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
