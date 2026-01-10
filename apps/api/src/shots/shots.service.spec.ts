import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ShotsService } from './shots.service';
import { Shot, ShotType } from '../entities/shot.entity';
import { Sequence } from '../entities/sequence.entity';
import { Version } from '../entities/version.entity';
import { Note } from '../entities/note.entity';
import { Status } from '../entities/status.entity';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateShotDto } from './dto/create-shot.dto';
import { UpdateShotDto } from './dto/update-shot.dto';
import { FilterShotsDto } from './dto/filter-shots.dto';
import { ProjectAccessService } from '../auth/services/project-access.service';

describe('ShotsService', () => {
  let service: ShotsService;
  let shotRepository: any;
  let sequenceRepository: any;
  let module: TestingModule;

  const mockSequence: Sequence = {
    id: 456,
    code: 'SEQ_001',
    name: 'Test Sequence',
  } as Sequence;

  const mockShot: Shot = {
    id: 789,
    code: 'SH_001',
    name: 'Test Shot',
    description: 'Test description',
    statusId: 'status-uuid-in-progress',
    sequenceNumber: 1,
    duration: 120,
    sequenceId: 456,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Shot;

  const mockQueryBuilder = {
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockNotesQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ShotsService,
        {
          provide: getRepositoryToken(Shot),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            manager: {
              createQueryBuilder: jest.fn(() => mockNotesQueryBuilder),
            },
          },
        },
        {
          provide: getRepositoryToken(Sequence),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Version),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Status),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ProjectAccessService,
          useValue: {
            isAdmin: jest.fn().mockReturnValue(false),
            getAccessibleProjectIds: jest.fn().mockResolvedValue([]),
            verifyProjectAccess: jest.fn().mockResolvedValue(undefined),
            verifyShotAccess: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ShotsService>(ShotsService);
    shotRepository = module.get(getRepositoryToken(Shot));
    sequenceRepository = module.get(getRepositoryToken(Sequence));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a shot successfully with sequenceId', async () => {
      const createDto: CreateShotDto = {
        code: 'SH_001',
        name: 'Test Shot',
        sequenceNumber: 1,
        sequenceId: 456,
        statusId: 'status-uuid-123',
      };

      shotRepository.findOne
        .mockResolvedValueOnce(null) // No duplicate check
        .mockResolvedValueOnce(mockShot); // For reload
      sequenceRepository.findOne.mockResolvedValue(mockSequence);
      shotRepository.count.mockResolvedValue(0);
      shotRepository.create.mockReturnValue(mockShot);
      shotRepository.save.mockResolvedValue(mockShot);

      const result = await service.create(createDto, undefined);

      expect(shotRepository.findOne).toHaveBeenCalledWith({
        where: { code: createDto.code },
      });
      expect(sequenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDto.sequenceId },
        relations: ['episode'],
      });
      expect(shotRepository.count).toHaveBeenCalledWith({
        where: { sequenceId: mockSequence.id },
      });
      expect(shotRepository.create).toHaveBeenCalled();
      expect(shotRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ ...mockShot, status: null });
    });

    it('should throw BadRequestException when sequenceCode is provided instead of sequenceId', async () => {
      const createDto: CreateShotDto = {
        code: 'SH_001',
        name: 'Test Shot',
        sequenceNumber: 1,
        sequenceCode: 'SEQ_001',
        statusId: 'status-uuid-123',
      } as any;

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Sequence reference is required (sequenceId)',
      );
    });

    it('should throw ConflictException when code already exists', async () => {
      const createDto: CreateShotDto = {
        code: 'SH_001',
        name: 'Test Shot',
        sequenceNumber: 1,
        sequenceId: 456,
      };

      sequenceRepository.findOne.mockResolvedValue({
        ...mockSequence,
        episode: {
          id: 123,
          projectId: 123,
        },
      });
      shotRepository.findOne.mockResolvedValue(mockShot); // Duplicate exists

      await expect(service.create(createDto, undefined)).rejects.toThrow(ConflictException);
    });

    it('should generate shot code automatically if not provided', async () => {
      const createDto: CreateShotDto = {
        name: 'Test Shot',
        sequenceNumber: 1,
        sequenceId: 456,
      };

      shotRepository.findOne
        .mockResolvedValueOnce(null) // No duplicate check (code not provided, so this won't be called)
        .mockResolvedValueOnce(mockShot); // For reload
      sequenceRepository.findOne.mockResolvedValue(mockSequence);
      shotRepository.count.mockResolvedValue(2);
      shotRepository.create.mockReturnValue(mockShot);
      shotRepository.save.mockResolvedValue(mockShot);

      await service.create(createDto, undefined);

      expect(shotRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'SH003',
        }),
      );
    });

    it('should throw NotFoundException when sequence not found', async () => {
      const createDto: CreateShotDto = {
        code: 'SH_001',
        name: 'Test Shot',
        sequenceNumber: 1,
        sequenceId: 999,
      };

      shotRepository.findOne.mockResolvedValue(null); // No duplicate
      sequenceRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow('Sequence with ID 999 not found');
    });
  });

  describe('findAll', () => {
    it('should return all shots without filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockShot]);
      mockNotesQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findAll({}, undefined);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
      expect(result).toEqual([{ ...mockShot, status: null }]);
    });

    it('should apply status filter', async () => {
      const filters: FilterShotsDto = {
        status: 'in_progress',
      };

      const mockStatusRepository = module.get(getRepositoryToken(Status));
      mockStatusRepository.findOne.mockResolvedValue({
        id: 'status-uuid-123',
        code: 'in_progress',
      });

      mockQueryBuilder.getMany.mockResolvedValue([mockShot]);
      mockNotesQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(filters, undefined);

      expect(mockStatusRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'in_progress' },
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('shot.statusId = :statusId', {
        statusId: 'status-uuid-123',
      });
    });

    it('should apply shotType filter', async () => {
      const filters: FilterShotsDto = {
        shotType: ShotType.CLOSEUP,
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockShot]);
      mockNotesQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('shot.shotType = :shotType', {
        shotType: ShotType.CLOSEUP,
      });
    });

    it('should apply sequenceId filter', async () => {
      const filters: FilterShotsDto = {
        sequenceId: 456,
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockShot]);
      mockNotesQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('shot.sequenceId = :sequenceId', {
        sequenceId: 456,
      });
    });

    it('should apply sequenceCode filter (backward compatibility)', async () => {
      const filters: FilterShotsDto = {
        sequenceCode: 'SEQ_001',
      };

      sequenceRepository.findOne.mockResolvedValue({
        ...mockSequence,
        episode: {
          id: 123,
          projectId: 123,
        },
      });
      mockQueryBuilder.getMany.mockResolvedValue([mockShot]);
      mockNotesQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(filters, undefined);

      expect(sequenceRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'SEQ_001' },
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('shot.sequenceId = :sequenceId', {
        sequenceId: 456,
      });
    });
  });

  describe('findOneById', () => {
    it('should return a shot by id', async () => {
      shotRepository.findOne.mockResolvedValue(mockShot);
      mockNotesQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findOneById(789, undefined);

      expect(shotRepository.findOne).toHaveBeenCalledWith({
        where: { id: 789 },
        relations: ['sequence', 'status'],
      });
      expect(result).toEqual({ ...mockShot, status: null });
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.findOneById(0)).rejects.toThrow(BadRequestException);
      await expect(service.findOneById(-1)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when shot not found', async () => {
      shotRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOneById(999)).rejects.toThrow('Shot with ID 999 not found');
    });
  });

  describe('findOne', () => {
    it('should return a shot by code', async () => {
      shotRepository.findOne.mockResolvedValue(mockShot);
      mockNotesQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findOne('SH_001', undefined);

      expect(shotRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'SH_001' },
        relations: ['sequence', 'status'],
      });
      expect(result).toEqual({ ...mockShot, status: null });
    });

    it('should throw NotFoundException when shot not found', async () => {
      shotRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('SH_999')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('SH_999')).rejects.toThrow('Shot with code SH_999 not found');
    });
  });

  describe('update', () => {
    it('should update a shot successfully', async () => {
      const updateDto: UpdateShotDto = {
        name: 'Updated Shot Name',
        statusId: 'status-uuid-approved',
      };

      const shotWithRelations = {
        ...mockShot,
        sequence: {
          ...mockSequence,
          episode: {
            id: 123,
            projectId: 123,
          },
        },
      };

      const updatedShot = { ...mockShot, ...updateDto };

      shotRepository.findOne
        .mockResolvedValueOnce(shotWithRelations)
        .mockResolvedValueOnce(updatedShot);
      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(updatedShot);
      shotRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(789, updateDto, undefined);

      expect(shotRepository.findOne).toHaveBeenCalledWith({
        where: { id: 789 },
        relations: ['sequence', 'sequence.episode'],
      });
      expect(shotRepository.update).toHaveBeenCalledWith(789, expect.objectContaining(updateDto));
      expect(result).toEqual(updatedShot);
    });

    it('should throw NotFoundException when shot not found', async () => {
      const updateDto: UpdateShotDto = { name: 'Updated Name' };

      shotRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, updateDto, undefined)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating code to duplicate', async () => {
      const updateDto: UpdateShotDto = {
        code: 'SH_DUPLICATE',
      };

      const shotWithRelations = {
        ...mockShot,
        sequence: {
          ...mockSequence,
          episode: {
            id: 123,
            projectId: 123,
          },
        },
      };

      shotRepository.findOne
        .mockResolvedValueOnce(shotWithRelations)
        .mockResolvedValueOnce({
          id: 999,
          code: 'SH_DUPLICATE',
        });
      jest.spyOn(service, 'findOneById').mockResolvedValue(mockShot);

      await expect(service.update(789, updateDto, undefined)).rejects.toThrow(ConflictException);
    });

    it('should validate sequence when sequenceId is updated', async () => {
      const updateDto: UpdateShotDto = {
        sequenceId: 456,
      };

      const shotWithRelations = {
        ...mockShot,
        sequence: {
          ...mockSequence,
          episode: {
            id: 123,
            projectId: 123,
          },
        },
      };

      sequenceRepository.findOne.mockResolvedValue({
        ...mockSequence,
        episode: {
          id: 123,
          projectId: 123,
        },
      });
      shotRepository.findOne
        .mockResolvedValueOnce(shotWithRelations)
        .mockResolvedValueOnce(mockShot);
      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(mockShot);
      shotRepository.update.mockResolvedValue({ affected: 1 });

      await service.update(789, updateDto, undefined);

      expect(shotRepository.findOne).toHaveBeenCalledWith({
        where: { id: 789 },
        relations: ['sequence', 'sequence.episode'],
      });
      expect(sequenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 456 },
        relations: ['episode'],
      });
    });

    it('should validate sequence when sequenceCode is updated (backward compatibility)', async () => {
      const updateDto: UpdateShotDto = {
        sequenceCode: 'SEQ_001',
      };

      const shotWithRelations = {
        ...mockShot,
        sequence: {
          ...mockSequence,
          episode: {
            id: 123,
            projectId: 123,
          },
        },
      };

      sequenceRepository.findOne.mockResolvedValue({
        ...mockSequence,
        episode: {
          id: 123,
          projectId: 123,
        },
      });
      shotRepository.findOne
        .mockResolvedValueOnce(shotWithRelations)
        .mockResolvedValueOnce(mockShot);
      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(mockShot);
      shotRepository.update.mockResolvedValue({ affected: 1 });

      await service.update(789, updateDto, undefined);

      expect(shotRepository.findOne).toHaveBeenCalledWith({
        where: { id: 789 },
        relations: ['sequence', 'sequence.episode'],
      });
      expect(sequenceRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'SEQ_001' },
        relations: ['episode'],
      });
    });

    it('should throw NotFoundException when sequence not found during update', async () => {
      const updateDto: UpdateShotDto = {
        sequenceId: 999,
      };

      sequenceRepository.findOne.mockResolvedValue(null);
      jest.spyOn(service, 'findOneById').mockResolvedValue(mockShot);

      await expect(service.update(789, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a shot successfully', async () => {
      const shotWithRelations = {
        ...mockShot,
        sequence: {
          ...mockSequence,
          episode: {
            id: 123,
            projectId: 123,
          },
        },
      };

      shotRepository.findOne.mockResolvedValue(shotWithRelations);
      shotRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(789, undefined);

      expect(shotRepository.findOne).toHaveBeenCalledWith({
        where: { id: 789 },
        relations: ['sequence', 'sequence.episode'],
      });
      expect(shotRepository.delete).toHaveBeenCalledWith(789);
    });

    it('should throw NotFoundException when shot not found', async () => {
      shotRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999, undefined)).rejects.toThrow(NotFoundException);
      expect(shotRepository.delete).not.toHaveBeenCalled();
    });
  });
});
