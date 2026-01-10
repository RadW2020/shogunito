import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StatusesService } from './statuses.service';
import { Status } from '../entities/status.entity';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { FilterStatusesDto } from './dto/filter-statuses.dto';
import { NotFoundException } from '@nestjs/common';

/**
 * Integration tests for StatusesService
 *
 * Tests status management flows with:
 * - Status creation and validation
 * - Status filtering and search
 * - Status updates
 * - Status deletion
 * - Pagination
 */
describe('StatusesService Integration Tests', () => {
  let module: TestingModule;
  let statusesService: StatusesService;
  let statusRepository: jest.Mocked<any>;

  const mockStatus: Status = {
    id: 'status-uuid-123',
    code: 'IN_PROGRESS',
    name: 'In Progress',
    description: 'Work in progress',
    color: '#FFA500',
    isActive: true,
    sortOrder: 10,
    applicableEntities: ['shot', 'asset'],
    createdBy: 1,
    assignedTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Status;

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      providers: [
        StatusesService,
        {
          provide: getRepositoryToken(Status),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => {
              const qb = {
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
              };
              return qb;
            }),
          },
        },
      ],
    }).compile();

    statusesService = testModule.get<StatusesService>(StatusesService);
    statusRepository = testModule.get(getRepositoryToken(Status));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Status Creation', () => {
    it('should create status with all fields', async () => {
      const createDto: CreateStatusDto = {
        code: 'NEW_STATUS',
        name: 'New Status',
        description: 'A new status',
        color: '#00FF00',
        isActive: true,
        sortOrder: 5,
        applicableEntities: ['project', 'shot'],
        assignedTo: 1,
      };

      const createdStatus: Status = {
        ...mockStatus,
        ...createDto,
        createdBy: 1,
      };
      statusRepository.create.mockReturnValue(createdStatus);
      statusRepository.save.mockResolvedValue(createdStatus);

      const result = await statusesService.create(createDto, 1);

      expect(result).toHaveProperty('code', createDto.code);
      expect(statusRepository.create).toHaveBeenCalled();
      expect(statusRepository.save).toHaveBeenCalled();
    });

    it('should create status with default values', async () => {
      const createDto: CreateStatusDto = {
        code: 'DEFAULT_STATUS',
        name: 'Default Status',
        color: '#000000',
        applicableEntities: ['project'],
      };

      const createdStatus: Status = {
        ...mockStatus,
        ...createDto,
        isActive: true,
        sortOrder: 0,
        createdBy: null,
      };

      statusRepository.create.mockReturnValue(createdStatus);
      statusRepository.save.mockResolvedValue(createdStatus);

      const result = await statusesService.create(createDto);

      expect(result.isActive).toBe(true);
      expect(result.sortOrder).toBe(0);
    });

    it('should assign userId when provided', async () => {
      const createDto: CreateStatusDto = {
        code: 'USER_STATUS',
        name: 'User Status',
        color: '#FF0000',
        applicableEntities: ['shot'],
      };

      const createdStatus: Status = {
        ...mockStatus,
        ...createDto,
        createdBy: 1,
      };

      statusRepository.create.mockReturnValue(createdStatus);
      statusRepository.save.mockResolvedValue(createdStatus);

      const result = await statusesService.create(createDto, 1);

      expect(result.createdBy).toBe(1);
    });
  });

  describe('Status Filtering and Search', () => {
    it('should filter statuses by isActive', async () => {
      const queryBuilder = statusRepository.createQueryBuilder();
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[mockStatus], 1]);
      statusRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const filters: FilterStatusesDto = { isActive: true };
      const result = await statusesService.findAll(filters);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it('should filter statuses by applicableEntities', async () => {
      const queryBuilder = statusRepository.createQueryBuilder();
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[mockStatus], 1]);
      statusRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const filters: FilterStatusesDto = { applicableEntities: ['shot'] };
      const result = await statusesService.findAll(filters);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it('should filter statuses by color', async () => {
      const queryBuilder = statusRepository.createQueryBuilder();
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[mockStatus], 1]);
      statusRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const filters: FilterStatusesDto = { color: '#FFA500' };
      const result = await statusesService.findAll(filters);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it('should filter statuses by createdBy', async () => {
      const queryBuilder = statusRepository.createQueryBuilder();
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[mockStatus], 1]);
      statusRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const filters: FilterStatusesDto = { createdBy: 1 };
      const result = await statusesService.findAll(filters);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it('should filter statuses by assignedTo', async () => {
      const queryBuilder = statusRepository.createQueryBuilder();
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[mockStatus], 1]);
      statusRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const filters: FilterStatusesDto = { assignedTo: 1 };
      const result = await statusesService.findAll(filters);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it('should filter statuses by code', async () => {
      const queryBuilder = statusRepository.createQueryBuilder();
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[mockStatus], 1]);
      statusRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const filters: FilterStatusesDto = { code: 'PROGRESS' };
      const result = await statusesService.findAll(filters);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it('should filter statuses by name', async () => {
      const queryBuilder = statusRepository.createQueryBuilder();
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[mockStatus], 1]);
      statusRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const filters: FilterStatusesDto = { name: 'Progress' };
      const result = await statusesService.findAll(filters);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it('should support pagination', async () => {
      const queryBuilder = statusRepository.createQueryBuilder();
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[mockStatus], 1]);
      statusRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const filters: FilterStatusesDto = { page: 1, limit: 10 };
      const result = await statusesService.findAll(filters);

      expect(queryBuilder.skip).toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalled();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should return empty array when no statuses match', async () => {
      const queryBuilder = statusRepository.createQueryBuilder();
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
      statusRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const filters: FilterStatusesDto = { isActive: false };
      const result = await statusesService.findAll(filters);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('Status Retrieval', () => {
    it('should find status by ID', async () => {
      statusRepository.findOne.mockResolvedValue(mockStatus);

      const result = await statusesService.findOne('status-uuid-123');

      expect(result).toHaveProperty('id', 'status-uuid-123');
      expect(statusRepository.findOne).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent status', async () => {
      statusRepository.findOne.mockResolvedValue(null);

      await expect(statusesService.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Status Updates', () => {
    it('should update status', async () => {
      const updateDto: UpdateStatusDto = {
        name: 'Updated Status',
        color: '#00FF00',
      };

      const updatedStatus: Status = {
        ...mockStatus,
        ...updateDto,
      };

      statusRepository.update.mockResolvedValue({ affected: 1 });
      statusRepository.findOne.mockResolvedValue(updatedStatus);

      const result = await statusesService.update('status-uuid-123', updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(statusRepository.update).toHaveBeenCalled();
    });

    it('should update isActive status', async () => {
      const updateDto: UpdateStatusDto = {
        isActive: false,
      };

      const updatedStatus: Status = {
        ...mockStatus,
        isActive: false,
      };

      statusRepository.update.mockResolvedValue({ affected: 1 });
      statusRepository.findOne.mockResolvedValue(updatedStatus);

      const result = await statusesService.update('status-uuid-123', updateDto);

      expect(result.isActive).toBe(false);
    });

    it('should update applicableEntities', async () => {
      const updateDto: UpdateStatusDto = {
        applicableEntities: ['project', 'episode'],
      };

      const updatedStatus: Status = {
        ...mockStatus,
        applicableEntities: ['project', 'episode'],
      };

      statusRepository.update.mockResolvedValue({ affected: 1 });
      statusRepository.findOne.mockResolvedValue(updatedStatus);

      const result = await statusesService.update('status-uuid-123', updateDto);

      expect(result.applicableEntities).toEqual(['project', 'episode']);
    });
  });

  describe('Status Deletion', () => {
    it('should delete status', async () => {
      statusRepository.delete.mockResolvedValue({ affected: 1 });

      await statusesService.remove('status-uuid-123');

      expect(statusRepository.delete).toHaveBeenCalledWith('status-uuid-123');
    });

    it('should throw NotFoundException for non-existent status', async () => {
      statusRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(statusesService.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty filters', async () => {
      const queryBuilder = statusRepository.createQueryBuilder();
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[mockStatus], 1]);
      statusRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const result = await statusesService.findAll();

      expect(result.data).toHaveLength(1);
    });

    it('should handle multiple filters combined', async () => {
      const queryBuilder = statusRepository.createQueryBuilder();
      queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[mockStatus], 1]);
      statusRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const filters: FilterStatusesDto = {
        isActive: true,
        applicableEntities: ['shot'],
        color: '#FFA500',
      };

      const result = await statusesService.findAll(filters);

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(3);
      expect(result.data).toHaveLength(1);
    });
  });
});

