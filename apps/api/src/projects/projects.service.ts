import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { Note } from '../entities/note.entity';
import { Status } from '../entities/status.entity';
import { ProjectPermission, ProjectRole } from '../entities/project-permission.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FilterProjectsDto } from './dto/filter-projects.dto';

type ProjectWithNotes = Omit<Project, 'notes'> & { notes: Note[] };

/**
 * Context for permission-aware operations
 */
export interface UserContext {
  userId: number;
  role: string; // Global role: admin, director, artist, member
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectPermission)
    private projectPermissionRepository: Repository<ProjectPermission>,
  ) {}

  private async loadNotesForEntity(linkId: string | number, linkType: string): Promise<Note[]> {
    return this.projectRepository.manager
      .createQueryBuilder(Note, 'note')
      .where('note.linkId = :linkId AND note.linkType = :linkType', {
        linkId: linkId.toString(),
        linkType,
      })
      .getMany();
  }

  /**
   * Transform project to include status code for frontend compatibility
   */
  private transformProject(project: any): any {
    return {
      ...project,
      status: project.status?.code || null,
    };
  }

  /**
   * Check if user is a global admin
   */
  private isAdmin(userContext?: UserContext): boolean {
    return userContext?.role === 'admin';
  }

  /**
   * Get all project IDs the user has access to
   */
  async getAccessibleProjectIds(userContext?: UserContext): Promise<number[]> {
    if (!userContext) return [];

    // Admins can access all projects
    if (this.isAdmin(userContext)) {
      const allProjects = await this.projectRepository.find({ select: ['id'] });
      return allProjects.map((p) => p.id);
    }

    // Get projects where user has permission
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
    // Admins always have access
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

  async findAll(filters?: FilterProjectsDto, userContext?: UserContext): Promise<any> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.episodes', 'episodes')
      .leftJoinAndSelect('episodes.sequences', 'sequences')
      .leftJoinAndSelect('project.assets', 'assets')
      .leftJoinAndSelect('project.status', 'status');

    // Filter by user's accessible projects (unless admin)
    if (userContext && !this.isAdmin(userContext)) {
      const accessibleProjectIds = await this.getAccessibleProjectIds(userContext);
      if (accessibleProjectIds.length === 0) {
        // User has no project access, return empty
        return filters?.page || filters?.limit
          ? { data: [], pagination: { page, limit, total: 0, totalPages: 0 } }
          : [];
      }
      queryBuilder.andWhere('project.id IN (:...accessibleProjectIds)', {
        accessibleProjectIds,
      });
    }

    if (filters?.statusId) {
      queryBuilder.andWhere('project.statusId = :statusId', {
        statusId: filters.statusId,
      });
    }

    if (filters?.clientName) {
      queryBuilder.andWhere('project.clientName ILIKE :clientName', {
        clientName: `%${filters.clientName}%`,
      });
    }

    if (filters?.createdBy) {
      queryBuilder.andWhere('project.createdBy = :createdBy', {
        createdBy: filters.createdBy,
      });
    }

    // Note: projects table does not have assigned_to column
    // if (filters?.assignedTo) {
    //   queryBuilder.andWhere('project.assignedTo = :assignedTo', {
    //     assignedTo: filters.assignedTo,
    //   });
    // }

    if (filters?.search) {
      queryBuilder.andWhere('(project.name ILIKE :search OR project.code ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    // Apply sorting
    const sortBy = filters?.sortBy || 'createdAt';
    const order = filters?.order || 'DESC';
    queryBuilder.orderBy(`project.${sortBy}`, order);
    queryBuilder.addOrderBy('episodes.cutOrder', 'ASC', 'NULLS LAST');
    queryBuilder.addOrderBy('sequences.cutOrder', 'ASC', 'NULLS LAST');

    // Get total count before pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    if (filters?.page || filters?.limit) {
      queryBuilder.skip(skip).take(limit);
    }

    const projects = await queryBuilder.getMany();

    // Load notes for all entities and transform projects
    const transformedProjects = [];
    for (const project of projects) {
      const notesPromise = this.loadNotesForEntity(project.id, 'Project');
      const episodes = project.episodes || [];

      // Assign loaded notes
      (project as unknown as ProjectWithNotes).notes = await notesPromise;

      for (const episode of episodes) {
        episode.notes = await this.loadNotesForEntity(episode.code, 'Episode');
        const sequences = episode.sequences || [];

        for (const sequence of sequences) {
          sequence.notes = await this.loadNotesForEntity(sequence.code, 'Sequence');
        }
      }

      const assets = project.assets || [];
      for (const asset of assets) {
        asset.notes = await this.loadNotesForEntity(asset.id.toString(), 'Asset');
      }

      // Transform project to include status code
      transformedProjects.push(this.transformProject(project));
    }

    // Return paginated response if pagination was requested
    if (filters?.page || filters?.limit) {
      return {
        data: transformedProjects,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // Return as array if no pagination requested
    return Array.isArray(transformedProjects) ? transformedProjects : { data: transformedProjects };
  }

  async findOneById(id: number, userContext?: UserContext): Promise<any> {
    if (!id || isNaN(id) || id < 1) {
      throw new BadRequestException('Invalid project ID');
    }

    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['episodes', 'episodes.sequences', 'assets', 'status'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Verify user has access to this project
    if (userContext) {
      await this.verifyProjectAccess(id, userContext);
    }

    // Transform project to include status code
    return this.transformProject(project);
  }

  async findOne(code: string, userContext?: UserContext): Promise<any> {
    const project = await this.projectRepository.findOne({
      where: { code },
      relations: ['episodes', 'episodes.sequences', 'assets', 'status'],
    });

    if (!project) {
      throw new NotFoundException(`Project with code ${code} not found`);
    }

    // Verify user has access to this project
    if (userContext) {
      await this.verifyProjectAccess(project.id, userContext);
    }

    // Transform project to include status code
    return this.transformProject(project);
  }

  async create(createProjectDto: CreateProjectDto, userId?: number | null): Promise<Project> {
    try {
      // Automatically assign userId to createdBy field
      const projectData = {
        ...createProjectDto,
        createdBy: userId || null,
      };
      const project = this.projectRepository.create(projectData);
      const savedProject = await this.projectRepository.save(project);

      // Auto-assign the creator as project owner
      if (userId) {
        await this.assignProjectOwner(savedProject.id, userId);
      }

      // Send notification for new project creation
      // const creator =
      //   userId || savedProject.createdBy ? String(userId || savedProject.createdBy) : 'System';
      // await this.slackService.notifyProjectCreated(savedProject.code, savedProject.name, creator);

      return savedProject;
    } catch (error) {
      // Handle duplicate key error (unique constraint violation)
      if (error.code === '23505') {
        throw new ConflictException(`Project with code '${createProjectDto.code}' already exists`);
      }
      throw error;
    }
  }

  /**
   * Assign a user as owner of a project
   * Used automatically when creating a project
   */
  private async assignProjectOwner(projectId: number, userId: number): Promise<void> {
    const existingPermission = await this.projectPermissionRepository.findOne({
      where: { projectId, userId },
    });

    if (existingPermission) {
      // User already has permission, upgrade to owner if not already
      if (existingPermission.role !== ProjectRole.OWNER) {
        existingPermission.role = ProjectRole.OWNER;
        await this.projectPermissionRepository.save(existingPermission);
      }
      return;
    }

    // Create new owner permission
    const permission = this.projectPermissionRepository.create({
      projectId,
      userId,
      role: ProjectRole.OWNER,
    });
    await this.projectPermissionRepository.save(permission);
  }

  async update(
    id: number,
    updateProjectDto: UpdateProjectDto,
    userContext?: UserContext,
  ): Promise<Project> {
    // Verify user has at least contributor access (owners and contributors can update)
    if (userContext) {
      await this.verifyProjectAccess(id, userContext, ProjectRole.CONTRIBUTOR);
    }

    // Check for code uniqueness if code is being updated
    if (updateProjectDto.code) {
      const existingProject = await this.projectRepository.findOne({
        where: { code: updateProjectDto.code },
      });
      if (existingProject && existingProject.id !== id) {
        throw new ConflictException(`Code '${updateProjectDto.code}' already exists`);
      }
    }

    // Get current project state to check for status changes
    const currentProject = await this.findOneById(id);
    // Check if status is changing to a "completed" status
    // We need to check the status name/code from the status relation
    let newStatus: Status | null = null;
    if (updateProjectDto.statusId) {
      newStatus = await this.projectRepository.manager
        .createQueryBuilder(Status, 'status')
        .where('status.id = :statusId', { statusId: updateProjectDto.statusId })
        .getOne();
    }
    const currentStatusCode = currentProject.status?.code || null;
    const isStatusChangingToCompleted =
      newStatus &&
      newStatus.code?.toLowerCase().includes('completed') &&
      updateProjectDto.statusId !== currentProject.statusId &&
      currentStatusCode?.toLowerCase() !== 'completed';

    await this.projectRepository.update(id, updateProjectDto);
    const updatedProject = await this.findOneById(id);

    // Send notification if project is being marked as completed
    if (isStatusChangingToCompleted) {
      // const completer = userContext?.userId ? String(userContext.userId) : 'System';
      // await this.slackService.notifyProjectCompleted(
      //   updatedProject.code,
      //   updatedProject.name,
      //   completer,
      // );
    }

    return updatedProject;
  }

  async remove(id: number, userContext?: UserContext): Promise<void> {
    // Only owners can delete projects
    if (userContext) {
      await this.verifyProjectAccess(id, userContext, ProjectRole.OWNER);
    }

    // Verify project exists (findOneById throws if not found)
    await this.findOneById(id);
    await this.projectRepository.delete(id);
  }
}
