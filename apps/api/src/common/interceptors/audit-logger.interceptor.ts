import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request, Response } from 'express';
import { AuditLog } from '../../entities/audit-log.entity';
import { User } from '../../entities/user.entity';

/**
 * Audit Logger Interceptor
 *
 * Automatically logs all CREATE, UPDATE, DELETE operations
 * for audit trail and compliance purposes.
 *
 * This interceptor captures:
 * - User who performed the action
 * - HTTP method and endpoint
 * - Request body (changes)
 * - Response status
 * - IP address and user agent
 * - Timestamp
 *
 * Usage: Applied globally in AppModule or per-controller
 *
 * @example
 * // In AppModule
 * providers: [
 *   {
 *     provide: APP_INTERCEPTOR,
 *     useClass: AuditLoggerInterceptor,
 *   },
 * ]
 */
@Injectable()
export class AuditLoggerInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<
      Request & {
        user?: User | { id?: string; sub?: string; username?: string; email?: string };
      }
    >();
    const response = context.switchToHttp().getResponse<Response>();
    const method = request.method;
    const url = request.url;
    const user = request.user; // From JWT auth

    // Only log mutating operations (POST, PATCH, PUT, DELETE)
    const shouldLog = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

    if (!shouldLog || !user) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (data) => {
        try {
          await this.logAudit({
            userId:
              (user as User).id ||
              ((user as { sub?: string }).sub ? Number((user as { sub?: string }).sub) : undefined),
            username:
              (user as User).name ||
              (user as { username?: string }).username ||
              (user as { email?: string }).email ||
              undefined,
            action: this.getActionFromMethod(method),
            entityType: this.getEntityTypeFromUrl(url),
            entityId: this.getEntityIdFromUrl(url) || data?.id || data?.code,
            changes: this.getChanges(method, request.body, data),
            ipAddress: this.getIpAddress(request),
            userAgent: request.headers['user-agent'],
            method,
            endpoint: url,
            statusCode: response.statusCode,
            metadata: {
              duration: Date.now() - startTime,
              responseDataSize: JSON.stringify(data).length,
            },
          });
        } catch (error) {
          // Don't fail the request if audit logging fails
          console.error('Audit logging error:', error);
        }
      }),
      catchError(async (error) => {
        try {
          await this.logAudit({
            userId:
              (user as User).id ||
              ((user as { sub?: string }).sub ? Number((user as { sub?: string }).sub) : undefined),
            username:
              (user as User).name ||
              (user as { username?: string }).username ||
              (user as { email?: string }).email ||
              undefined,
            action: this.getActionFromMethod(method) + '_FAILED',
            entityType: this.getEntityTypeFromUrl(url),
            entityId: this.getEntityIdFromUrl(url),
            changes: request.body,
            ipAddress: this.getIpAddress(request),
            userAgent: request.headers['user-agent'],
            method,
            endpoint: url,
            statusCode: error.status || 500,
            errorMessage: error.message,
          });
        } catch (logError) {
          console.error('Audit logging error:', logError);
        }
        throw error;
      }),
    );
  }

  private async logAudit(data: Partial<AuditLog>): Promise<void> {
    const log = this.auditLogRepository.create(data);
    await this.auditLogRepository.save(log);
  }

  private getActionFromMethod(method: string): string {
    const actionMap = {
      POST: 'CREATE',
      PATCH: 'UPDATE',
      PUT: 'UPDATE',
      DELETE: 'DELETE',
    };
    return actionMap[method] || method;
  }

  private getEntityTypeFromUrl(url: string): string {
    // Extract entity type from URL
    // Examples:
    // /projects -> Project
    // /episodes/EP_001 -> Episode
    // /sequences/SEQ_001/versions -> Version

    const segments = url.split('/').filter((s) => s);
    if (segments.length === 0) return 'Unknown';

    const entitySegment = segments[0].split('?')[0]; // Remove query params

    // Capitalize first letter and singularize
    const entityType = entitySegment.charAt(0).toUpperCase() + entitySegment.slice(1, -1);

    return entityType || 'Unknown';
  }

  private getEntityIdFromUrl(url: string): string | null {
    // Extract entity ID from URL
    // Examples:
    // /projects/PRJ_001 -> PRJ_001
    // /episodes/EP_001/duration -> EP_001

    const segments = url.split('/').filter((s) => s && !s.includes('?'));

    // Look for segments that look like IDs (contains underscore or dash)
    for (const segment of segments) {
      if (segment.includes('_') || segment.match(/^[A-Z0-9-]+$/)) {
        return segment;
      }
    }

    return null;
  }

  private getChanges(
    method: string,
    requestBody: unknown,
    responseData: unknown,
  ): Record<string, unknown> {
    if (method === 'POST') {
      // For CREATE, log the created data
      const data = (responseData as { data?: unknown })?.data;
      return (data as Record<string, unknown>) || (responseData as Record<string, unknown>) || {};
    } else if (method === 'PATCH' || method === 'PUT') {
      // For UPDATE, log the changes sent
      return {
        before: null, // We'd need to fetch the entity before to get this
        after: requestBody,
      };
    } else if (method === 'DELETE') {
      // For DELETE, log what was deleted
      return {
        deleted: true,
      };
    }

    return (requestBody as Record<string, unknown>) || {};
  }

  private getIpAddress(request: Request): string {
    // Get real IP considering proxies
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwardedForValue =
      typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : undefined;
    const realIp = request.headers['x-real-ip'];
    const realIpValue = typeof realIp === 'string' ? realIp : undefined;
    return forwardedForValue || realIpValue || request.ip || request.ip || 'unknown';
  }
}
