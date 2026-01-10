import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
  OnModuleDestroy,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, finalize } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request, Response } from 'express';
import { AuditLog } from '../../entities/audit-log.entity';
import { SlackService } from '../../notifications/slack/slack.service';

/**
 * Authentication Logging Interceptor
 *
 * Automatically logs all authentication attempts (successful and failed) for security auditing.
 *
 * Features:
 * - Logs successful logins and registrations
 * - Logs failed login attempts with reason
 * - Tracks IP addresses and user agents
 * - Sends Slack alerts for suspicious activity (5+ failed attempts)
 * - Integrates with audit_logs table
 * - Auto-cleanup of failed attempt tracking after 30 minutes
 *
 * Applied globally in AuthModule.
 */
@Injectable()
export class AuthLoggingInterceptor implements NestInterceptor, OnModuleDestroy {
  private readonly logger = new Logger(AuthLoggingInterceptor.name);
  private readonly failedAttempts = new Map<string, number>();
  private readonly cleanupTimeouts = new Set<NodeJS.Timeout>();
  private readonly AUTH_ENDPOINTS = ['/auth/login', '/auth/register'] as const;
  private readonly CLEANUP_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private readonly SUSPICIOUS_ATTEMPT_THRESHOLD = 5;

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly slackService: SlackService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const url = request.url;
    const body: unknown = request.body;

    // Early return if not an auth endpoint
    if (!this.isAuthEndpoint(url)) {
      return next.handle();
    }

    const ipAddress = this.getIpAddress(request);
    const userAgent = request.headers['user-agent'] || 'unknown';
    const username = this.extractUsername(body);
    const actionType = this.getActionType(url);
    let responseStatus: number | undefined;

