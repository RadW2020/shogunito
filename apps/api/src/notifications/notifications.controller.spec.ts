import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FilterNotificationsDto } from './dto/filter-notifications.dto';
import { Notification, NotificationType } from '../entities/notification.entity';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { User } from '../entities/user.entity';
import { Request as ExpressRequest } from 'express';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'producer',
  } as User;

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

  const mockNotificationsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    getUnreadCount: jest.fn(),
    remove: jest.fn(),
    removeAllRead: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a notification successfully', async () => {
      const createDto: CreateNotificationDto = {
        userId: 'user-123',
        type: NotificationType.VERSION_APPROVED,
        title: 'Version Approved',
        message: 'Your version has been approved',
      };

      mockNotificationsService.create.mockResolvedValue(mockNotification);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockNotification);
    });
  });

  describe('findAll', () => {
    it('should return paginated notifications for user', async () => {
      const filters: FilterNotificationsDto = {};
      const mockRequest = {
        user: mockUser,
      } as ExpressRequest & { user: User };

      const paginatedResponse = {
        data: [mockNotification],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockNotificationsService.findAll.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(mockRequest, filters);

      expect(service.findAll).toHaveBeenCalledWith('user-123', filters);
      expect(result).toEqual(paginatedResponse);
    });

    it('should filter by type', async () => {
      const filters: FilterNotificationsDto = {
        type: NotificationType.VERSION_APPROVED,
      };
      const mockRequest = {
        user: mockUser,
      } as ExpressRequest & { user: User };

      mockNotificationsService.findAll.mockResolvedValue({
        data: [mockNotification],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      await controller.findAll(mockRequest, filters);

      expect(service.findAll).toHaveBeenCalledWith('user-123', filters);
    });

    it('should filter by isRead', async () => {
      const filters: FilterNotificationsDto = {
        isRead: false,
      };
      const mockRequest = {
        user: mockUser,
      } as ExpressRequest & { user: User };

      mockNotificationsService.findAll.mockResolvedValue({
        data: [mockNotification],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      await controller.findAll(mockRequest, filters);

      expect(service.findAll).toHaveBeenCalledWith('user-123', filters);
    });
  });

  describe('findOne', () => {
    it('should return a notification by id', async () => {
      const mockRequest = {
        user: mockUser,
      } as ExpressRequest & { user: User };

      mockNotificationsService.findOne.mockResolvedValue(mockNotification);

      const result = await controller.findOne(mockRequest, 'notification-123');

      expect(service.findOne).toHaveBeenCalledWith('user-123', 'notification-123');
      expect(result).toEqual(mockNotification);
    });

    it('should throw NotFoundException when notification not found', async () => {
      const mockRequest = {
        user: mockUser,
      } as ExpressRequest & { user: User };

      mockNotificationsService.findOne.mockRejectedValue(
        new NotFoundException('Notification not found'),
      );

      await expect(controller.findOne(mockRequest, 'notification-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockRequest = {
        user: mockUser,
      } as ExpressRequest & { user: User };

      const readNotification = {
        ...mockNotification,
        isRead: true,
      };

      mockNotificationsService.markAsRead.mockResolvedValue(readNotification);

      const result = await controller.markAsRead(mockRequest, 'notification-123');

      expect(service.markAsRead).toHaveBeenCalledWith('user-123', 'notification-123');
      expect(result).toEqual(readNotification);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const mockRequest = {
        user: mockUser,
      } as ExpressRequest & { user: User };

      mockNotificationsService.markAllAsRead.mockResolvedValue({ affected: 5 });

      const result = await controller.markAllAsRead(mockRequest);

      expect(service.markAllAsRead).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        affected: 5,
        message: '5 notifications marked as read',
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      const mockRequest = {
        user: mockUser,
      } as ExpressRequest & { user: User };

      mockNotificationsService.getUnreadCount.mockResolvedValue(3);

      const result = await controller.getUnreadCount(mockRequest);

      expect(service.getUnreadCount).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ count: 3 });
    });
  });

  describe('remove', () => {
    it('should delete a notification', async () => {
      const mockRequest = {
        user: mockUser,
      } as ExpressRequest & { user: User };

      mockNotificationsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockRequest, 'notification-123');

      expect(service.remove).toHaveBeenCalledWith('user-123', 'notification-123');
      expect(result).toEqual({ message: 'Notification deleted successfully' });
    });
  });

  describe('removeAllRead', () => {
    it('should delete all read notifications', async () => {
      const mockRequest = {
        user: mockUser,
      } as ExpressRequest & { user: User };

      mockNotificationsService.removeAllRead.mockResolvedValue({ affected: 5 });

      const result = await controller.removeAllRead(mockRequest);

      expect(service.removeAllRead).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        affected: 5,
        message: '5 read notifications deleted',
      });
    });
  });
});
