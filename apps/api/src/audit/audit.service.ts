import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { PaginatedResponse, createPaginatedResponse } from '../common/dto/pagination.dto';
import { AxiomService } from './axiom.service';

interface AuditStatistics {
  total: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  byUser: Record<string, number>;
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Audit Service
 *
 * Provides methods to create and query audit logs.
 * Automatically sends logs to Axiom for external storage and analytics.
 *
 * @example
 * // Manual logging
 * await auditService.log({
 *   userId: '123',
 *   action: 'DELETE',
 *   entityType: 'Project',
 *   entityId: 'PRJ_001',
 * });
 *
 * // Query logs
 * const logs = await auditService.findAll({ userId: '123', page: 1, limit: 20 });
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @Inject(forwardRef(() => AxiomService))
    private axiomService: AxiomService,
  ) {}

  /**
   * Create an audit log entry
   * Automatically sends to Axiom for external storage
   */
  async log(data: Partial<AuditLog>): Promise<AuditLog> {
    const log = this.auditLogRepository.create(data);
    const savedLog = await this.auditLogRepository.save(log);

    // Send to Axiom asynchronously (don't wait for it)
    this.axiomService.sendLog(savedLog).catch((error) => {
      // Log error but don't fail the request
      console.error('Failed to send log to Axiom:', error);
    });

    return savedLog;
  }

  /**
   * Find all audit logs with pagination and filtering
   */
  async findAll(filters: {
    userId?: number;
    entityType?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<AuditLog>> {
    const { page = 1, limit = 20 } = filters;

    const where: FindOptionsWhere<AuditLog> = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.startDate && filters.endDate) {
      where.createdAt = Between(filters.startDate, filters.endDate);
    }

    const [data, total] = await this.auditLogRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return createPaginatedResponse(data, total, page, limit);
  }

  /**
   * Find logs for a specific user
   */
  async findByUser(userId: number, page = 1, limit = 20): Promise<PaginatedResponse<AuditLog>> {
    return this.findAll({ userId, page, limit });
  }

  /**
   * Find logs for a specific entity
   */
  async findByEntity(
    entityType: string,
    entityId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<AuditLog>> {
    const [data, total] = await this.auditLogRepository.findAndCount({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return createPaginatedResponse(data, total, page, limit);
  }

  /**
   * Get audit statistics
   */
  async getStatistics(startDate: Date, endDate: Date): Promise<AuditStatistics> {
    const logs = await this.auditLogRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    // Count by action
    const byAction = logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});

    // Count by entity type
    const byEntityType = logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.entityType] = (acc[log.entityType] || 0) + 1;
      return acc;
    }, {});

    // Count by user
    const byUser = logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.userId] = (acc[log.userId] || 0) + 1;
      return acc;
    }, {});

    return {
      total: logs.length,
      byAction,
      byEntityType,
      byUser,
      period: {
        start: startDate,
        end: endDate,
      },
    };
  }

  /**
   * Delete old audit logs (for cleanup/retention policy)
   */
  async deleteOldLogs(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.auditLogRepository
      .createQueryBuilder('audit_log')
      .delete()
      .where('audit_log.createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}
