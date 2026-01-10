import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FilterProjectsDto } from './dto/filter-projects.dto';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserRateLimitGuard } from '../common/guards/user-rate-limit.guard';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: ProjectsService;

  const mockUser: User = {
    id: 123,
    email: 'test@example.com',
    name: 'Test User',
    role: 'producer',
  } as User;

  const mockProject: Project = {
    id: 123,
    code: 'PROJ_001',
    name: 'Test Project',
    description: 'Test description',
    statusId: 'status-uuid-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Project;

  const mockProjectsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOneById: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(UserRateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a project successfully', async () => {
      const createDto: CreateProjectDto = {
        code: 'PROJ_001',
        name: 'Test Project',
        description: 'Test description',
        statusId: 'status-uuid-123',
      };

      mockProjectsService.create.mockResolvedValue(mockProject);

      const result = await controller.create(createDto, mockUser);

      expect(service.create).toHaveBeenCalledWith(
        createDto,
        mockUser.id,
      );
      expect(result).toEqual(mockProject);
    });

    it('should use email when name is not available', async () => {
      const createDto: CreateProjectDto = {
        code: 'PROJ_002',
        name: 'Test Project 2',
      };

      const userWithoutName = { ...mockUser, name: undefined };
      mockProjectsService.create.mockResolvedValue(mockProject);

      await controller.create(createDto, userWithoutName as User);

      expect(service.create).toHaveBeenCalledWith(createDto, userWithoutName.id);
    });

    it('should use id when name and email are not available', async () => {
      const createDto: CreateProjectDto = {
        code: 'PROJ_003',
        name: 'Test Project 3',
      };

      const userMinimal = { id: 456 } as User;
      mockProjectsService.create.mockResolvedValue(mockProject);

      await controller.create(createDto, userMinimal);

      expect(service.create).toHaveBeenCalledWith(createDto, userMinimal.id);
    });

    it('should throw ConflictException when project code already exists', async () => {
      const createDto: CreateProjectDto = {
        code: 'PROJ_001',
        name: 'Test Project',
      };

      mockProjectsService.create.mockRejectedValue(
        new ConflictException("Project with code 'PROJ_001' already exists"),
      );

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all projects without filters', async () => {
      const projects = [mockProject];
      mockProjectsService.findAll.mockResolvedValue({ data: projects });

      const result = await controller.findAll({});

      expect(service.findAll).toHaveBeenCalledWith({}, undefined);
      expect(result).toEqual({ data: projects });
    });

    it('should return filtered projects', async () => {
      const filters: FilterProjectsDto = {
        statusId: 'status-uuid-123',
        clientName: 'Netflix',
        page: 1,
        limit: 10,
      };

      const paginatedResult = {
        data: [mockProject],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockProjectsService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters, undefined);
      expect(result).toEqual(paginatedResult);
    });

    it('should handle search filter', async () => {
      const filters: FilterProjectsDto = {
        search: 'Test',
      };

      mockProjectsService.findAll.mockResolvedValue({ data: [mockProject] });

      await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters, undefined);
    });
  });

  describe('findOne', () => {
    it('should return a project by id', async () => {
      mockProjectsService.findOneById.mockResolvedValue(mockProject);

      const result = await controller.findOne(123);

      expect(service.findOneById).toHaveBeenCalledWith(123, undefined);
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException when project not found', async () => {
      mockProjectsService.findOneById.mockRejectedValue(
        new NotFoundException('Project with ID 999 not found'),
      );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a project successfully', async () => {
      const updateDto: UpdateProjectDto = {
        name: 'Updated Project Name',
        statusId: 'status-completed-uuid',
      };

      const updatedProject = { ...mockProject, ...updateDto };
      mockProjectsService.update.mockResolvedValue(updatedProject);

      const result = await controller.update(123, updateDto, mockUser);

      expect(service.update).toHaveBeenCalledWith(
        123,
        updateDto,
        { userId: mockUser.id, role: mockUser.role },
      );
      expect(result).toEqual(updatedProject);
    });

    it('should throw NotFoundException when project not found', async () => {
      const updateDto: UpdateProjectDto = { name: 'Updated Name' };

      mockProjectsService.update.mockRejectedValue(
        new NotFoundException('Project with ID 999 not found'),
      );

      await expect(controller.update(999, updateDto, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a project successfully', async () => {
      mockProjectsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(123);

      expect(service.remove).toHaveBeenCalledWith(123, undefined);
      expect(result).toEqual({ message: 'Proyecto eliminado exitosamente' });
    });

    it('should throw NotFoundException when project not found', async () => {
      mockProjectsService.remove.mockRejectedValue(
        new NotFoundException('Project with ID 999 not found'),
      );

      await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
