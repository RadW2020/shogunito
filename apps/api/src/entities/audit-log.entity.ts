import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * Audit Log Entity
 *
 * Tracks all CREATE, UPDATE, DELETE operations in the system
 * for compliance, security, and debugging purposes.
 *
 * @example
 * const log = new AuditLog();
 * log.userId = '123-456';
 * log.action = 'CREATE';
 * log.entityType = 'Project';
 * log.entityId = 'PRJ_001';
 * log.changes = { name: 'New Project' };
 */
@Entity('audit_logs')
@Index(['userId'])
@Index(['entityType'])
@Index(['action'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * ID of the user who performed the action
   */
  @Column({ type: 'integer' })
  userId: number;

  /**
   * Username for quick reference (denormalized)
   */
  @Column({ nullable: true })
  username: string;

  /**
   * Action performed: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
   */
  @Column()
  action: string;

  /**
   * Type of entity affected: Project, Episode, Shot, etc.
   */
  @Column()
  entityType: string;

  /**
   * ID or code of the entity affected
   */
  @Column({ nullable: true })
  entityId: string;

  /**
   * Changes made (before/after for UPDATE, full object for CREATE)
   * Stored as JSON
   */
  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, unknown>;

  /**
   * IP address of the user
   */
  @Column({ nullable: true })
  ipAddress: string;

  /**
   * User agent (browser/client info)
   */
  @Column({ type: 'text', nullable: true })
  userAgent: string;

  /**
   * HTTP method used (GET, POST, PATCH, DELETE)
   */
  @Column({ nullable: true })
  method: string;

  /**
   * API endpoint accessed
   */
  @Column({ nullable: true })
  endpoint: string;

  /**
   * Status code of the response
   */
  @Column({ type: 'int', nullable: true })
  statusCode: number;

  /**
   * Error message if action failed
   */
  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  /**
   * Additional metadata
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
