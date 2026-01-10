import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditLog } from '../entities/audit-log.entity';

interface AxiomLogFormat {
  _time: string;
  id: string;
  user_id: string;
  username: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, unknown>;
  ip_address: string;
  user_agent: string;
  method: string;
  endpoint: string;
  status_code: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
  environment: string;
  service: string;
}

interface AxiomIngestResponse {
  ingested: number;
  failed: number;
  failures?: Record<string, unknown>[];
  processedBytes: number;
  blocksCreated: number;
  walLength: number;
  timestamp: string;
  error: string;
}

/**
 * Axiom Integration Service
 *
 * Sends audit logs to Axiom (external logging service) for
 * long-term storage, analysis, and monitoring.
 *
 * Features:
 * - Batch log sending to reduce API calls
 * - Automatic retry on failure
 * - Graceful degradation if Axiom is unavailable
 * - Zero impact on application performance
 *
 * Environment Variables Required:
 * - AXIOM_API_TOKEN: API token for Axiom
 * - AXIOM_DATASET: Dataset name in Axiom (default: 'shogun-audit-logs')
 * - AXIOM_ORG_ID: Organization ID in Axiom
 * - AXIOM_ENABLED: Enable/disable Axiom integration (default: false)
 *
 * @example
 * await axiomService.sendLogs([log1, log2, log3]);
 */
@Injectable()
export class AxiomService {
  private readonly logger = new Logger(AxiomService.name);
  private readonly axiomEnabled: boolean;
  private readonly axiomApiToken: string;
  private readonly axiomDataset: string;
  private readonly axiomOrgId: string;
  private readonly axiomUrl = 'https://api.axiom.co/v1/datasets';
  private logQueue: AuditLog[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 30000; // 30 seconds

  constructor(private configService: ConfigService) {
    this.axiomEnabled = this.configService.get<boolean>('AXIOM_ENABLED', false);
    this.axiomApiToken = this.configService.get<string>('AXIOM_API_TOKEN', '');
    this.axiomDataset = this.configService.get<string>('AXIOM_DATASET', 'shogun-audit-logs');
    this.axiomOrgId = this.configService.get<string>('AXIOM_ORG_ID', '');

    if (this.axiomEnabled) {
      if (!this.axiomApiToken || !this.axiomOrgId) {
        this.logger.warn(
          'Axiom is enabled but AXIOM_API_TOKEN or AXIOM_ORG_ID is not configured. Axiom integration will be disabled.',
        );
      } else {
        this.logger.log('Axiom integration enabled');
        this.startAutoFlush();
      }
    } else {
      this.logger.log('Axiom integration disabled');
    }
  }

  /**
   * Send a single log to Axiom
   */
  async sendLog(log: AuditLog): Promise<void> {
    if (!this.isConfigured()) return;

    this.logQueue.push(log);

    // If queue is full, flush immediately
    if (this.logQueue.length >= this.BATCH_SIZE) {
      await this.flush();
    }
  }

  /**
   * Send multiple logs to Axiom in batch
   */
  async sendLogs(logs: AuditLog[]): Promise<void> {
    if (!this.isConfigured()) return;

    this.logQueue.push(...logs);

    // If queue is full, flush immediately
    if (this.logQueue.length >= this.BATCH_SIZE) {
      await this.flush();
    }
  }

  /**
   * Flush all queued logs to Axiom
   */
  async flush(): Promise<void> {
    if (!this.isConfigured() || this.logQueue.length === 0) return;

    const logsToSend = this.logQueue.splice(0, this.BATCH_SIZE);

    try {
      const response = await fetch(`${this.axiomUrl}/${this.axiomDataset}/ingest`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.axiomApiToken}`,
          'Content-Type': 'application/json',
          'X-Axiom-Org-Id': this.axiomOrgId,
        },
        body: JSON.stringify(logsToSend.map((log) => this.transformLogForAxiom(log))),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Axiom API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const result = (await response.json()) as AxiomIngestResponse;
      this.logger.debug(
        `Successfully sent ${logsToSend.length} logs to Axiom: ${JSON.stringify(result)}`,
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to send logs to Axiom: ${err.message}`, err.stack);

      // Re-queue the logs for retry (at the front of the queue)
      this.logQueue.unshift(...logsToSend);

      // Limit queue size to prevent memory issues
      if (this.logQueue.length > this.BATCH_SIZE * 10) {
        const droppedCount = this.logQueue.length - this.BATCH_SIZE * 10;
        this.logQueue = this.logQueue.slice(-this.BATCH_SIZE * 10);
        this.logger.warn(`Dropped ${droppedCount} old logs due to queue overflow`);
      }
    }
  }

  /**
   * Transform AuditLog entity to Axiom-compatible format
   */
  private transformLogForAxiom(log: AuditLog): AxiomLogFormat {
    return {
      _time: log.createdAt.toISOString(),
      id: log.id,
      user_id: String(log.userId),
      username: log.username,
      action: log.action,
      entity_type: log.entityType,
      entity_id: log.entityId,
      changes: log.changes,
      ip_address: log.ipAddress,
      user_agent: log.userAgent,
      method: log.method,
      endpoint: log.endpoint,
      status_code: log.statusCode,
      error_message: log.errorMessage,
      metadata: log.metadata,
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      service: 'shogun-api',
    };
  }

  /**
   * Check if Axiom is properly configured
   */
  private isConfigured(): boolean {
    return this.axiomEnabled && !!this.axiomApiToken && !!this.axiomOrgId && !!this.axiomDataset;
  }

  /**
   * Start auto-flush timer to periodically send logs
   */
  private startAutoFlush(): void {
    this.flushInterval = setInterval(() => {
      if (this.logQueue.length > 0) {
        this.flush().catch((error: Error) => {
          this.logger.error(`Auto-flush failed: ${error.message}`, error.stack);
        });
      }
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Stop auto-flush timer (for cleanup)
   */
  stopAutoFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    this.stopAutoFlush();
    // Flush remaining logs before shutdown
    await this.flush();
  }

  /**
   * Get current queue size (for monitoring)
   */
  getQueueSize(): number {
    return this.logQueue.length;
  }

  /**
   * Get Axiom status (for health checks)
   */
  getStatus(): {
    enabled: boolean;
    configured: boolean;
    queueSize: number;
  } {
    return {
      enabled: this.axiomEnabled,
      configured: this.isConfigured(),
      queueSize: this.logQueue.length,
    };
  }
}
