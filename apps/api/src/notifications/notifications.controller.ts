import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { User } from '../entities/user.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FilterNotificationsDto } from './dto/filter-notifications.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Notification } from '../entities/notification.entity';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new notification (admin/system use)',
    description:
      'Manually create a notification. Typically used by system events or admin operations.',
  })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
    type: Notification,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all notifications for the authenticated user',
    description: `
    Retrieve notifications for the current user with optional filters.

    **Filters:**
    - type: Filter by notification type
    - isRead: Filter by read status (true/false)
    - page: Page number for pagination
    - limit: Results per page (max 100)

    Results are ordered by creation date (newest first).
    `,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by notification type',
  })
  @ApiQuery({
    name: 'isRead',
    required: false,
    type: Boolean,
    description: 'Filter by read status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Results per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Notification' },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
            hasNextPage: { type: 'boolean' },
            hasPreviousPage: { type: 'boolean' },
          },
        },
      },
    },
  })
  findAll(
    @Request() req: ExpressRequest & { user: User },
    @Query() filters: FilterNotificationsDto,
  ) {
    const userId = req.user.id;
    return this.notificationsService.findAll(userId, filters);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get count of unread notifications',
    description: 'Returns the number of unread notifications for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 5 },
      },
    },
  })
  async getUnreadCount(@Request() req: ExpressRequest & { user: User }) {
    const userId = req.user.id;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific notification',
    description: 'Retrieve a single notification by ID (must belong to authenticated user)',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification found',
    type: Notification,
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  findOne(@Request() req: ExpressRequest & { user: User }, @Param('id') id: string) {
    const userId = req.user.id;
    return this.notificationsService.findOne(userId, id);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark a notification as read',
    description: 'Mark a specific notification as read',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: Notification,
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  markAsRead(@Request() req: ExpressRequest & { user: User }, @Param('id') id: string) {
    const userId = req.user.id;
    return this.notificationsService.markAsRead(userId, id);
  }

  @Patch('read-all')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Mark all unread notifications as read for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    schema: {
      type: 'object',
      properties: {
        affected: { type: 'number', example: 12 },
        message: { type: 'string', example: '12 notifications marked as read' },
      },
    },
  })
  async markAllAsRead(@Request() req: ExpressRequest & { user: User }) {
    const userId = req.user.id;
    const result = await this.notificationsService.markAllAsRead(userId);
    return {
      ...result,
      message: `${result.affected} notifications marked as read`,
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a notification',
    description: 'Delete a specific notification (must belong to authenticated user)',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Notification deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  async remove(@Request() req: ExpressRequest & { user: User }, @Param('id') id: string) {
    const userId = req.user.id;
    await this.notificationsService.remove(userId, id);
    return { message: 'Notification deleted successfully' };
  }

  @Delete('clear/read')
  @ApiOperation({
    summary: 'Delete all read notifications',
    description: 'Delete all read notifications for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Read notifications deleted successfully',
    schema: {
      type: 'object',
      properties: {
        affected: { type: 'number', example: 8 },
        message: { type: 'string', example: '8 read notifications deleted' },
      },
    },
  })
  async removeAllRead(@Request() req: ExpressRequest & { user: User }) {
    const userId = req.user.id;
    const result = await this.notificationsService.removeAllRead(userId);
    return {
      ...result,
      message: `${result.affected} read notifications deleted`,
    };
  }
}
