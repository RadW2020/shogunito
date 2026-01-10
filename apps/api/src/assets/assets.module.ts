import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { Asset, Project, Version, Status } from '../entities';
import { FilesModule } from '../files/files.module';
import { ProjectAccessModule } from '../auth/services/project-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asset, Project, Version, Status]),
    FilesModule,
    ProjectAccessModule,
  ],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
