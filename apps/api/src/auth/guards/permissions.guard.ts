import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  PERMISSIONS_KEY,
  Permission,
  hasAllPermissions,
} from '../decorators/permissions.decorator';
import { User } from '../../entities/user.entity';

/**
 * Guard to check if user has required permissions
 *
 * This guard works in conjunction with the @RequirePermissions decorator
 * and JWT authentication to enforce granular access control.
 *
 * @example
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @RequirePermissions(Permission.PROJECT_CREATE)
 * createProject() { ... }
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user: User }>();
    const user: User = request.user;

    // If no user (should be caught by JwtAuthGuard first)
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has all required permissions
    const hasPermission = hasAllPermissions(user.role, requiredPermissions);

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
