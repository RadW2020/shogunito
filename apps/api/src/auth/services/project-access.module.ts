import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectAccessService } from './project-access.service';
import { ProjectPermission, Project, Episode, Sequence } from '../../entities';

/**
 * Module providing centralized project access control.
 * Import this module in any service that needs to filter by project permissions.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectPermission,
      Project,
      Episode,
      Sequence,
    ]),
  ],
  providers: [ProjectAccessService],
  exports: [ProjectAccessService, TypeOrmModule],
})
export class ProjectAccessModule {}



