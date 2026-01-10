import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Notification, NotificationType } from '../entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FilterNotificationsDto } from './dto/filter-notifications.dto';
import { PaginatedResponse, createPaginatedResponse } from '../common/dto/pagination.dto';

/**
 * Notifications Service
 *
 * Manages user notifications for various events in the system.
 *
 * Notification Types:
 * - PROJECT_ASSIGNED: User assigned to a project
 * - SHOT_ASSIGNED: User assigned to a shot
 * - ASSET_ASSIGNED: User assigned to an asset
 * - VERSION_APPROVED: Version approved by reviewer
 * - VERSION_REJECTED: Version rejected by reviewer
 * - NOTE_CREATED: New note created on assigned entity
 * - NOTE_MENTION: User mentioned in a note (@mention)
 * - STATUS_CHANGED: Entity status changed
 * - DEADLINE_APPROACHING: Deadline approaching for task
 * - TASK_COMPLETED: Task marked as completed
 * - COMMENT_ADDED: New comment on entity
 *
 * @example
 * // Create a notification
 * await notificationsService.create({
 *   userId: 'user-123',
 *   type: NotificationType.VERSION_APPROVED,
 *   title: 'Version Approved',
 *   message: 'Your version SH_001_v003 has been approved',
 *   entityType: 'Version',
 *   entityId: 'version-id',
 *   triggeredBy: 'reviewer-id',
 * });
 *
 * // Get user's unread notifications
 * const unread = await notificationsService.findAll('user-123', { isRead: false });
 */
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  /**
   * Create a new notification
   */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create(dto);
    return this.notificationRepository.save(notification);
  }

  /**
   * Get all notifications for a user with filters
   */
  async findAll(
    userId: number,
    filters: FilterNotificationsDto,
  ): Promise<PaginatedResponse<Notification>> {
    const { type, isRead, page = 1, limit = 20 } = filters;

    const where: FindOptionsWhere<Notification> = { userId };

    if (type !== undefined) {
      where.type = type;
    }

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const [data, total] = await this.notificationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return createPaginatedResponse(data, total, page, limit);
  }

  /**
   * Get a specific notification by ID
   */
  async findOne(userId: number, id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(userId: number, id: string): Promise<Notification> {
    const notification = await this.findOne(userId, id);

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number): Promise<{ affected: number }> {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );

    return { affected: result.affected || 0 };
  }

  /**
   * Delete a notification
   */
  async remove(userId: number, id: string): Promise<void> {
    const notification = await this.findOne(userId, id);
    await this.notificationRepository.remove(notification);
  }

  /**
   * Delete all read notifications for a user
   */
  async removeAllRead(userId: number): Promise<{ affected: number }> {
    const result = await this.notificationRepository.delete({
      userId,
      isRead: true,
    });

    return { affected: result.affected || 0 };
  }

  /**
   * Get count of unread notifications for a user
   */
  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Helper: Notify user when assigned to a project
   */
  async notifyProjectAssignment(
    userId: number,
    projectId: string,
    projectName: string,
    assignedBy: number,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.PROJECT_ASSIGNED,
      title: 'Assigned to Project',
      message: `You have been assigned to project "${projectName}"`,
      entityType: 'Project',
      entityId: projectId,
      triggeredBy: assignedBy,
      metadata: { projectName },
    });
  }

  /**
   * Helper: Notify user when assigned to a shot
   */
  async notifyShotAssignment(
    userId: number,
    shotId: string,
    shotCode: string,
    assignedBy: number,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.SHOT_ASSIGNED,
      title: 'Assigned to Shot',
      message: `You have been assigned to shot "${shotCode}"`,
      entityType: 'Shot',
      entityId: shotId,
      triggeredBy: assignedBy,
      metadata: { shotCode },
    });
  }

  /**
   * Helper: Notify user when assigned to an asset
   */
  async notifyAssetAssignment(
    userId: number,
    assetId: string,
    assetName: string,
    assignedBy: number,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.ASSET_ASSIGNED,
      title: 'Assigned to Asset',
      message: `You have been assigned to asset "${assetName}"`,
      entityType: 'Asset',
      entityId: assetId,
      triggeredBy: assignedBy,
      metadata: { assetName },
    });
  }

  /**
   * Helper: Notify user when version is approved
   */
  async notifyVersionApproved(
    userId: number,
    versionId: string,
    versionCode: string,
    approvedBy: number,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.VERSION_APPROVED,
      title: 'Version Approved',
      message: `Your version "${versionCode}" has been approved`,
      entityType: 'Version',
      entityId: versionId,
      triggeredBy: approvedBy,
      metadata: { versionCode },
    });
  }

  /**
   * Helper: Notify user when version is rejected
   */
  async notifyVersionRejected(
    userId: number,
    versionId: string,
    versionCode: string,
    rejectedBy: number,
    reason?: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.VERSION_REJECTED,
      title: 'Version Rejected',
      message: reason
        ? `Your version "${versionCode}" has been rejected: ${reason}`
        : `Your version "${versionCode}" has been rejected`,
      entityType: 'Version',
      entityId: versionId,
      triggeredBy: rejectedBy,
      metadata: { versionCode, reason },
    });
  }

  /**
   * Helper: Notify user when mentioned in a note
   */
  async notifyMention(
    userId: number,
    noteId: string,
    noteSubject: string,
    mentionedBy: number,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.NOTE_MENTION,
      title: 'You were mentioned',
      message: `You were mentioned in note: "${noteSubject}"`,
      entityType: 'Note',
      entityId: noteId,
      triggeredBy: mentionedBy,
      metadata: { noteSubject },
    });
  }

  /**
   * Helper: Notify user when a note is created on their assigned entity
   */
  async notifyNoteCreated(
    userId: number,
    noteId: string,
    noteSubject: string,
    entityType: string,
    entityId: string,
    createdBy: number,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.NOTE_CREATED,
      title: 'New Note',
      message: `New note created: "${noteSubject}"`,
      entityType,
      entityId,
      triggeredBy: createdBy,
      metadata: { noteId, noteSubject },
    });
  }
}
