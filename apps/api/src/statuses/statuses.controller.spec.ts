import { Test, TestingModule } from '@nestjs/testing';
import { StatusesController } from './statuses.controller';
import { StatusesService } from './statuses.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { FilterStatusesDto } from './dto/filter-statuses.dto';
import { Status } from '../entities/status.entity';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserRateLimitGuard } from '../common/guards/user-rate-limit.guard';

describe('StatusesController', () => {
  let controller: StatusesController;
  let service: StatusesService;

  const mockStatus: Status = {
    id: 'status-123',
    code: 'STAT_001',
    name: 'Test Status',
    description: 'Test description',
    color: '#FF0000',
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Status;

  const mockStatusesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatusesController],
      providers: [
        {
          provide: StatusesService,
          useValue: mockStatusesService,
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

    controller = module.get<StatusesController>(StatusesController);
    service = module.get<StatusesService>(StatusesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a status successfully', async () => {
      const createDto: CreateStatusDto = {
        code: 'STAT_001',
        name: 'Test Status',
        color: '#FF0000',
        isActive: true,
        applicableEntities: ['all'],
      };

      mockStatusesService.create.mockResolvedValue(mockStatus);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto, null);
      expect(result).toEqual(mockStatus);
    });
  });

  describe('findAll', () => {
    it('should return all statuses without filters', async () => {
      const paginatedResponse = {
        data: [mockStatus],
        metadata: {
          total: 1,
          page: 1,
          limit: 20,
          pages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };

      mockStatusesService.findAll.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll({});

      expect(service.findAll).toHaveBeenCalledWith({});
      expect(result).toEqual(paginatedResponse);
    });

    it('should return filtered statuses', async () => {
      const filters: FilterStatusesDto = {
        isActive: true,
        color: '#FF0000',
      };

      const paginatedResponse = {
        data: [mockStatus],
        metadata: {
          total: 1,
          page: 1,
          limit: 20,
          pages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };

      mockStatusesService.findAll.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual(paginatedResponse);
    });
  });

  describe('findOne', () => {
    it('should return a status by id', async () => {
      mockStatusesService.findOne.mockResolvedValue(mockStatus);

      const result = await controller.findOne('status-123');

      expect(service.findOne).toHaveBeenCalledWith('status-123');
      expect(result).toEqual(mockStatus);
    });

    it('should throw NotFoundException when status not found', async () => {
      mockStatusesService.findOne.mockRejectedValue(
        new NotFoundException('Status with ID status-999 not found'),
      );

      await expect(controller.findOne('status-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a status successfully', async () => {
      const updateDto: UpdateStatusDto = {
        name: 'Updated Status Name',
        color: '#00FF00',
      };

      const updatedStatus = { ...mockStatus, ...updateDto };
      mockStatusesService.update.mockResolvedValue(updatedStatus);

      const result = await controller.update('status-123', updateDto);

      expect(service.update).toHaveBeenCalledWith('status-123', updateDto);
      expect(result).toEqual(updatedStatus);
    });
  });

  describe('remove', () => {
    it('should delete a status successfully', async () => {
      mockStatusesService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('status-123');

      expect(service.remove).toHaveBeenCalledWith('status-123');
      expect(result).toEqual({ message: 'Estado eliminado exitosamente' });
    });
  });
});
