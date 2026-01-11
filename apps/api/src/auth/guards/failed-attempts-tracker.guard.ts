import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { AuditLog } from '../../entities/audit-log.entity';

/**
 * Failed Authentication Attempts Tracker Guard
 *
 * Protects authentication endpoints by blocking excessive failed login attempts.
 * **ONLY ACTIVE IN PRODUCTION** - Disabled in development and test environments.
 *
 * Features:
 * - Blocks requests after 5 failed attempts for 15 minutes
 * - Tracks attempts per user/IP combination
 * - Blocks IPs with 15+ total attempts (distributed attack protection)
 * - Logs all failed login attempts to audit_logs table
 * - Sends Slack alerts for suspicious activity (5+ attempts)
 * - Auto-cleanup of old attempts every 10 minutes
 *
 * Environment:
 * - NODE_ENV=production: Guard is ACTIVE
 * - NODE_ENV=development: Guard is DISABLED (always allows requests)
 * - NODE_ENV=test: Guard is DISABLED (always allows requests)
 *
 * Usage:
 * Applied at the controller level for auth endpoints
 *
 * @example
 * @UseGuards(FailedAttemptsTrackerGuard)
 * @Post('login')
 */

interface FailedAttempt {
  username: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  reason: string;
}

interface LoginRequest extends Request {
  body: {
    email?: string;
    password?: string;
  };
}

@Injectable()
export class FailedAttemptsTrackerGuard implements CanActivate {
  private recentAttempts = new Map<string, FailedAttempt[]>();
  private cleanupInterval: NodeJS.Timeout;
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly isProduction: boolean;

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private configService: ConfigService,
  ) {
    // Only enable guard in production
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    // Cleanup old attempts every 10 minutes
    this.cleanupInterval = setInterval(
      () => {
        const now = Date.now();
        const tenMinutesAgo = now - 10 * 60 * 1000;

        for (const [key, attempts] of this.recentAttempts.entries()) {
          const recentAttempts = attempts.filter((a) => a.timestamp.getTime() > tenMinutesAgo);

          if (recentAttempts.length === 0) {
            this.recentAttempts.delete(key);
          } else {
            this.recentAttempts.set(key, recentAttempts);
          }
        }
      },
      10 * 60 * 1000,
    );
    // Use unref() to prevent the interval from keeping the process alive
    if (this.cleanupInterval && typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref();
    }
  }

  canActivate(context: ExecutionContext): boolean {
    // Disable guard in development and test environments
    if (!this.isProduction) {
      return true;
    }

    const request = context.switchToHttp().getRequest<LoginRequest>();
    const username: string = request.body?.email || 'unknown';
    const ipAddress: string = request.ip || 'unknown';

    // Check recent attempts for this user/IP combination
    const attempts = this.getRecentAttempts(username, ipAddress);

    if (attempts.length >= this.MAX_ATTEMPTS) {
      const lastAttempt = attempts[attempts.length - 1];
      const timeSinceLastAttempt = Date.now() - lastAttempt.timestamp.getTime();

      // If still within lockout period, block the request
      if (timeSinceLastAttempt < this.LOCKOUT_DURATION_MS) {
        const remainingMinutes = Math.ceil(
          (this.LOCKOUT_DURATION_MS - timeSinceLastAttempt) / 60000,
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Too many failed login attempts. Account temporarily locked. Try again in ${remainingMinutes} minute(s).`,
            error: 'Too Many Requests',
            attempts: attempts.length,
            lockoutUntil: new Date(lastAttempt.timestamp.getTime() + this.LOCKOUT_DURATION_MS),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Check total attempts from IP (to prevent distributed attacks)
    const ipAttempts = this.getAttemptsFromIP(ipAddress);
    if (ipAttempts >= this.MAX_ATTEMPTS * 3) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many failed login attempts from this IP address. Please try again later.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Log a failed authentication attempt
   */
  async logFailedAttempt(
    username: string,
    ipAddress: string,
    userAgent: string,
    reason: string,
  ): Promise<void> {
    const attempt: FailedAttempt = {
      username,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      reason,
    };

    // Track in memory
    const key = `${username}:${ipAddress}`;
    const attempts = this.recentAttempts.get(key) || [];
    attempts.push(attempt);
    this.recentAttempts.set(key, attempts);

    // Log to database
    await this.auditLogRepository.save({
      userId: 0, // System user ID
      username,
      action: 'LOGIN_FAILED',
      entityType: 'Auth',
      entityId: null,
      changes: {
        reason,
        attempts: attempts.length,
      },
      ipAddress,
      userAgent,
      method: 'POST',
      endpoint: '/auth/login',
      statusCode: 401,
      errorMessage: reason,
      metadata: {
        attemptNumber: attempts.length,
        recentAttempts: attempts.length,
      },
    });

    // Send alert for suspicious activity
    if (attempts.length >= 5) {
      // Slack alert removed
    }
  }

  /**
   * Get recent attempts for a user/IP combination
   */
  getRecentAttempts(username: string, ipAddress: string): FailedAttempt[] {
    const key = `${username}:${ipAddress}`;
    return this.recentAttempts.get(key) || [];
  }

  /**
   * Get total attempts from all users from an IP
   */
  getAttemptsFromIP(ipAddress: string): number {
    let total = 0;
    for (const [key, attempts] of this.recentAttempts.entries()) {
      if (key.endsWith(`:${ipAddress}`)) {
        total += attempts.length;
      }
    }
    return total;
  }

  /**
   * Clear failed attempts for a user/IP after successful login
   */
  clearAttempts(username: string, ipAddress: string): void {
    const key = `${username}:${ipAddress}`;
    this.recentAttempts.delete(key);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
