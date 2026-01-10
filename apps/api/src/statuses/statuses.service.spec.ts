import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StatusesService } from './statuses.service';
import { Status } from '../entities/status.entity';
import { NotFoundException } from '@nestjs/common';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { FilterStatusesDto } from './dto/filter-statuses.dto';

describe('StatusesService', () => {
  let service: StatusesService;
  let statusRepository: any;

  const mockStatus: Status = {
    id: 'status-123',
    code: 'STAT_001',
    name: 'Test Status',
    description: 'Test description',
    color: '#FF0000',
    isActive: true,
    sortOrder: 1,
  } as Status;

  const mockQueryBuilder = {
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<StatusesService>(StatusesService);
    statusRepository = module.get(getRepositoryToken(Status));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all statuses without filters', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockStatus], 1]);

      const result = await service.findAll();

      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.data).toEqual([mockStatus]);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(1);
    });

    it('should apply isActive filter', async () => {
      const filters: FilterStatusesDto = {
        isActive: true,
      };

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockStatus], 1]);

      await service.findAll(filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('status.isActive = :isActive', {
        isActive: true,
      });
    });

    it('should apply color filter', async () => {
      const filters: FilterStatusesDto = {
        color: '#FF0000',
      };

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockStatus], 1]);

      await service.findAll(filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('status.color = :color', {
        color: '#FF0000',
      });
    });

    it('should apply pagination', async () => {
      const filters: FilterStatusesDto = {
        page: 2,
        limit: 10,
      };

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(filters);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('findOne', () => {
    it('should return a status by id', async () => {
      statusRepository.findOne.mockResolvedValue(mockStatus);

      const result = await service.findOne('status-123');

      expect(statusRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'status-123' },
      });
      expect(result).toEqual(mockStatus);
    });

    it('should throw NotFoundException when status not found', async () => {
      statusRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('status-999')).rejects.toThrow(NotFoundException);
    });
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

      statusRepository.create.mockReturnValue(mockStatus);
      statusRepository.save.mockResolvedValue(mockStatus);

      const result = await service.create(createDto);

      expect(statusRepository.create).toHaveBeenCalled();
      expect(statusRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockStatus);
    });
  });

  describe('update', () => {
    it('should update a status successfully', async () => {
      const updateDto: UpdateStatusDto = {
        name: 'Updated Status Name',
        color: '#00FF00',
      };

      const updatedStatus = { ...mockStatus, ...updateDto };

      statusRepository.findOne
        .mockResolvedValueOnce(mockStatus)
        .mockResolvedValueOnce(updatedStatus);
      statusRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.update('status-123', updateDto);

      expect(statusRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'status-123' },
      });
      expect(statusRepository.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should delete a status successfully', async () => {
      statusRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove('status-123');

      expect(statusRepository.delete).toHaveBeenCalledWith('status-123');
    });

    it('should throw NotFoundException when status not found', async () => {
      statusRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('status-999')).rejects.toThrow(NotFoundException);
    });
  });
});
