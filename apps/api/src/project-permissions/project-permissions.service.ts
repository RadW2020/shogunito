import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectPermission, ProjectRole } from '../entities/project-permission.entity';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { CreateProjectPermissionDto } from './dto/create-project-permission.dto';
import { UpdateProjectPermissionDto } from './dto/update-project-permission.dto';

@Injectable()
export class ProjectPermissionsService {
  constructor(
    @InjectRepository(ProjectPermission)
    private projectPermissionRepository: Repository<ProjectPermission>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Get all permissions for a project
   */
  async findAllForProject(projectId: number): Promise<ProjectPermission[]> {
    await this.ensureProjectExists(projectId);

    return this.projectPermissionRepository.find({
      where: { projectId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get a user's permission for a project
   */
  async findOne(projectId: number, userId: number): Promise<ProjectPermission | null> {
    return this.projectPermissionRepository.findOne({
      where: { projectId, userId },
      relations: ['user'],
    });
  }

  /**
   * Get all projects a user has access to
   */
  async findAllForUser(userId: number): Promise<ProjectPermission[]> {
    return this.projectPermissionRepository.find({
      where: { userId },
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Add a user to a project with a specific role
   */
  async create(
    projectId: number,
    createDto: CreateProjectPermissionDto,
  ): Promise<ProjectPermission> {
    await this.ensureProjectExists(projectId);
    await this.ensureUserExists(createDto.userId);

    // Check if permission already exists
    const existingPermission = await this.findOne(projectId, createDto.userId);
    if (existingPermission) {
      throw new ConflictException('User already has permission for this project');
    }

    const permission = this.projectPermissionRepository.create({
      projectId,
      userId: createDto.userId,
      role: createDto.role,
    });

    return this.projectPermissionRepository.save(permission);
  }

  /**
   * Update a user's role for a project
   */
  async update(
    projectId: number,
    userId: number,
    updateDto: UpdateProjectPermissionDto,
  ): Promise<ProjectPermission> {
    const permission = await this.findOne(projectId, userId);

    if (!permission) {
      throw new NotFoundException('Permission not found for this user and project');
    }

    // Prevent downgrading the last owner
    if (permission.role === ProjectRole.OWNER && updateDto.role !== ProjectRole.OWNER) {
      const ownerCount = await this.countOwners(projectId);
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot remove the last owner of a project');
      }
    }

    permission.role = updateDto.role;
    return this.projectPermissionRepository.save(permission);
  }

  /**
   * Remove a user's permission for a project
   */
  async remove(projectId: number, userId: number): Promise<void> {
    const permission = await this.findOne(projectId, userId);

    if (!permission) {
      throw new NotFoundException('Permission not found for this user and project');
    }

    // Prevent removing the last owner
    if (permission.role === ProjectRole.OWNER) {
      const ownerCount = await this.countOwners(projectId);
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot remove the last owner of a project');
      }
    }

    await this.projectPermissionRepository.remove(permission);
  }

  /**
   * Assign owner role to project creator
   * Called automatically when a project is created
   */
  async assignOwner(projectId: number, userId: number): Promise<ProjectPermission> {
    const existingPermission = await this.findOne(projectId, userId);

    if (existingPermission) {
      // User already has permission, upgrade to owner if not already
      if (existingPermission.role !== ProjectRole.OWNER) {
        existingPermission.role = ProjectRole.OWNER;
        return this.projectPermissionRepository.save(existingPermission);
      }
      return existingPermission;
    }

    const permission = this.projectPermissionRepository.create({
      projectId,
      userId,
      role: ProjectRole.OWNER,
    });

    return this.projectPermissionRepository.save(permission);
  }

  /**
   * Check if a user has at least the specified role for a project
   */
  async hasRole(userId: number, projectId: number, minRole: ProjectRole): Promise<boolean> {
    const permission = await this.findOne(projectId, userId);
    if (!permission) return false;

    const roleHierarchy: Record<ProjectRole, number> = {
      [ProjectRole.VIEWER]: 1,
      [ProjectRole.CONTRIBUTOR]: 2,
      [ProjectRole.OWNER]: 3,
    };

    return roleHierarchy[permission.role] >= roleHierarchy[minRole];
  }

  /**
   * Count number of owners for a project
   */
  private async countOwners(projectId: number): Promise<number> {
    return this.projectPermissionRepository.count({
      where: { projectId, role: ProjectRole.OWNER },
    });
  }

  /**
   * Ensure project exists
   */
  private async ensureProjectExists(projectId: number): Promise<void> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }
  }

  /**
   * Ensure user exists
   */
  private async ensureUserExists(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
  }
}
