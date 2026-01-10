import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditService } from './audit.service';
import { AxiomService } from './axiom.service';
import { LogRetentionService } from './log-retention.service';

/**
 * Global Audit Module
 *
 * Provides comprehensive audit logging functionality across the entire application.
 *
 * Features:
 * - Automatic audit logging for all CRUD operations
 * - Integration with Axiom for external log storage and analytics
 * - Automated log retention policy with configurable periods
 * - Batch archiving to Axiom before deletion
 * - Zero-downtime log management
 *
 * This module is marked as @Global() so services can be injected anywhere.
 *
 * Services:
 * - AuditService: Core audit logging and querying
 * - AxiomService: External log aggregation and analytics
 * - LogRetentionService: Automated cleanup with retention policies
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), ConfigModule],
  providers: [AuditService, AxiomService, LogRetentionService],
  exports: [AuditService, AxiomService, LogRetentionService, TypeOrmModule],
})
export class AuditModule {}
