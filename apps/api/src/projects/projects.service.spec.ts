import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { Project } from '../entities/project.entity';
import { ProjectPermission, ProjectRole } from '../entities/project-permission.entity';
import { SlackService } from '../notifications/slack/slack.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FilterProjectsDto } from './dto/filter-projects.dto';
import { ProjectAccessService } from '../auth/services/project-access.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectRepository: any;
  let slackService: SlackService;

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
    } as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    episodes: [],
    assets: [],
  } as Project;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getCount: jest.fn(),
  };

  const mockNotesQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            manager: {
              createQueryBuilder: jest.fn(() => mockNotesQueryBuilder),
            },
          },
        },
        {
          provide: getRepositoryToken(ProjectPermission),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn().mockImplementation(({ where }) => {
              if (where.projectId === 123 && where.userId === 123) {
                return Promise.resolve({
                  projectId: 123,
                  userId: 123,
                  role: ProjectRole.OWNER, // OWNER >= CONTRIBUTOR
                });
              }
              return Promise.resolve(null);
            }),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: SlackService,
          useValue: {
            notifyProjectCreated: jest.fn(),
            notifyProjectCompleted: jest.fn(),
            sendNotification: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            notifyProjectCreated: jest.fn(),
            notifyProjectCompleted: jest.fn(),
          },
        },
        {
          provide: ProjectAccessService,
          useValue: {
            isAdmin: jest.fn().mockReturnValue(false),
            getAccessibleProjectIds: jest.fn().mockResolvedValue([]),
            verifyProjectAccess: jest.fn().mockResolvedValue(undefined),
            hasProjectPermission: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    projectRepository = module.get(getRepositoryToken(Project));
    slackService = module.get<SlackService>(SlackService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a project successfully', async () => {
      const createDto: CreateProjectDto = {
        code: 'PROJ_001',
        name: 'Test Project',
      };

      projectRepository.create.mockReturnValue(mockProject);
      projectRepository.save.mockResolvedValue(mockProject);
      jest.spyOn(slackService, 'notifyProjectCreated').mockResolvedValue(undefined);

      const result = await service.create(createDto, 123);

      expect(projectRepository.create).toHaveBeenCalledWith({
        ...createDto,
        createdBy: 123,
      });
      expect(projectRepository.save).toHaveBeenCalledWith(mockProject);
      expect(slackService.notifyProjectCreated).toHaveBeenCalledWith(
        mockProject.code,
        mockProject.name,
        '123',
      );
      expect(result).toEqual(mockProject);
    });

    it('should use System as creator when createdBy is not provided', async () => {
      projectRepository.create.mockReturnValue(mockProject);
      projectRepository.save.mockResolvedValue(mockProject);
      jest.spyOn(slackService, 'notifyProjectCreated').mockResolvedValue(undefined);

      await service.create({ code: 'PROJ_002', name: 'Test' });

      expect(slackService.notifyProjectCreated).toHaveBeenCalledWith(
        mockProject.code,
        mockProject.name,
        'System',
      );
    });

    it('should throw ConflictException on duplicate code', async () => {
      const createDto: CreateProjectDto = {
        code: 'PROJ_001',
        name: 'Test Project',
      };

      const error = new Error('Duplicate key');
      (error as any).code = '23505';

      projectRepository.create.mockReturnValue(mockProject);
      projectRepository.save.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow(
        "Project with code 'PROJ_001' already exists",
      );
    });

    it('should rethrow non-duplicate errors', async () => {
      const createDto: CreateProjectDto = {
        code: 'PROJ_001',
        name: 'Test Project',
      };

      const error = new Error('Database error');
      (error as any).code = '50000';

      projectRepository.create.mockReturnValue(mockProject);
      projectRepository.save.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    it('should return all projects without filters', async () => {
      const projectsWithNotes = [mockProject];
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue(projectsWithNotes);
      mockNotesQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findAll(undefined, undefined);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
      // When no pagination, returns array directly
      expect(result).toEqual([{ ...mockProject, status: 'active' }]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return paginated results with filters', async () => {
      const filters: FilterProjectsDto = {
        statusId: 'status-uuid-123',
        page: 1,
        limit: 10,
      };

      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockProject]);
      mockNotesQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('project.statusId = :statusId', {
        statusId: 'status-uuid-123',
      });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
    });

    it('should apply clientName filter', async () => {
      const filters: FilterProjectsDto = {
        clientName: 'Netflix',
      };

      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockProject]);
      mockNotesQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.clientName ILIKE :clientName',
        {
          clientName: '%Netflix%',
        },
      );
    });

    it('should apply search filter', async () => {
      const filters: FilterProjectsDto = {
        search: 'Test',
      };

      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockProject]);
      mockNotesQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(project.name ILIKE :search OR project.code ILIKE :search)',
        { search: '%Test%' },
      );
    });

    it('should apply custom sorting', async () => {
      const filters: FilterProjectsDto = {
        sortBy: 'name',
        order: 'ASC',
      };

      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockProject]);
      mockNotesQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('project.name', 'ASC');
    });
  });

  describe('findOneById', () => {
    it('should return a project by id', async () => {
      const projectWithRelations = {
        ...mockProject,
        __episodes__: [],
        __assets__: [],
      };
      projectRepository.findOne.mockResolvedValue(projectWithRelations);

      const result = await service.findOneById(123, undefined);

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 123 },
        relations: [
          'episodes',
          'episodes.sequences',
          'episodes.sequences.shots',
          'assets',
          'status',
        ],
      });
      expect(result).toHaveProperty('episodes');
      expect(result).toHaveProperty('assets');
      expect(result.episodes).toEqual([]);
      expect(result.assets).toEqual([]);
      expect(Array.isArray(result.episodes)).toBe(true);
      expect(Array.isArray(result.assets)).toBe(true);
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.findOneById(0, undefined)).rejects.toThrow('Invalid project ID');
      await expect(service.findOneById(-1, undefined)).rejects.toThrow('Invalid project ID');
    });

    it('should throw NotFoundException when project not found', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneById(999, undefined)).rejects.toThrow(NotFoundException);
      await expect(service.findOneById(999, undefined)).rejects.toThrow('Project with ID 999 not found');
    });
  });

  describe('findOne', () => {
    it('should return a project by code', async () => {
      const projectWithRelations = {
        ...mockProject,
        __episodes__: [],
        __assets__: [],
      };
      projectRepository.findOne.mockResolvedValue(projectWithRelations);

      const result = await service.findOne('PROJ_001', undefined);

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'PROJ_001' },
        relations: [
          'episodes',
          'episodes.sequences',
          'episodes.sequences.shots',
          'assets',
          'status',
        ],
      });
      expect(result).toHaveProperty('episodes');
      expect(result).toHaveProperty('assets');
    });

    it('should throw NotFoundException when project code not found', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('NONEXISTENT', undefined)).rejects.toThrow(NotFoundException);
      await expect(service.findOne('NONEXISTENT', undefined)).rejects.toThrow(
        'Project with code NONEXISTENT not found',
      );
    });
  });

  describe('update', () => {
    it('should update a project successfully', async () => {
      const updateDto: UpdateProjectDto = {
        name: 'Updated Project Name',
      };

      const currentProject = { ...mockProject, statusId: 'status-uuid-123' };
      const updatedProject = { ...mockProject, ...updateDto };

      projectRepository.findOne.mockResolvedValueOnce(currentProject);
      projectRepository.findOne.mockResolvedValueOnce(updatedProject);
      projectRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(123, updateDto, undefined);

      expect(projectRepository.update).toHaveBeenCalledWith(123, updateDto);
      expect(result).toEqual({ ...updatedProject, status: 'active' });
    });

    it('should throw ConflictException on duplicate code update', async () => {
      const updateDto: UpdateProjectDto = {
        code: 'PROJ_EXISTING',
      };

      const currentProject = {
        ...mockProject,
        id: 123,
        code: 'PROJ_001',
        __episodes__: [],
        __assets__: [],
      };
      const existingProject = {
        ...mockProject,
        id: 456,
        code: 'PROJ_EXISTING',
      };

      projectRepository.findOne
        .mockResolvedValueOnce(existingProject)
        .mockResolvedValueOnce(currentProject);
      projectRepository.update.mockResolvedValue({ affected: 1 });

      await expect(service.update(123, updateDto, undefined)).rejects.toThrow(ConflictException);
    });

    it('should send notification when status changes to completed', async () => {
      const completedStatusId = 'status-completed-uuid';
      const updateDto: UpdateProjectDto = {
        statusId: completedStatusId,
      };

      const currentProject = {
        ...mockProject,
        statusId: 'status-uuid-123',
        status: Promise.resolve({
          id: 'status-uuid-123',
          code: 'active',
          name: 'Active',
        } as any),
      };
      const updatedProject = {
        ...mockProject,
        statusId: completedStatusId,
        status: Promise.resolve({
          id: completedStatusId,
          code: 'completed',
          name: 'Completed',
        } as any),
      };

      // Mock the status query builder
      const mockStatusQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: completedStatusId,
          code: 'completed',
          name: 'Completed',
        }),
      };
      projectRepository.manager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockStatusQueryBuilder),
      };

      projectRepository.findOne.mockResolvedValueOnce(currentProject);
      projectRepository.findOne.mockResolvedValueOnce(updatedProject);
      projectRepository.update.mockResolvedValue({ affected: 1 });
      jest.spyOn(slackService, 'notifyProjectCompleted').mockResolvedValue(undefined);

      await service.update(123, updateDto, { userId: 123, role: 'director' });

      expect(slackService.notifyProjectCompleted).toHaveBeenCalledWith(
        updatedProject.code,
        updatedProject.name,
        '123',
      );
    });

    it('should not send notification when status is already completed', async () => {
      const updateDto: UpdateProjectDto = {
        name: 'Updated Name',
      };

      const completedStatusId = 'status-completed-uuid';
      const currentProject = {
        ...mockProject,
        statusId: completedStatusId,
        status: Promise.resolve({
          id: completedStatusId,
          code: 'completed',
          name: 'Completed',
        } as any),
      };
      const updatedProject = {
        ...mockProject,
        ...updateDto,
        statusId: completedStatusId,
        status: Promise.resolve({
          id: completedStatusId,
          code: 'completed',
          name: 'Completed',
        } as any),
      };

      projectRepository.findOne.mockResolvedValueOnce(currentProject);
      projectRepository.findOne.mockResolvedValueOnce(updatedProject);
      projectRepository.update.mockResolvedValue({ affected: 1 });

      await service.update(123, updateDto, undefined);

      expect(slackService.notifyProjectCompleted).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when project not found', async () => {
      const updateDto: UpdateProjectDto = { name: 'Updated Name' };

      projectRepository.findOne.mockRejectedValue(
        new NotFoundException('Project with ID 999 not found'),
      );

      await expect(service.update(999, updateDto, undefined)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a project successfully', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      projectRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(123, undefined);

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 123 },
        relations: [
          'episodes',
          'episodes.sequences',
          'episodes.sequences.shots',
          'assets',
          'status',
        ],
      });
      expect(projectRepository.delete).toHaveBeenCalledWith(123);
    });

    it('should throw NotFoundException when project not found', async () => {
      projectRepository.findOne.mockRejectedValue(
        new NotFoundException('Project with ID 999 not found'),
      );

      await expect(service.remove(999, undefined)).rejects.toThrow(NotFoundException);
      expect(projectRepository.delete).not.toHaveBeenCalled();
    });
  });
});
