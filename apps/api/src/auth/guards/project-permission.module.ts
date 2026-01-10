import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectPermissionGuard } from './project-permission.guard';
import { ProjectPermission } from '../../entities/project-permission.entity';
import { Project } from '../../entities/project.entity';
import { Episode } from '../../entities/episode.entity';
import { Sequence } from '../../entities/sequence.entity';

/**
 * Module that provides the ProjectPermissionGuard
 *
 * Import this module in any module where you want to use
 * @UseGuards(ProjectPermissionGuard) and @RequireProjectRole()
 *
 * @example
 * // In your module:
 * import { ProjectPermissionGuardModule } from '../auth/guards/project-permission.module';
 *
 * @Module({
 *   imports: [ProjectPermissionGuardModule, ...],
 *   ...
 * })
 * export class EpisodesModule {}
 *
 * // In your controller:
 * import { ProjectPermissionGuard } from '../auth/guards/project-permission.guard';
 * import { RequireProjectRole } from '../auth/decorators/project-role.decorator';
 * import { ProjectRole } from '../entities/project-permission.entity';
 *
 * @UseGuards(JwtAuthGuard, ProjectPermissionGuard)
 * @RequireProjectRole(ProjectRole.CONTRIBUTOR)
 * create() { ... }
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
  providers: [ProjectPermissionGuard],
  exports: [ProjectPermissionGuard, TypeOrmModule],
})
export class ProjectPermissionGuardModule {}
