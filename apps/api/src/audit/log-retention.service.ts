import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In, SelectQueryBuilder } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { AxiomService } from './axiom.service';

/**
 * Log Retention Policy Service
 *
 * Automatically manages audit log retention based on configurable policies:
 * - Archives old logs to Axiom before deletion
 * - Deletes logs older than retention period
 * - Different retention periods for different log types
 * - Runs daily cleanup tasks
 *
 * Retention Policies (configurable via environment):
 * - AUTH logs: 90 days (security compliance)
 * - ERROR logs: 180 days (debugging)
 * - CRUD logs: 30 days (general audit)
 * - Default: 60 days
 *
 * Environment Variables:
 * - LOG_RETENTION_ENABLED: Enable/disable retention policy (default: true)
 * - LOG_RETENTION_AUTH_DAYS: Retention for auth logs (default: 90)
 * - LOG_RETENTION_ERROR_DAYS: Retention for error logs (default: 180)
 * - LOG_RETENTION_CRUD_DAYS: Retention for CRUD logs (default: 30)
 * - LOG_RETENTION_DEFAULT_DAYS: Default retention (default: 60)
 * - LOG_RETENTION_SCHEDULE: Cron schedule (default: daily at 2 AM)
 * - LOG_RETENTION_BATCH_SIZE: Batch size for deletion (default: 1000)
 * - LOG_RETENTION_ARCHIVE_TO_AXIOM: Archive to Axiom before delete (default: true)
 *
 * @example
 * // Manual cleanup
 * await logRetentionService.runCleanup();
 *
 * // Get statistics
 * const stats = await logRetentionService.getRetentionStats();
 */
