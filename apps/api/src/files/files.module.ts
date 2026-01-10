import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinioService } from './minio.service';
import { ImageOptimizationService } from './image-optimization.service';

@Module({
  imports: [ConfigModule],
  providers: [MinioService, ImageOptimizationService],
  exports: [MinioService, ImageOptimizationService],
})
export class FilesModule {}
