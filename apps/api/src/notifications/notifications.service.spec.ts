import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationType } from '../entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FilterNotificationsDto } from './dto/filter-notifications.dto';
import { NotFoundException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepository: any;

  const mockNotification: Notification = {
    id: 'notification-123',
    userId: 'user-123',
    type: NotificationType.VERSION_APPROVED,
    title: 'Version Approved',
    message: 'Your version has been approved',
    isRead: false,
    entityType: 'Version',
    entityId: 'version-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Notification;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get(getRepositoryToken(Notification));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a notification successfully', async () => {
      const createDto: CreateNotificationDto = {
        userId: 'user-123',
        type: NotificationType.VERSION_APPROVED,
        title: 'Version Approved',
        message: 'Your version has been approved',
      };

      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);

      const result = await service.create(createDto);

      expect(notificationRepository.create).toHaveBeenCalledWith(createDto);
      expect(notificationRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockNotification);
    });
  });

  describe('findAll', () => {
    it('should return all notifications for a user', async () => {
      notificationRepository.findAndCount.mockResolvedValue([[mockNotification], 1]);

      const filters: FilterNotificationsDto = {};
      const result = await service.findAll('user-123', filters);

      expect(notificationRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toEqual([mockNotification]);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by type', async () => {
      notificationRepository.findAndCount.mockResolvedValue([[mockNotification], 1]);

      const filters: FilterNotificationsDto = {
        type: NotificationType.VERSION_APPROVED,
      };

      await service.findAll('user-123', filters);

      expect(notificationRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          type: NotificationType.VERSION_APPROVED,
        },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by isRead', async () => {
      notificationRepository.findAndCount.mockResolvedValue([[mockNotification], 1]);

      const filters: FilterNotificationsDto = {
        isRead: false,
      };

      await service.findAll('user-123', filters);

      expect(notificationRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          isRead: false,
        },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should apply pagination', async () => {
      notificationRepository.findAndCount.mockResolvedValue([[], 0]);

      const filters: FilterNotificationsDto = {
        page: 2,
        limit: 10,
      };

      await service.findAll('user-123', filters);

      expect(notificationRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { createdAt: 'DESC' },
        skip: 10,
        take: 10,
      });
    });
  });

  describe('findOne', () => {
    it('should return a notification by id', async () => {
      notificationRepository.findOne.mockResolvedValue(mockNotification);

      const result = await service.findOne('user-123', 'notification-123');

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'notification-123', userId: 'user-123' },
      });
      expect(result).toEqual(mockNotification);
    });

    it('should throw NotFoundException when notification not found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('user-123', 'notification-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      notificationRepository.findOne.mockResolvedValue(mockNotification);
      notificationRepository.save.mockResolvedValue({
        ...mockNotification,
        isRead: true,
      });

      const result = await service.markAsRead('user-123', 'notification-123');

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'notification-123', userId: 'user-123' },
      });
      expect(notificationRepository.save).toHaveBeenCalled();
      expect(result.isRead).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      notificationRepository.update.mockResolvedValue({ affected: 5 });

      const result = await service.markAllAsRead('user-123');

      expect(notificationRepository.update).toHaveBeenCalledWith(
        { userId: 'user-123', isRead: false },
        { isRead: true },
      );
      expect(result.affected).toBe(5);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      notificationRepository.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('user-123');

      expect(notificationRepository.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
      });
      expect(result).toBe(3);
    });
  });

  describe('remove', () => {
    it('should delete a notification', async () => {
      notificationRepository.findOne.mockResolvedValue(mockNotification);
      notificationRepository.remove.mockResolvedValue(mockNotification);

      await service.remove('user-123', 'notification-123');

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'notification-123', userId: 'user-123' },
      });
      expect(notificationRepository.remove).toHaveBeenCalledWith(mockNotification);
    });

    it('should throw NotFoundException when notification not found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('user-123', 'notification-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
