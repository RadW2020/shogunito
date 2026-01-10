import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { ProjectPermission, ProjectRole } from '../../entities/project-permission.entity';
import { Project } from '../../entities/project.entity';
import { Episode } from '../../entities/episode.entity';
import { Sequence } from '../../entities/sequence.entity';
import { User } from '../../entities/user.entity';
import { PROJECT_ROLE_KEY, hasRequiredProjectRole } from '../decorators/project-role.decorator';

/**
 * Guard that checks project-level permissions
 *
 * This guard works in conjunction with @RequireProjectRole decorator to enforce
 * project-specific access control.
 *
 * Permission Resolution:
 * 1. Admin users bypass all project permission checks (full access)
 * 2. For other users, the guard:
 *    a. Extracts the projectId from the request (directly or via hierarchy)
 *    b. Looks up the user's ProjectPermission for that project
 *    c. Compares the user's role against the required role
 *
 * Hierarchy Navigation:
 * - For sequences: Sequence -> Episode -> Project
 * - For episodes: Episode -> Project
 * - For projects: Direct access
 *
 * @example
 * @UseGuards(JwtAuthGuard, ProjectPermissionGuard)
 * @RequireProjectRole(ProjectRole.CONTRIBUTOR)
 * createSequence() { ... }
 */
@Injectable()
export class ProjectPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(ProjectPermission)
    private projectPermissionRepository: Repository<ProjectPermission>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Episode)
    private episodeRepository: Repository<Episode>,
    @InjectRepository(Sequence)
    private sequenceRepository: Repository<Sequence>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the required project role from the decorator
    const requiredRole = this.reflector.getAllAndOverride<ProjectRole>(PROJECT_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no project role is required, allow access
    if (!requiredRole) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user: User }>();
    const user = request.user;

    // If no user (should be caught by JwtAuthGuard first)
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admin users bypass project permission checks
    if (user.role === 'admin') {
      return true;
    }

    // Extract projectId from the request
    const projectId = await this.extractProjectId(request);

    if (!projectId) {
      throw new ForbiddenException('Could not determine project context');
    }

    // Look up the user's permission for this project
    const permission = await this.projectPermissionRepository.findOne({
      where: {
        userId: user.id,
        projectId: projectId,
      },
    });

    // No permission found - user has no access to this project
    if (!permission) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Check if the user's role meets the required role
    if (!hasRequiredProjectRole(permission.role, requiredRole)) {
      throw new ForbiddenException(
        `Insufficient project permissions. Required: ${requiredRole}, You have: ${permission.role}`,
      );
    }

    // Attach project permission to request for use in controllers
    (request as any).projectPermission = permission;

    return true;
  }

  /**
   * Extract the projectId from the request parameters
   *
   * Handles different route patterns:
   * - /projects/:projectId/... -> direct projectId
   * - /projects/:id -> id is projectId
   * - /episodes/:id -> navigate to project via episode
   * - /sequences/:id -> navigate to project via sequence -> episode
   */
  private async extractProjectId(request: Request): Promise<number | null> {
    const params = request.params;

    // Direct projectId parameter
    if (params.projectId) {
      const projectId = parseInt(params.projectId, 10);
      if (!isNaN(projectId)) {
        return projectId;
      }
    }

    // Check the route path to determine entity type
    const path = request.route?.path || request.path;

    // Projects routes: /projects/:id
    if (path.includes('/projects/') && params.id) {
      const projectId = parseInt(params.id, 10);
      if (!isNaN(projectId)) {
        return projectId;
      }
    }

    // Episodes routes: /episodes/:id
    if (path.includes('/episodes/') && params.id) {
      return this.getProjectIdFromEpisode(parseInt(params.id, 10));
    }

    // For episode creation with projectId in body
    if (path.includes('/episodes') && request.body?.projectId) {
      return parseInt(request.body.projectId, 10);
    }

    // Sequences routes: /sequences/:id
    if (path.includes('/sequences/') && params.id) {
      return this.getProjectIdFromSequence(parseInt(params.id, 10));
    }

    // For sequence creation with episodeId in body
    if (path.includes('/sequences') && request.body?.episodeId) {
      return this.getProjectIdFromEpisode(parseInt(request.body.episodeId, 10));
    }

    // Assets routes - assets belong to projects directly
    if (path.includes('/assets/') && params.id) {
      // Assets have projectId directly
      return this.getProjectIdFromAsset(parseInt(params.id, 10));
    }

    // For asset creation with projectId in body
    if (path.includes('/assets') && request.body?.projectId) {
      return parseInt(request.body.projectId, 10);
    }

    // Versions routes - versions belong to assets, sequences, etc.
    if (path.includes('/versions/') && params.id) {
      return this.getProjectIdFromVersion(parseInt(params.id, 10));
    }

    return null;
  }

  /**
   * Navigate from episode to project
   */
  private async getProjectIdFromEpisode(episodeId: number): Promise<number | null> {
    if (isNaN(episodeId)) return null;

    const episode = await this.episodeRepository.findOne({
      where: { id: episodeId },
      select: ['projectId'],
    });

    if (!episode) {
      throw new NotFoundException(`Episode with ID ${episodeId} not found`);
    }

    return episode.projectId;
  }

  /**
   * Navigate from sequence to project via episode
   */
  private async getProjectIdFromSequence(sequenceId: number): Promise<number | null> {
    if (isNaN(sequenceId)) return null;

    const sequence = await this.sequenceRepository.findOne({
      where: { id: sequenceId },
      select: ['episodeId'],
    });

    if (!sequence) {
      throw new NotFoundException(`Sequence with ID ${sequenceId} not found`);
    }

    return this.getProjectIdFromEpisode(sequence.episodeId);
  }

  /**
   * Get projectId from asset (assets belong directly to projects)
   */
  private getProjectIdFromAsset(assetId: number): Promise<number | null> {
    if (isNaN(assetId)) return Promise.resolve(null);

    // Assets have projectId directly - we need to query the assets table
    // Since we don't have AssetRepository injected, we'll use a raw query approach
    // or assume the asset has projectId in the request
    // For now, return null and let the controller handle it
    return Promise.resolve(null);
  }

  /**
   * Get projectId from version
   * Versions can belong to assets, sequences, etc.
   */
  private getProjectIdFromVersion(versionId: number): Promise<number | null> {
    if (isNaN(versionId)) return Promise.resolve(null);
    return Promise.resolve(null);
  }
}
