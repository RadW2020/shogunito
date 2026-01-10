import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { Project } from '../entities/project.entity';
import { ProjectPermission, ProjectRole } from '../entities/project-permission.entity';
import { Status } from '../entities/status.entity';
import { User } from '../entities/user.entity';
import { SlackService } from '../notifications/slack/slack.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ForbiddenException, ConflictException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

/**
 * Integration tests for ProjectsService
 *
 * Tests project management flows with:
 * - Project creation with permissions
 * - Access control and permissions
 * - Project filtering and search
 * - Project updates with permission checks
 * - Admin vs regular user access
 */
describe('ProjectsService Integration Tests', () => {
  let module: TestingModule;
  let projectsService: ProjectsService;
  let projectRepository: jest.Mocked<any>;
  let projectPermissionRepository: jest.Mocked<any>;
  let slackService: jest.Mocked<SlackService>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockAdminUser: User = {
    id: 1,
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockRegularUser: User = {
    id: 2,
    email: 'user@example.com',
    name: 'Regular User',
    role: 'member',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockProject: Project = {
    id: 123,
    code: 'PROJ_001',
    name: 'Test Project',
    description: 'Test description',
    statusId: 'status-uuid-123',
    status: {
      id: 'status-uuid-123',
      code: 'active',
      name: 'Active',
      color: '#00FF00',
      isActive: true,
      sortOrder: 0,
      applicableEntities: ['project'],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Status,
    createdAt: new Date(),
    updatedAt: new Date(),
    episodes: [],
    assets: [],
  } as Project;

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => {
              const qb = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(0),
                getMany: jest.fn().mockResolvedValue([]),
              };
              return qb;
            }),
            manager: {
              createQueryBuilder: jest.fn(() => ({
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn(),
              })),
            },
          },
        },
        {
          provide: getRepositoryToken(ProjectPermission),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: SlackService,
          useValue: {
            notifyProjectCreated: jest.fn(),
            notifyProjectUpdated: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    module = testModule;
    projectsService = testModule.get<ProjectsService>(ProjectsService);
    projectRepository = testModule.get(getRepositoryToken(Project));
    projectPermissionRepository = testModule.get(getRepositoryToken(ProjectPermission));
    slackService = testModule.get<SlackService>(SlackService);
    notificationsService = testModule.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Project Creation with Permissions', () => {
    it('should create project and assign owner permission to creator', async () => {
      const createDto: CreateProjectDto = {
        code: 'PROJ_NEW',
        name: 'New Project',
        description: 'New project description',
      };

      const userContext = {
        userId: mockRegularUser.id,
        role: mockRegularUser.role,
      };

      const savedProject = {
        ...mockProject,
        ...createDto,
        id: 456,
        createdBy: userContext.userId,
      };

      projectRepository.create.mockReturnValue(savedProject);
      projectRepository.save.mockResolvedValue(savedProject);
      projectRepository.findOne.mockResolvedValue(savedProject);

      const permission = {
        projectId: savedProject.id,
        userId: userContext.userId,
        role: ProjectRole.OWNER,
      };
      projectPermissionRepository.create.mockReturnValue(permission);
      projectPermissionRepository.save.mockResolvedValue(permission);

      const result = await projectsService.create(createDto, userContext.userId);

      expect(result).toHaveProperty('code', createDto.code);
      expect(result).toHaveProperty('name', createDto.name);
      expect(projectPermissionRepository.create).toHaveBeenCalledWith({
        projectId: savedProject.id,
        userId: userContext.userId,
        role: ProjectRole.OWNER,
      });
      expect(projectPermissionRepository.save).toHaveBeenCalled();
    });

    it('should prevent duplicate project codes', async () => {
      const createDto: CreateProjectDto = {
        code: 'PROJ_DUPLICATE',
        name: 'Duplicate Project',
      };

      const userId = mockRegularUser.id;

      // Mock findOne to return existing project (duplicate code check happens in create)
      projectRepository.findOne.mockResolvedValue(mockProject);
      projectRepository.create.mockReturnValue({
        ...mockProject,
        ...createDto,
      });

      // Mock save to throw duplicate key error
      const duplicateError = new Error('Duplicate key');
      (duplicateError as any).code = '23505'; // PostgreSQL duplicate key error code
      projectRepository.save.mockRejectedValue(duplicateError);

      await expect(projectsService.create(createDto, userId)).rejects.toThrow(ConflictException);
    });
  });

  describe('Access Control and Permissions', () => {
    it('should allow admin to access all projects', async () => {
      const adminContext = {
        userId: mockAdminUser.id,
        role: mockAdminUser.role,
      };

      const allProjects = [mockProject, { ...mockProject, id: 456, code: 'PROJ_002' }];
      projectRepository.find.mockResolvedValue(allProjects);

      const accessibleIds = await projectsService.getAccessibleProjectIds(adminContext);

      expect(accessibleIds).toContain(mockProject.id);
      expect(accessibleIds).toContain(456);
    });

    it('should restrict regular user to only accessible projects', async () => {
      const userContext = {
        userId: mockRegularUser.id,
        role: mockRegularUser.role,
      };

      const permissions = [
        { projectId: 123, userId: mockRegularUser.id, role: ProjectRole.VIEWER },
        { projectId: 456, userId: mockRegularUser.id, role: ProjectRole.CONTRIBUTOR },
      ];

      projectPermissionRepository.find.mockResolvedValue(permissions);

      const accessibleIds = await projectsService.getAccessibleProjectIds(userContext);

      expect(accessibleIds).toEqual([123, 456]);
      expect(accessibleIds).not.toContain(789);
    });

    it('should verify project permission correctly', async () => {
      const userContext = {
        userId: mockRegularUser.id,
        role: mockRegularUser.role,
      };

      const permission = {
        projectId: 123,
        userId: mockRegularUser.id,
        role: ProjectRole.CONTRIBUTOR,
      };

      projectPermissionRepository.findOne.mockResolvedValue(permission);

      const hasViewerAccess = await projectsService.hasProjectPermission(
        123,
        userContext,
        ProjectRole.VIEWER,
      );
      expect(hasViewerAccess).toBe(true);

      const hasOwnerAccess = await projectsService.hasProjectPermission(
        123,
        userContext,
        ProjectRole.OWNER,
      );
      expect(hasOwnerAccess).toBe(false);
    });

    it('should throw ForbiddenException when user lacks required permission', async () => {
      const userContext = {
        userId: mockRegularUser.id,
        role: mockRegularUser.role,
      };

      projectPermissionRepository.findOne.mockResolvedValue(null);

      await expect(
        projectsService.verifyProjectAccess(123, userContext, ProjectRole.CONTRIBUTOR),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Project Filtering and Search', () => {
    it('should filter projects by status', async () => {
      const adminContext = {
        userId: mockAdminUser.id,
        role: mockAdminUser.role,
      };

      const projectsArray = [mockProject];
      const queryBuilder = projectRepository.createQueryBuilder();
      queryBuilder.getCount = jest.fn().mockResolvedValue(1);
      queryBuilder.getMany = jest.fn().mockResolvedValue(projectsArray);
      
      // Ensure the queryBuilder is properly mocked
      projectRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      // Mock loadNotesForEntity which is called for each project
      jest.spyOn(projectsService as any, 'loadNotesForEntity').mockResolvedValue([]);

      const filters = { statusId: 'status-uuid-123' };
      const result = await projectsService.findAll(filters, adminContext);

      // Ensure result is an array
      expect(Array.isArray(result) || (result && Array.isArray(result.data))).toBe(true);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'project.statusId = :statusId',
        expect.objectContaining({ statusId: 'status-uuid-123' }),
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it('should search projects by name or code', async () => {
      const adminContext = {
        userId: mockAdminUser.id,
        role: mockAdminUser.role,
      };

      const projectsArray = [mockProject];
      const queryBuilder = projectRepository.createQueryBuilder();
      // Override the default mock to return the array
      queryBuilder.getCount = jest.fn().mockResolvedValue(1);
      queryBuilder.getMany = jest.fn().mockResolvedValue(projectsArray);
      
      // Ensure the queryBuilder is properly mocked
      projectRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      // Mock loadNotesForEntity which is called for each project
      jest.spyOn(projectsService as any, 'loadNotesForEntity').mockResolvedValue([]);

      const filters = { search: 'Test' };
      await projectsService.findAll(filters, adminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(project.name ILIKE :search OR project.code ILIKE :search)',
        expect.objectContaining({ search: '%Test%' }),
      );
    });

    it('should return paginated results', async () => {
      const adminContext = {
        userId: mockAdminUser.id,
        role: mockAdminUser.role,
      };

      const projectsArray = [mockProject];
      const queryBuilder = projectRepository.createQueryBuilder();
      // Override the default mock to return the array
      queryBuilder.getCount = jest.fn().mockResolvedValue(10);
      queryBuilder.getMany = jest.fn().mockResolvedValue(projectsArray);
      
      // Ensure the queryBuilder is properly mocked
      projectRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      // Mock loadNotesForEntity which is called for each project
      jest.spyOn(projectsService as any, 'loadNotesForEntity').mockResolvedValue([]);

      const filters = { page: 1, limit: 5 };
      const result = await projectsService.findAll(filters, adminContext);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('page', 1);
      expect(result.pagination).toHaveProperty('limit', 5);
      expect(result.pagination).toHaveProperty('total', 10);
      expect(result.pagination).toHaveProperty('totalPages', 2);
    });
  });

  describe('Project Updates with Permission Checks', () => {
    it('should update project when user has CONTRIBUTOR permission', async () => {
      const userContext = {
        userId: mockRegularUser.id,
        role: mockRegularUser.role,
      };

      const permission = {
        projectId: 123,
        userId: mockRegularUser.id,
        role: ProjectRole.CONTRIBUTOR,
      };

      const updateDto: UpdateProjectDto = {
        name: 'Updated Project Name',
      };

      projectPermissionRepository.findOne.mockResolvedValue(permission);
      projectRepository.findOne.mockResolvedValue(mockProject);
      projectRepository.update.mockResolvedValue({ affected: 1 });
      projectRepository.findOne.mockResolvedValueOnce(mockProject).mockResolvedValueOnce({
        ...mockProject,
        ...updateDto,
      });

      const result = await projectsService.update(123, updateDto, userContext);

      expect(result.name).toBe(updateDto.name);
      expect(projectRepository.update).toHaveBeenCalled();
    });

    it('should prevent update when user only has VIEWER permission', async () => {
      const userContext = {
        userId: mockRegularUser.id,
        role: mockRegularUser.role,
      };

      const permission = {
        projectId: 123,
        userId: mockRegularUser.id,
        role: ProjectRole.VIEWER,
      };

      const updateDto: UpdateProjectDto = {
        name: 'Updated Project Name',
      };

      projectPermissionRepository.findOne.mockResolvedValue(permission);

      await expect(projectsService.update(123, updateDto, userContext)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Admin vs Regular User Access', () => {
    it('should allow admin to access any project regardless of permissions', async () => {
      const adminContext = {
        userId: mockAdminUser.id,
        role: mockAdminUser.role,
      };

      projectPermissionRepository.findOne.mockResolvedValue(null); // No permission record

      const hasAccess = await projectsService.hasProjectPermission(
        123,
        adminContext,
        ProjectRole.OWNER,
      );

      expect(hasAccess).toBe(true);
    });

    it('should allow admin to update any project', async () => {
      const adminContext = {
        userId: mockAdminUser.id,
        role: mockAdminUser.role,
      };

      const updateDto: UpdateProjectDto = {
        name: 'Admin Updated Name',
      };

      projectRepository.findOne
        .mockResolvedValueOnce(mockProject) // First call in update
        .mockResolvedValueOnce({
          ...mockProject,
          ...updateDto,
        }); // Second call after update
      projectRepository.update.mockResolvedValue({ affected: 1 });

      const result = await projectsService.update(123, updateDto, adminContext);

      expect(result.name).toBe(updateDto.name);
      // Admin should not need permission check
    });
  });
});

