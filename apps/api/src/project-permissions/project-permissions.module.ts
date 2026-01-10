import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectPermissionsService } from './project-permissions.service';
import { ProjectPermissionsController } from './project-permissions.controller';
import { ProjectPermission } from '../entities/project-permission.entity';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { ProjectPermissionGuardModule } from '../auth/guards/project-permission.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectPermission, Project, User]),
    ProjectPermissionGuardModule, // Provides ProjectPermissionGuard
  ],
  controllers: [ProjectPermissionsController],
  providers: [ProjectPermissionsService],
  exports: [ProjectPermissionsService],
})
export class ProjectPermissionsModule {}
