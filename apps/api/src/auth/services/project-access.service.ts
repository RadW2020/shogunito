import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectPermission, ProjectRole } from '../../entities/project-permission.entity';
import { Project } from '../../entities/project.entity';
import { Episode } from '../../entities/episode.entity';
import { Sequence } from '../../entities/sequence.entity';

/**
 * Context for permission-aware operations
 */
export interface UserContext {
  userId: number;
  role: string; // Global role: admin, director, artist, member
}

/**
 * Centralized service for project-level access control.
 * All entity services should use this to filter/verify access.
 */
@Injectable()
export class ProjectAccessService {
  constructor(
    @InjectRepository(ProjectPermission)
    private projectPermissionRepository: Repository<ProjectPermission>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Episode)
    private episodeRepository: Repository<Episode>,
    @InjectRepository(Sequence)
    private sequenceRepository: Repository<Sequence>,
  ) {}

  /**
   * Check if user is a global admin
   */
  isAdmin(userContext?: UserContext): boolean {
    return userContext?.role === 'admin';
  }

  /**
   * Get all project IDs the user has access to
   */
  async getAccessibleProjectIds(userContext: UserContext): Promise<number[]> {
    if (this.isAdmin(userContext)) {
      const allProjects = await this.projectRepository.find({ select: ['id'] });
      return allProjects.map((p) => p.id);
    }

    const permissions = await this.projectPermissionRepository.find({
      where: { userId: userContext.userId },
      select: ['projectId'],
    });

    return permissions.map((p) => p.projectId);
  }

  /**
   * Check if user has at least the specified role for a project
   */
  async hasProjectPermission(
    projectId: number,
    userContext: UserContext,
    minRole: ProjectRole = ProjectRole.VIEWER,
  ): Promise<boolean> {
    if (this.isAdmin(userContext)) return true;

    const permission = await this.projectPermissionRepository.findOne({
      where: { projectId, userId: userContext.userId },
    });

    if (!permission) return false;

    const roleHierarchy: Record<ProjectRole, number> = {
      [ProjectRole.VIEWER]: 1,
      [ProjectRole.CONTRIBUTOR]: 2,
      [ProjectRole.OWNER]: 3,
    };

    return roleHierarchy[permission.role] >= roleHierarchy[minRole];
  }

  /**
   * Verify user has permission or throw ForbiddenException
   */
  async verifyProjectAccess(
    projectId: number,
    userContext: UserContext,
    minRole: ProjectRole = ProjectRole.VIEWER,
  ): Promise<void> {
    const hasAccess = await this.hasProjectPermission(projectId, userContext, minRole);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  /**
   * Get projectId from an episode
   */
  async getProjectIdFromEpisode(episodeId: number): Promise<number | null> {
    const episode = await this.episodeRepository.findOne({
      where: { id: episodeId },
      select: ['projectId'],
    });
    return episode?.projectId || null;
  }

  /**
   * Get projectId from a sequence (via episode)
   */
  async getProjectIdFromSequence(sequenceId: number): Promise<number | null> {
    const sequence = await this.sequenceRepository.findOne({
      where: { id: sequenceId },
      select: ['episodeId'],
    });
    if (!sequence?.episodeId) return null;
    return this.getProjectIdFromEpisode(sequence.episodeId);
  }

  /**
   * Verify access to an episode
   */
  async verifyEpisodeAccess(
    episodeId: number,
    userContext: UserContext,
    minRole: ProjectRole = ProjectRole.VIEWER,
  ): Promise<void> {
    const projectId = await this.getProjectIdFromEpisode(episodeId);
    if (!projectId) {
      throw new ForbiddenException('Episode not found or not associated with a project');
    }
    await this.verifyProjectAccess(projectId, userContext, minRole);
  }

  /**
   * Verify access to a sequence
   */
  async verifySequenceAccess(
    sequenceId: number,
    userContext: UserContext,
    minRole: ProjectRole = ProjectRole.VIEWER,
  ): Promise<void> {
    const projectId = await this.getProjectIdFromSequence(sequenceId);
    if (!projectId) {
      throw new ForbiddenException('Sequence not found or not associated with a project');
    }
    await this.verifyProjectAccess(projectId, userContext, minRole);
  }

  /**
   * Get projectId from a version (via entityType and entityId)
   */
  async getProjectIdFromVersion(version: {
    entityId?: number | null;
    entityType: string;
  }): Promise<number | null> {
    if (!version.entityId) return null;

    switch (version.entityType.toLowerCase()) {
      case 'asset': {
        const asset = await this.projectRepository.manager
          .getRepository('Asset')
          .findOne({ where: { id: version.entityId }, select: ['projectId'] });
        return asset?.projectId || null;
      }
      case 'sequence':
        return this.getProjectIdFromSequence(version.entityId);
      case 'episode':
        return version.entityId;
      case 'project':
        return version.entityId;
      default:
        return null;
    }
  }

  /**
   * Verify access to a version
   */
  async verifyVersionAccess(
    version: { entityId?: number | null; entityType: string },
    userContext: UserContext,
    minRole: ProjectRole = ProjectRole.VIEWER,
  ): Promise<void> {
    const projectId = await this.getProjectIdFromVersion(version);
    if (!projectId) {
      throw new ForbiddenException('Version not found or not associated with a project');
    }
    await this.verifyProjectAccess(projectId, userContext, minRole);
  }
}
