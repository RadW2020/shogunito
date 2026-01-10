import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VersionsService } from './versions.service';
import { VersionsController } from './versions.controller';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectAccessModule } from '../auth/services/project-access.module';
import { Version } from '../entities/version.entity';
import { Asset } from '../entities/asset.entity';
import { Sequence } from '../entities/sequence.entity';
import { Status } from '../entities/status.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Version, Asset, Sequence, Status]),
    FilesModule,
    NotificationsModule,
    ProjectAccessModule,
  ],
  controllers: [VersionsController],
  providers: [VersionsService],
  exports: [VersionsService],
})
export class VersionsModule {}
