import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationType {
  PROJECT_ASSIGNED = 'project_assigned',
  EPISODE_ASSIGNED = 'episode_assigned',
  SEQUENCE_ASSIGNED = 'sequence_assigned',
  ASSET_ASSIGNED = 'asset_assigned',
  VERSION_APPROVED = 'version_approved',
  VERSION_REJECTED = 'version_rejected',
  NOTE_CREATED = 'note_created',
  NOTE_MENTION = 'note_mention',
  STATUS_CHANGED = 'status_changed',
  DEADLINE_APPROACHING = 'deadline_approaching',
  TASK_COMPLETED = 'task_completed',
  COMMENT_ADDED = 'comment_added',
}

@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['userId', 'createdAt'])
@Index(['entityType', 'entityId'])
export class Notification {
  @ApiProperty({
    description: 'Unique identifier for the notification',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'ID of the user who will receive the notification',
    example: 1,
    type: 'number',
  })
  @Column({ type: 'integer' })
  @Index()
  userId: number;

  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
    example: NotificationType.VERSION_APPROVED,
  })
  @Column({
    type: 'varchar',
    enum: NotificationType,
  })
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'Version Approved',
  })
  @Column()
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'Your version SH_001_v003 has been approved by the director',
  })
  @Column('text')
  message: string;

  @ApiProperty({
    description: 'Type of entity this notification refers to',
    example: 'Version',
    required: false,
  })
  @Column({ nullable: true })
  entityType?: string;

  @ApiProperty({
    description: 'ID of the entity this notification refers to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @Column({ nullable: true })
  entityId?: string;

  @ApiProperty({
    description: 'Whether the notification has been read',
    example: false,
    default: false,
  })
  @Column({ default: false })
  @Index()
  isRead: boolean;

  @ApiProperty({
    description: 'Additional metadata in JSON format',
    example: { versionCode: 'SH_001_v003', approvedBy: 'director@studio.com' },
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @ApiProperty({
    description: 'ID of the user who triggered this notification',
    example: 1,
    type: 'number',
    required: false,
  })
  @Column({ nullable: true, type: 'integer' })
  triggeredBy?: number;

  @ApiProperty({
    description: 'Timestamp when notification was created',
    example: '2024-01-15T10:30:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when notification was last updated',
    example: '2024-01-15T11:00:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
