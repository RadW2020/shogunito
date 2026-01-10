import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectPermissionsService } from './project-permissions.service';
import { ProjectPermission, ProjectRole } from '../entities/project-permission.entity';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { CreateProjectPermissionDto } from './dto/create-project-permission.dto';
import { UpdateProjectPermissionDto } from './dto/update-project-permission.dto';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Integration tests for ProjectPermissionsService
 *
 * Tests project permission management flows with:
 * - Permission creation and validation
 * - Role updates with owner protection
 * - Permission removal with owner protection
 * - Owner assignment
 * - Role verification
 * - Filtering by project and user
 */
describe('ProjectPermissionsService Integration Tests', () => {
  let module: TestingModule;
  let projectPermissionsService: ProjectPermissionsService;
  let projectPermissionRepository: jest.Mocked<any>;
  let projectRepository: jest.Mocked<any>;
  let userRepository: jest.Mocked<any>;

  const mockProject: Project = {
    id: 123,
    code: 'PROJ_001',
    name: 'Test Project',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Project;

  const mockUser: User = {
    id: 1,
    email: 'user@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockUser2: User = {
    id: 2,
    email: 'user2@example.com',
    name: 'Test User 2',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockPermission: ProjectPermission = {
    id: 1,
    userId: 1,
    projectId: 123,
    role: ProjectRole.CONTRIBUTOR,
    user: mockUser,
    createdAt: new Date(),
  } as ProjectPermission;

  const mockOwnerPermission: ProjectPermission = {
    id: 2,
    userId: 2,
    projectId: 123,
    role: ProjectRole.OWNER,
    user: mockUser2,
    createdAt: new Date(),
  } as ProjectPermission;

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectPermissionsService,
        {
          provide: getRepositoryToken(ProjectPermission),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    projectPermissionsService = testModule.get<ProjectPermissionsService>(
      ProjectPermissionsService,
    );
    projectPermissionRepository = testModule.get(getRepositoryToken(ProjectPermission));
    projectRepository = testModule.get(getRepositoryToken(Project));
    userRepository = testModule.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Permission Creation', () => {
    it('should create permission for user and project', async () => {
      const createDto: CreateProjectPermissionDto = {
        userId: 1,
        role: ProjectRole.CONTRIBUTOR,
      };

      projectRepository.findOne.mockResolvedValue(mockProject);
      userRepository.findOne.mockResolvedValue(mockUser);
      projectPermissionRepository.findOne.mockResolvedValue(null); // No existing permission
      projectPermissionRepository.create.mockReturnValue(mockPermission);
      projectPermissionRepository.save.mockResolvedValue(mockPermission);

      const result = await projectPermissionsService.create(123, createDto);

      expect(result).toHaveProperty('userId', createDto.userId);
      expect(result).toHaveProperty('role', createDto.role);
      expect(projectPermissionRepository.create).toHaveBeenCalled();
      expect(projectPermissionRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent project', async () => {
      const createDto: CreateProjectPermissionDto = {
        userId: 1,
        role: ProjectRole.CONTRIBUTOR,
      };

      projectRepository.findOne.mockResolvedValue(null);

      await expect(
        projectPermissionsService.create(999, createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const createDto: CreateProjectPermissionDto = {
        userId: 999,
        role: ProjectRole.CONTRIBUTOR,
      };

      projectRepository.findOne.mockResolvedValue(mockProject);
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        projectPermissionsService.create(123, createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent duplicate permissions', async () => {
      const createDto: CreateProjectPermissionDto = {
        userId: 1,
        role: ProjectRole.CONTRIBUTOR,
      };

      projectRepository.findOne.mockResolvedValue(mockProject);
      userRepository.findOne.mockResolvedValue(mockUser);
      projectPermissionRepository.findOne.mockResolvedValue(mockPermission); // Existing permission

      await expect(
        projectPermissionsService.create(123, createDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should create permission with OWNER role', async () => {
      const createDto: CreateProjectPermissionDto = {
        userId: 1,
        role: ProjectRole.OWNER,
      };

      const ownerPermission: ProjectPermission = {
        ...mockPermission,
        role: ProjectRole.OWNER,
      };

      projectRepository.findOne.mockResolvedValue(mockProject);
      userRepository.findOne.mockResolvedValue(mockUser);
      projectPermissionRepository.findOne.mockResolvedValue(null);
      projectPermissionRepository.create.mockReturnValue(ownerPermission);
      projectPermissionRepository.save.mockResolvedValue(ownerPermission);

      const result = await projectPermissionsService.create(123, createDto);

      expect(result.role).toBe(ProjectRole.OWNER);
    });

    it('should create permission with VIEWER role', async () => {
      const createDto: CreateProjectPermissionDto = {
        userId: 1,
        role: ProjectRole.VIEWER,
      };

      const viewerPermission: ProjectPermission = {
        ...mockPermission,
        role: ProjectRole.VIEWER,
      };

      projectRepository.findOne.mockResolvedValue(mockProject);
      userRepository.findOne.mockResolvedValue(mockUser);
      projectPermissionRepository.findOne.mockResolvedValue(null);
      projectPermissionRepository.create.mockReturnValue(viewerPermission);
      projectPermissionRepository.save.mockResolvedValue(viewerPermission);

      const result = await projectPermissionsService.create(123, createDto);

      expect(result.role).toBe(ProjectRole.VIEWER);
    });
  });

  describe('Permission Retrieval', () => {
    it('should find all permissions for a project', async () => {
      const permissions = [mockPermission, mockOwnerPermission];

      projectRepository.findOne.mockResolvedValue(mockProject);
      projectPermissionRepository.find.mockResolvedValue(permissions);

      const result = await projectPermissionsService.findAllForProject(123);

      expect(result).toHaveLength(2);
      expect(projectPermissionRepository.find).toHaveBeenCalledWith({
        where: { projectId: 123 },
        relations: ['user'],
        order: { createdAt: 'ASC' },
      });
    });

    it('should throw NotFoundException for non-existent project in findAllForProject', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(
        projectPermissionsService.findAllForProject(999),
      ).rejects.toThrow(NotFoundException);
    });

    it('should find permission for specific user and project', async () => {
      projectPermissionRepository.findOne.mockResolvedValue(mockPermission);

      const result = await projectPermissionsService.findOne(123, 1);

      expect(result).toHaveProperty('userId', 1);
      expect(result).toHaveProperty('projectId', 123);
      expect(projectPermissionRepository.findOne).toHaveBeenCalledWith({
        where: { projectId: 123, userId: 1 },
        relations: ['user'],
      });
    });

    it('should return null for non-existent permission', async () => {
      projectPermissionRepository.findOne.mockResolvedValue(null);

      const result = await projectPermissionsService.findOne(123, 999);

      expect(result).toBeNull();
    });

    it('should find all permissions for a user', async () => {
      const userPermissions = [mockPermission];

      projectPermissionRepository.find.mockResolvedValue(userPermissions);

      const result = await projectPermissionsService.findAllForUser(1);

      expect(result).toHaveLength(1);
      expect(projectPermissionRepository.find).toHaveBeenCalledWith({
        where: { userId: 1 },
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('Permission Updates', () => {
    it('should update user role', async () => {
      const updateDto: UpdateProjectPermissionDto = {
        role: ProjectRole.OWNER,
      };

      const updatedPermission: ProjectPermission = {
        ...mockPermission,
        role: ProjectRole.OWNER,
      };

      projectPermissionRepository.findOne.mockResolvedValue(mockPermission);
      projectPermissionRepository.count.mockResolvedValue(0); // No other owners
      projectPermissionRepository.save.mockResolvedValue(updatedPermission);

      const result = await projectPermissionsService.update(123, 1, updateDto);

      expect(result.role).toBe(ProjectRole.OWNER);
      expect(projectPermissionRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent permission', async () => {
      const updateDto: UpdateProjectPermissionDto = {
        role: ProjectRole.CONTRIBUTOR,
      };

      projectPermissionRepository.findOne.mockResolvedValue(null);

      await expect(
        projectPermissionsService.update(123, 999, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent downgrading last owner', async () => {
      const updateDto: UpdateProjectPermissionDto = {
        role: ProjectRole.CONTRIBUTOR,
      };

      projectPermissionRepository.findOne.mockResolvedValue(mockOwnerPermission);
      projectPermissionRepository.count.mockResolvedValue(1); // Only one owner

      await expect(
        projectPermissionsService.update(123, 2, updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow downgrading owner when multiple owners exist', async () => {
      const updateDto: UpdateProjectPermissionDto = {
        role: ProjectRole.CONTRIBUTOR,
      };

      const updatedPermission: ProjectPermission = {
        ...mockOwnerPermission,
        role: ProjectRole.CONTRIBUTOR,
      };

      projectPermissionRepository.findOne.mockResolvedValue(mockOwnerPermission);
      projectPermissionRepository.count.mockResolvedValue(2); // Multiple owners
      projectPermissionRepository.save.mockResolvedValue(updatedPermission);

      const result = await projectPermissionsService.update(123, 2, updateDto);

      expect(result.role).toBe(ProjectRole.CONTRIBUTOR);
    });

    it('should allow updating to same role', async () => {
      const updateDto: UpdateProjectPermissionDto = {
        role: ProjectRole.CONTRIBUTOR,
      };

      projectPermissionRepository.findOne.mockResolvedValue(mockPermission);
      // countOwners is only called when downgrading from OWNER
      projectPermissionRepository.save.mockResolvedValue(mockPermission);

      const result = await projectPermissionsService.update(123, 1, updateDto);

      expect(result.role).toBe(ProjectRole.CONTRIBUTOR);
    });
  });

  describe('Permission Removal', () => {
    it('should remove permission', async () => {
      projectPermissionRepository.findOne.mockResolvedValue(mockPermission);
      // countOwners is only called when removing an OWNER
      projectPermissionRepository.remove.mockResolvedValue(mockPermission);

      await projectPermissionsService.remove(123, 1);

      expect(projectPermissionRepository.remove).toHaveBeenCalledWith(mockPermission);
    });

    it('should throw NotFoundException for non-existent permission', async () => {
      projectPermissionRepository.findOne.mockResolvedValue(null);

      await expect(projectPermissionsService.remove(123, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should prevent removing last owner', async () => {
      const ownerPermission: ProjectPermission = {
        ...mockOwnerPermission,
        role: ProjectRole.OWNER,
      };
      projectPermissionRepository.findOne.mockResolvedValue(ownerPermission);
      projectPermissionRepository.count.mockResolvedValue(1); // Only one owner

      await expect(projectPermissionsService.remove(123, 2)).rejects.toThrow(
        ForbiddenException,
      );
      expect(projectPermissionRepository.remove).not.toHaveBeenCalled();
    });

    it('should allow removing owner when multiple owners exist', async () => {
      projectPermissionRepository.findOne.mockResolvedValue(mockOwnerPermission);
      projectPermissionRepository.count.mockResolvedValue(2); // Multiple owners
      projectPermissionRepository.remove.mockResolvedValue(mockOwnerPermission);

      await projectPermissionsService.remove(123, 2);

      expect(projectPermissionRepository.remove).toHaveBeenCalledWith(mockOwnerPermission);
    });

    it('should allow removing non-owner permissions', async () => {
      projectPermissionRepository.findOne.mockResolvedValue(mockPermission);
      projectPermissionRepository.remove.mockResolvedValue(mockPermission);

      await projectPermissionsService.remove(123, 1);

      expect(projectPermissionRepository.remove).toHaveBeenCalled();
    });
  });

  describe('Owner Assignment', () => {
    it('should assign owner role to new user', async () => {
      const newOwnerPermission: ProjectPermission = {
        ...mockPermission,
        role: ProjectRole.OWNER,
      };

      projectPermissionRepository.findOne.mockResolvedValue(null); // No existing permission
      projectPermissionRepository.create.mockReturnValue(newOwnerPermission);
      projectPermissionRepository.save.mockResolvedValue(newOwnerPermission);

      const result = await projectPermissionsService.assignOwner(123, 1);

      expect(result.role).toBe(ProjectRole.OWNER);
      expect(projectPermissionRepository.create).toHaveBeenCalled();
    });

    it('should upgrade existing permission to owner', async () => {
      const upgradedPermission: ProjectPermission = {
        ...mockPermission,
        role: ProjectRole.OWNER,
      };

      const existingPermission = { ...mockPermission };
      projectPermissionRepository.findOne.mockResolvedValue(existingPermission); // Existing CONTRIBUTOR
      projectPermissionRepository.save.mockResolvedValue(upgradedPermission);

      const result = await projectPermissionsService.assignOwner(123, 1);

      expect(result.role).toBe(ProjectRole.OWNER);
      expect(projectPermissionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: ProjectRole.OWNER }),
      );
    });

    it('should return existing owner permission unchanged', async () => {
      const existingOwner: ProjectPermission = {
        ...mockOwnerPermission,
        role: ProjectRole.OWNER,
      };
      projectPermissionRepository.findOne.mockResolvedValue(existingOwner);

      const result = await projectPermissionsService.assignOwner(123, 2);

      expect(result).toBeDefined();
      expect(result).toEqual(existingOwner);
      expect(result.role).toBe(ProjectRole.OWNER);
      expect(projectPermissionRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Role Verification', () => {
    it('should return true when user has exact required role', async () => {
      projectPermissionRepository.findOne.mockResolvedValue(mockPermission); // CONTRIBUTOR

      const result = await projectPermissionsService.hasRole(1, 123, ProjectRole.CONTRIBUTOR);

      expect(result).toBe(true);
    });

    it('should return true when user has higher role than required', async () => {
      projectPermissionRepository.findOne.mockResolvedValue(mockOwnerPermission); // OWNER

      const result = await projectPermissionsService.hasRole(2, 123, ProjectRole.CONTRIBUTOR);

      expect(result).toBe(true);
    });

    it('should return false when user has lower role than required', async () => {
      const viewerPermission: ProjectPermission = {
        ...mockPermission,
        role: ProjectRole.VIEWER,
      };

      projectPermissionRepository.findOne.mockResolvedValue(viewerPermission);

      const result = await projectPermissionsService.hasRole(1, 123, ProjectRole.CONTRIBUTOR);

      expect(result).toBe(false);
    });

    it('should return false when user has no permission', async () => {
      projectPermissionRepository.findOne.mockResolvedValue(null);

      const result = await projectPermissionsService.hasRole(999, 123, ProjectRole.VIEWER);

      expect(result).toBe(false);
    });

    it('should verify OWNER role correctly', async () => {
      const ownerPermission: ProjectPermission = {
        ...mockOwnerPermission,
        role: ProjectRole.OWNER,
      };
      projectPermissionRepository.findOne.mockResolvedValue(ownerPermission);

      const result = await projectPermissionsService.hasRole(2, 123, ProjectRole.OWNER);

      expect(result).toBe(true);
    });

    it('should verify VIEWER role correctly', async () => {
      const viewerPermission: ProjectPermission = {
        ...mockPermission,
        role: ProjectRole.VIEWER,
      };

      projectPermissionRepository.findOne.mockResolvedValue(viewerPermission);

      const result = await projectPermissionsService.hasRole(1, 123, ProjectRole.VIEWER);

      expect(result).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty permissions list for project', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      projectPermissionRepository.find.mockResolvedValue([]);

      const result = await projectPermissionsService.findAllForProject(123);

      expect(result).toHaveLength(0);
    });

    it('should handle empty permissions list for user', async () => {
      projectPermissionRepository.find.mockResolvedValue([]);

      const result = await projectPermissionsService.findAllForUser(999);

      expect(result).toHaveLength(0);
    });

    it('should handle multiple permissions for same project', async () => {
      const permissions = [
        mockPermission,
        mockOwnerPermission,
        {
          ...mockPermission,
          id: 3,
          userId: 3,
          role: ProjectRole.VIEWER,
        },
      ];

      projectRepository.findOne.mockResolvedValue(mockProject);
      projectPermissionRepository.find.mockResolvedValue(permissions);

      const result = await projectPermissionsService.findAllForProject(123);

      expect(result).toHaveLength(3);
    });

    it('should handle multiple projects for same user', async () => {
      const userPermissions = [
        mockPermission,
        {
          ...mockPermission,
          id: 3,
          projectId: 456,
        },
      ];

      projectPermissionRepository.find.mockResolvedValue(userPermissions);

      const result = await projectPermissionsService.findAllForUser(1);

      expect(result).toHaveLength(2);
    });
  });
});

