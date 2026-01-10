import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsObject, IsNumber } from 'class-validator';
import { NotificationType } from '../../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'ID of the user who will receive the notification',
    example: 1,
    type: 'number',
  })
  @IsNumber()
  userId: number;

  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
    example: NotificationType.VERSION_APPROVED,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'Version Approved',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'Your version SH_001_v003 has been approved by the director',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Type of entity this notification refers to',
    example: 'Version',
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'ID of the entity this notification refers to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { versionCode: 'SH_001_v003', approvedBy: 'director@studio.com' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'ID of the user who triggered this notification',
    example: 1,
    type: 'number',
  })
  @IsOptional()
  @IsNumber()
  triggeredBy?: number;
}