@Injectable()
export class LogRetentionService implements OnModuleInit {
  private readonly logger = new Logger(LogRetentionService.name);
  private readonly enabled: boolean;
  private readonly authRetentionDays: number;
  private readonly errorRetentionDays: number;
  private readonly crudRetentionDays: number;
  private readonly defaultRetentionDays: number;
  private readonly batchSize: number;
  private readonly archiveToAxiom: boolean;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private axiomService: AxiomService,
    private configService: ConfigService,
  ) {
    this.enabled = this.configService.get<boolean>('LOG_RETENTION_ENABLED', true);
    this.authRetentionDays = this.configService.get<number>('LOG_RETENTION_AUTH_DAYS', 90);
    this.errorRetentionDays = this.configService.get<number>('LOG_RETENTION_ERROR_DAYS', 180);
    this.crudRetentionDays = this.configService.get<number>('LOG_RETENTION_CRUD_DAYS', 30);
    this.defaultRetentionDays = this.configService.get<number>('LOG_RETENTION_DEFAULT_DAYS', 60);
    this.batchSize = this.configService.get<number>('LOG_RETENTION_BATCH_SIZE', 1000);
    this.archiveToAxiom = this.configService.get<boolean>('LOG_RETENTION_ARCHIVE_TO_AXIOM', true);
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Log retention policy disabled');
      return;
    }

    this.logger.log('Log retention policy enabled');
    this.logger.log(
      `Retention periods: AUTH=${this.authRetentionDays}d, ERROR=${this.errorRetentionDays}d, CRUD=${this.crudRetentionDays}d, DEFAULT=${this.defaultRetentionDays}d`,
    );

    // Schedule daily cleanup at 2 AM
    this.scheduleCleanup();

    // Run initial cleanup after 5 minutes
    setTimeout(
      () => {
        this.runCleanup().catch((error: Error) => {
          this.logger.error(`Initial cleanup failed: ${error.message}`, error.stack);
        });
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Schedule daily cleanup task
   */
  private scheduleCleanup(): void {
    // Run every 24 hours at 2 AM
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(2, 0, 0, 0);

    // If 2 AM has passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const msUntilNextRun = nextRun.getTime() - now.getTime();

    setTimeout(() => {
      this.runCleanup().catch((error: Error) => {
        this.logger.error(`Scheduled cleanup failed: ${error.message}`, error.stack);
      });

      // Schedule next run (every 24 hours)
      this.cleanupInterval = setInterval(
        () => {
          this.runCleanup().catch((error: Error) => {
            this.logger.error(`Scheduled cleanup failed: ${error.message}`, error.stack);
          });
        },
        24 * 60 * 60 * 1000,
      );
    }, msUntilNextRun);

    this.logger.log(
      `Next cleanup scheduled for: ${nextRun.toISOString()} (in ${Math.round(msUntilNextRun / 1000 / 60)} minutes)`,
    );
  }

  /**
   * Run cleanup for all log types
   */
  async runCleanup(): Promise<{
    auth: number;
    error: number;
    crud: number;
    other: number;
    total: number;
  }> {
    if (!this.enabled) {
      this.logger.warn('Cleanup skipped: retention policy disabled');
      return { auth: 0, error: 0, crud: 0, other: 0, total: 0 };
    }

    this.logger.log('Starting log retention cleanup...');
    const startTime = Date.now();

    try {
      const results = {
        auth: await this.cleanupAuthLogs(),
        error: await this.cleanupErrorLogs(),
        crud: await this.cleanupCrudLogs(),
        other: await this.cleanupOtherLogs(),
        total: 0,
      };

      results.total = results.auth + results.error + results.crud + results.other;

      const duration = Date.now() - startTime;
      this.logger.log(
        `Cleanup completed in ${duration}ms. Deleted ${results.total} logs (AUTH: ${results.auth}, ERROR: ${results.error}, CRUD: ${results.crud}, OTHER: ${results.other})`,
      );

      return results;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Cleanup failed: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Clean up auth logs (LOGIN, LOGOUT, REGISTER, etc.)
   */
  private async cleanupAuthLogs(): Promise<number> {
    const cutoffDate = this.getCutoffDate(this.authRetentionDays);
    const authActions = [
      'LOGIN',
      'LOGOUT',
      'REGISTER',
      'LOGIN_FAILED',
      'REGISTER_FAILED',
      'PASSWORD_RESET',
      'PASSWORD_CHANGE',
    ];

    return this.deleteLogsBatch(cutoffDate, 'Auth logs', (qb) =>
      qb
        .where('audit_log.createdAt < :cutoffDate', { cutoffDate })
        .andWhere('audit_log.action IN (:...actions)', {
          actions: authActions,
        }),
    );
  }

  /**
   * Clean up error logs
   */
  private async cleanupErrorLogs(): Promise<number> {
    const cutoffDate = this.getCutoffDate(this.errorRetentionDays);

    return this.deleteLogsBatch(cutoffDate, 'Error logs', (qb) =>
      qb
        .where('audit_log.createdAt < :cutoffDate', { cutoffDate })
        .andWhere('audit_log.errorMessage IS NOT NULL'),
    );
  }

  /**
   * Clean up CRUD logs (CREATE, UPDATE, DELETE)
   */
  private async cleanupCrudLogs(): Promise<number> {
    const cutoffDate = this.getCutoffDate(this.crudRetentionDays);
    const crudActions = ['CREATE', 'UPDATE', 'DELETE'];

    return this.deleteLogsBatch(
      cutoffDate,
      'CRUD logs',
      (qb) =>
        qb
          .where('audit_log.createdAt < :cutoffDate', { cutoffDate })
          .andWhere('audit_log.action IN (:...actions)', {
            actions: crudActions,
          })
          .andWhere('audit_log.errorMessage IS NULL'), // Exclude errors (handled separately)
    );
  }

  /**
   * Clean up other logs (default retention)
   */
  private async cleanupOtherLogs(): Promise<number> {
    const cutoffDate = this.getCutoffDate(this.defaultRetentionDays);

    // Delete logs that don't match any specific category
    const authActions = [
      'LOGIN',
      'LOGOUT',
      'REGISTER',
      'LOGIN_FAILED',
      'REGISTER_FAILED',
      'PASSWORD_RESET',
      'PASSWORD_CHANGE',
    ];
    const crudActions = ['CREATE', 'UPDATE', 'DELETE'];

    return this.deleteLogsBatch(cutoffDate, 'Other logs', (qb) =>
      qb
        .where('audit_log.createdAt < :cutoffDate', { cutoffDate })
        .andWhere('audit_log.action NOT IN (:...actions)', {
          actions: [...authActions, ...crudActions],
        })
        .andWhere('audit_log.errorMessage IS NULL'),
    );
  }

  /**
   * Delete logs in batches with optional archiving to Axiom
   */
  private async deleteLogsBatch(
    cutoffDate: Date,
    logType: string,
    queryBuilder: (qb: SelectQueryBuilder<AuditLog>) => SelectQueryBuilder<AuditLog>,
  ): Promise<number> {
    let totalDeleted = 0;
    let batch = 0;

    while (true) {
      // Find logs to delete
      const qb = this.auditLogRepository.createQueryBuilder('audit_log');
      queryBuilder(qb);
      qb.take(this.batchSize);

      const logsToDelete = await qb.getMany();

      if (logsToDelete.length === 0) {
        break; // No more logs to delete
      }

      // Archive to Axiom if enabled
      if (this.archiveToAxiom && logsToDelete.length > 0) {
        try {
          await this.axiomService.sendLogs(logsToDelete);
          this.logger.debug(`Archived ${logsToDelete.length} ${logType} to Axiom before deletion`);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          this.logger.error(`Failed to archive ${logType} to Axiom: ${err.message}`, err.stack);
          // Continue with deletion even if archiving fails
        }
      }

      // Delete the logs
      const logIds = logsToDelete.map((log) => log.id);
      await this.auditLogRepository.delete(logIds);

      totalDeleted += logsToDelete.length;
      batch++;

      this.logger.debug(
        `Deleted batch ${batch} of ${logType}: ${logsToDelete.length} logs (total: ${totalDeleted})`,
      );

      // Small delay between batches to reduce database load
      await this.delay(100);
    }

    if (totalDeleted > 0) {
      this.logger.log(`Deleted ${totalDeleted} ${logType} older than ${cutoffDate.toISOString()}`);
    }

    return totalDeleted;
  }

  /**
   * Get cutoff date for retention period
   */
  private getCutoffDate(daysToKeep: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - daysToKeep);
    return date;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get retention statistics
   */
  async getRetentionStats(): Promise<any> {
    const authCutoff = this.getCutoffDate(this.authRetentionDays);
    const errorCutoff = this.getCutoffDate(this.errorRetentionDays);
    const crudCutoff = this.getCutoffDate(this.crudRetentionDays);
    const defaultCutoff = this.getCutoffDate(this.defaultRetentionDays);

    const [authCount, errorCount, crudCount, totalCount] = await Promise.all([
      this.auditLogRepository.count({
        where: {
          createdAt: LessThan(authCutoff),
          action: In(['LOGIN', 'LOGOUT', 'REGISTER', 'LOGIN_FAILED', 'REGISTER_FAILED']),
        },
      }),
      this.auditLogRepository
        .createQueryBuilder('audit_log')
        .where('audit_log.createdAt < :errorCutoff', { errorCutoff })
        .andWhere('audit_log.errorMessage IS NOT NULL')
        .getCount(),
      this.auditLogRepository.count({
        where: {
          createdAt: LessThan(crudCutoff),
          action: In(['CREATE', 'UPDATE', 'DELETE']),
        },
      }),
      this.auditLogRepository.count(),
    ]);

    return {
      enabled: this.enabled,
      retentionPolicies: {
        auth: {
          days: this.authRetentionDays,
          cutoffDate: authCutoff,
          logsToDelete: authCount,
        },
        error: {
          days: this.errorRetentionDays,
          cutoffDate: errorCutoff,
          logsToDelete: errorCount,
        },
        crud: {
          days: this.crudRetentionDays,
          cutoffDate: crudCutoff,
          logsToDelete: crudCount,
        },
        default: {
          days: this.defaultRetentionDays,
          cutoffDate: defaultCutoff,
        },
      },
      totalLogs: totalCount,
      archiveToAxiom: this.archiveToAxiom,
    };
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
