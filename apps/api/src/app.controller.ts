import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { MinioService } from './files/minio.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { RequirePermissions, Permission } from './auth/decorators/permissions.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly minioService: MinioService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Health Check',
    description:
      'Endpoint para verificar el estado de salud de la API. Retorna un mensaje simple indicando que el servicio está funcionando correctamente.',
  })
  @ApiResponse({
    status: 200,
    description: 'La API está funcionando correctamente',
    type: String,
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Health Check Endpoint',
    description: 'Endpoint específico para health checks de Docker/Kubernetes',
  })
  @ApiResponse({
    status: 200,
    description: 'La API está funcionando correctamente',
  })
  health(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('admin/files/update-cache-headers')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.ADMIN_ACCESS)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update cache headers for existing files',
    description: `
      Administrative endpoint to update cache headers for all existing files in MinIO buckets.
      This is useful for migrating existing files to have proper cache headers for browser caching.
      
      Updates cache headers for:
      - Thumbnails: 1 year cache (immutable)
      - Media files: 1 week cache
      
      This operation can take a while depending on the number of files.
    `,
  })
  @ApiQuery({
    name: 'bucket',
    required: false,
    enum: ['thumbnails', 'media', 'attachments'],
    description: 'Specific bucket to update. If not provided, updates all buckets.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache headers update completed',
    schema: {
      type: 'object',
      properties: {
        thumbnails: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            updated: { type: 'number' },
            failed: { type: 'number' },
          },
        },
        media: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            updated: { type: 'number' },
            failed: { type: 'number' },
          },
        },
        attachments: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            updated: { type: 'number' },
            failed: { type: 'number' },
          },
        },
      },
    },
  })
  async updateCacheHeaders(
    @Query('bucket') bucket?: 'thumbnails' | 'media' | 'attachments',
  ): Promise<Record<string, { total: number; updated: number; failed: number }>> {
    const buckets: Array<'thumbnails' | 'media' | 'attachments'> = bucket
      ? [bucket]
      : ['thumbnails', 'media', 'attachments'];

    const results: Record<string, { total: number; updated: number; failed: number }> = {};

    for (const bucketName of buckets) {
      try {
        results[bucketName] = await this.minioService.updateAllFilesCacheHeaders(bucketName);
      } catch {
        results[bucketName] = {
          total: 0,
          updated: 0,
          failed: 0,
        };
      }
    }

    return results;
  }
}
