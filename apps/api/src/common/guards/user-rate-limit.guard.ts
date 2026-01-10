import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { User } from '../../entities/user.entity';

/**
 * User-specific Rate Limiting Guard
 *
 * Implements rate limiting per authenticated user in addition to global IP-based limiting.
 *
 * Features:
 * - Per-user rate limits (separate from IP-based throttling)
 * - Configurable limits via decorator
 * - Tracks requests in memory with automatic cleanup
 * - Provides detailed error messages
 *
 * Usage:
 * @UseGuards(UserRateLimitGuard)
 * @UserRateLimit({ limit: 100, ttl: 60000 }) // 100 requests per minute per user
 * @Post('endpoint')
 *
 * Benefits:
 * - Prevents abuse by authenticated users
 * - Separate from IP throttling (users can't bypass by changing IPs)
 * - More granular control than global throttling
 */

export interface UserRateLimitOptions {
  limit: number; // Maximum number of requests
  ttl: number; // Time window in milliseconds
}

const USER_RATE_LIMIT_KEY = 'user_rate_limit';

export const UserRateLimit = (options: UserRateLimitOptions) => {
  return (
    target: unknown,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ): PropertyDescriptor | void => {
    if (descriptor) {
      Reflect.defineMetadata(USER_RATE_LIMIT_KEY, options, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(USER_RATE_LIMIT_KEY, options, target);
    return target;
  };
};

interface RequestRecord {
  count: number;
  resetAt: number;
}

@Injectable()
export class UserRateLimitGuard implements CanActivate {
  private requestsMap = new Map<string, RequestRecord>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private reflector: Reflector) {
    // Cleanup expired records every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.requestsMap.entries()) {
        if (now > record.resetAt) {
          this.requestsMap.delete(key);
        }
      }
    }, 60000);
    // Use unref() to prevent the interval from keeping the process alive
    if (this.cleanupInterval && typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref();
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const classRef = context.getClass();

    // Check for rate limit options on handler or class
    const options =
      this.reflector.get<UserRateLimitOptions>(USER_RATE_LIMIT_KEY, handler) ||
      this.reflector.get<UserRateLimitOptions>(USER_RATE_LIMIT_KEY, classRef);

    if (!options) {
      return true; // No rate limit configured
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: User | { id?: string; sub?: string } }>();
    const user = request.user;

    if (!user || (!('id' in user) && !('sub' in user))) {
      // Not authenticated, let other guards handle it
      return true;
    }

    const userId = (user as User).id || (user as { sub?: string }).sub || undefined;
    if (!userId) {
      return true;
    }
    const endpoint = `${request.method}:${request.route?.path || request.url}`;
    const key = `${userId}:${endpoint}`;

    const now = Date.now();
    let record = this.requestsMap.get(key);

    if (!record || now > record.resetAt) {
      // Create new record
      record = {
        count: 1,
        resetAt: now + options.ttl,
      };
      this.requestsMap.set(key, record);
      return true;
    }

    if (record.count >= options.limit) {
      // Rate limit exceeded
      const resetIn = Math.ceil((record.resetAt - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded for this endpoint. Try again in ${resetIn} seconds.`,
          error: 'Too Many Requests',
          limit: options.limit,
          resetIn,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment count
    record.count++;
    return true;
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
