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
import { Request, Response } from 'express';

/**
 * Authentication Logging Interceptor
 *
 * Automatically logs all authentication attempts (successful and failed) for security auditing.
 *
 * Features:
 * - Logs successful logins and registrations
 * - Logs failed login attempts with reason
 * - Tracks IP addresses and user agents
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

  constructor() {}

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
        responseStatus = response.statusCode;
      }),
      finalize(() => {
        // Use finalize to ensure we capture the final response status
        const finalStatus = response.statusCode || responseStatus || 200;

        // Log successful authentication (2xx status codes)
        if (finalStatus >= 200 && finalStatus < 300) {
          this.logSuccessfulAuth(username, ipAddress, userAgent, actionType, finalStatus);
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
              } else {
                errorMessage = JSON.stringify(message);
              }
            } else {
              errorMessage = 'Authentication failed';
            }

            this.logFailedAuth(
              username,
              ipAddress,
              userAgent,
              `${actionType}_FAILED`,
              errorMessage,
              status,
            );
          }
        }

        // Always re-throw the error to maintain proper error handling
        return throwError(() => error);
      }),
    );
  }

  /**
   * Logs successful authentication attempt (console only)
   */
  private logSuccessfulAuth(
    username: string,
    ipAddress: string,
    userAgent: string,
    action: string,
    statusCode: number,
  ): void {
    this.logger.log(`Successful ${action} for ${username} from ${ipAddress} [${statusCode}]`);
  }

  /**
   * Logs failed authentication attempt (console only)
   */
  private logFailedAuth(
    username: string,
    ipAddress: string,
    userAgent: string,
    action: string,
    reason: string,
    statusCode: number,
  ): void {
    // Track failed attempts
    const key = this.getFailedAttemptKey(username, ipAddress);
    const attempts = (this.failedAttempts.get(key) || 0) + 1;
    this.failedAttempts.set(key, attempts);

    this.logger.warn(
      `Failed ${action} attempt #${attempts} for ${username} from ${ipAddress}: ${reason} [${statusCode}]`,
    );

    // Schedule cleanup after timeout
    this.scheduleCleanup(key, attempts);
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
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      if (ips?.trim()) {
        return ips.trim();
      }
    }
    return request.ip || 'unknown';
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
      const current = this.failedAttempts.get(key);
      if (current === attempts) {
        this.failedAttempts.delete(key);
      }
      this.cleanupTimeouts.delete(timeout);
    }, this.CLEANUP_TIMEOUT_MS);

    this.cleanupTimeouts.add(timeout);
  }

  /**
   * Cleanup method called by NestJS when module is destroyed
   */
  onModuleDestroy(): void {
    for (const timeout of this.cleanupTimeouts) {
      clearTimeout(timeout);
    }
    this.cleanupTimeouts.clear();
    this.failedAttempts.clear();
  }
}