    return next.handle().pipe(
      tap(() => {
        // Capture response status when available
        // Note: response.statusCode may not be set immediately in tap,
        // but we'll use finalize to ensure we have the correct status
        responseStatus = response.statusCode;
      }),
      finalize(() => {
        // Use finalize to ensure we capture the final response status
        const finalStatus = response.statusCode || responseStatus || 200;

        // Log successful authentication (2xx status codes)
        if (finalStatus >= 200 && finalStatus < 300) {
          this.logSuccessfulAuth(username, ipAddress, userAgent, actionType, finalStatus).catch(
            (err: unknown) => {
              const errorMessage =
                err instanceof Error
                  ? err.message
                  : typeof err === 'string'
                    ? err
                    : JSON.stringify(err);
              const errorStack = err instanceof Error ? err.stack : undefined;
              this.logger.error(
                `Failed to log successful auth for ${username}: ${errorMessage}`,
                errorStack,
              );
            },
          );

          // Clear failed attempts counter on successful auth
          this.clearFailedAttempts(username, ipAddress);
        }
      }),
      catchError((error) => {
        // Handle HTTP exceptions for auth endpoints
        if (error instanceof HttpException) {
          const status = error.getStatus();

          // Log failed authentication attempts (400, 401, 403)
          if (status === 401 || status === 400 || status === 403) {
            const errorResponse = error.getResponse();
            let errorMessage: string;
            if (typeof errorResponse === 'string') {
              errorMessage = errorResponse;
            } else if (
              typeof errorResponse === 'object' &&
              errorResponse !== null &&
              'message' in errorResponse
            ) {
              const message = (errorResponse as { message: unknown }).message;
              if (typeof message === 'string') {
                errorMessage = message;
              } else if (Array.isArray(message)) {
                errorMessage = message.join(', ');
              } else if (typeof message === 'object' && message !== null) {
                errorMessage = JSON.stringify(message);
              } else if (message !== null && message !== undefined) {
                errorMessage =
                  typeof message === 'string'
                    ? message
                    : typeof message === 'number' || typeof message === 'boolean'
                      ? String(message)
                      : JSON.stringify(message);
              } else {
                errorMessage = 'Authentication failed';
              }
            } else {
              errorMessage =
                error.message ||
                (typeof errorResponse === 'object' && errorResponse !== null
                  ? JSON.stringify(errorResponse)
                  : typeof errorResponse === 'string'
                    ? errorResponse
                    : 'Authentication failed');
            }

            this.logFailedAuth(
              username,
              ipAddress,
              userAgent,
              `${actionType}_FAILED`,
              errorMessage,
              status,
            ).catch((err: unknown) => {
              const errorMessage =
                err instanceof Error
                  ? err.message
                  : typeof err === 'string'
                    ? err
                    : JSON.stringify(err);
              const errorStack = err instanceof Error ? err.stack : undefined;
              this.logger.error(
                `Failed to log failed auth for ${username}: ${errorMessage}`,
                errorStack,
              );
            });
          }
        }

        // Always re-throw the error to maintain proper error handling
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return throwError(() => error);
      }),
    );
  }

  /**
   * Logs successful authentication attempt
   */
  private async logSuccessfulAuth(
    username: string,
    ipAddress: string,
    userAgent: string,
    action: string,
    statusCode: number,
  ): Promise<void> {
    try {
      await this.auditLogRepository.save({
        userId: 0, // System user ID
        username,
        action,
        entityType: 'Auth',
        entityId: null,
        changes: {
          status: 'success',
        },
        ipAddress,
        userAgent,
        method: 'POST',
        endpoint: `/auth/${action.toLowerCase()}`,
        statusCode,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });

      this.logger.log(`Successful ${action} for ${username} from ${ipAddress}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to log successful auth for ${username}: ${errorMessage}`,
        errorStack,
      );
    }
  }

  /**
   * Logs failed authentication attempt and tracks suspicious activity
   */
  private async logFailedAuth(
    username: string,
    ipAddress: string,
    userAgent: string,
    action: string,
    reason: string,
    statusCode: number,
  ): Promise<void> {
    try {
      // Track failed attempts
      const key = this.getFailedAttemptKey(username, ipAddress);
      const attempts = (this.failedAttempts.get(key) || 0) + 1;
      this.failedAttempts.set(key, attempts);

      // Log to database
      await this.auditLogRepository.save({
        userId: 0, // System user ID
        username,
        action,
        entityType: 'Auth',
        entityId: null,
        changes: {
          status: 'failed',
          reason,
          attemptNumber: attempts,
        },
        ipAddress,
        userAgent,
        method: 'POST',
        endpoint: `/auth/${action.toLowerCase().replace('_failed', '')}`,
        statusCode,
        errorMessage: reason,
        metadata: {
          timestamp: new Date().toISOString(),
          totalAttempts: attempts,
        },
      });

      this.logger.warn(
        `Failed ${action} attempt #${attempts} for ${username} from ${ipAddress}: ${reason}`,
      );

      // Send Slack alert for suspicious activity
      if (attempts >= this.SUSPICIOUS_ATTEMPT_THRESHOLD) {
        await this.slackService
          .notifyFailedLogin(username, ipAddress, attempts)
          .catch((err: unknown) => {
            const errorMessage =
              err instanceof Error
                ? err.message
                : typeof err === 'string'
                  ? err
                  : JSON.stringify(err);
            this.logger.error(
              `Failed to send Slack alert for suspicious activity: ${errorMessage}`,
            );
          });

        this.logger.error(
          `SECURITY ALERT: ${attempts} failed login attempts for ${username} from ${ipAddress}`,
        );
      }

      // Schedule cleanup after timeout
      this.scheduleCleanup(key, attempts);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to log failed auth for ${username}: ${errorMessage}`, errorStack);
    }
  }

  /**
   * Extracts username from request body
   */
  private extractUsername(body: unknown): string {
    if (!body || typeof body !== 'object' || body === null) {
      return 'unknown';
    }

    const bodyObj = body as Record<string, unknown>;

    // Try email first (most common for auth endpoints)
    if (bodyObj.email && typeof bodyObj.email === 'string') {
      return bodyObj.email;
    }

    // Fallback to username
    if (bodyObj.username && typeof bodyObj.username === 'string') {
      return bodyObj.username;
    }

    return 'unknown';
  }

  /**
   * Checks if URL is an auth endpoint
   */
  private isAuthEndpoint(url: string): boolean {
    return this.AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
  }

  /**
   * Gets action type from URL
   */
  private getActionType(url: string): 'LOGIN' | 'REGISTER' {
    return url.includes('/auth/login') ? 'LOGIN' : 'REGISTER';
  }

  /**
   * Gets IP address from request, handling proxies and load balancers
   */
  private getIpAddress(request: Request): string {
    // Check X-Forwarded-For header (first IP in chain)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      if (ips?.trim()) {
        return ips.trim();
      }
    }

    // Check X-Real-IP header
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      const ip = Array.isArray(realIp) ? realIp[0] : realIp;
      if (ip) {
        return ip;
      }
    }

    // Fallback to connection remote address
    // Note: These properties are not in the Express Request type but exist at runtime
    const reqWithConnection = request as Request & {
      connection?: { remoteAddress?: string };
      socket?: { remoteAddress?: string };
    };
    if (reqWithConnection.connection?.remoteAddress) {
      return reqWithConnection.connection.remoteAddress;
    }
    if (reqWithConnection.socket?.remoteAddress) {
      return reqWithConnection.socket.remoteAddress;
    }

    return 'unknown';
  }

  /**
   * Generates key for tracking failed attempts
   */
  private getFailedAttemptKey(username: string, ipAddress: string): string {
    return `${username}:${ipAddress}`;
  }

  /**
   * Clears failed attempts counter for a user
   */
  private clearFailedAttempts(username: string, ipAddress: string): void {
    const key = this.getFailedAttemptKey(username, ipAddress);
    this.failedAttempts.delete(key);
  }

  /**
   * Schedules cleanup of failed attempts counter after timeout
   */
  private scheduleCleanup(key: string, attempts: number): void {
    const timeout = setTimeout(() => {
      // Only delete if the attempt count hasn't changed (no new attempts)
      const current = this.failedAttempts.get(key);
      if (current === attempts) {
        this.failedAttempts.delete(key);
        this.logger.debug(`Cleaned up failed attempts counter for key: ${key}`);
      }
      this.cleanupTimeouts.delete(timeout);
    }, this.CLEANUP_TIMEOUT_MS);

    this.cleanupTimeouts.add(timeout);
  }

  /**
   * Cleanup method called by NestJS when module is destroyed
   * Clears all pending timeouts and failed attempt counters
   */
  onModuleDestroy(): void {
    this.logger.log('Cleaning up AuthLoggingInterceptor resources...');

    // Clear all pending timeouts
    for (const timeout of this.cleanupTimeouts) {
      clearTimeout(timeout);
    }
    this.cleanupTimeouts.clear();

    // Clear all failed attempt counters
    const clearedCount = this.failedAttempts.size;
    this.failedAttempts.clear();

    if (clearedCount > 0) {
      this.logger.log(
        `Cleared ${clearedCount} failed attempt counter(s) and ${this.cleanupTimeouts.size} timeout(s)`,
      );
    }
  }
}
