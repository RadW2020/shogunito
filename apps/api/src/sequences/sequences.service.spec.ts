import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SequencesService } from './sequences.service';
import { Sequence } from '../entities/sequence.entity';
import { Episode } from '../entities/episode.entity';
import { Version } from '../entities/version.entity';
import { Shot } from '../entities/shot.entity';
import { Status } from '../entities/status.entity';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
import { FilterSequencesDto } from './dto/filter-sequences.dto';
import { EpisodesService } from '../episodes/episodes.service';
import { VersionStatus } from '../entities/version.entity';
import { ProjectAccessService } from '../auth/services/project-access.service';

describe('SequencesService', () => {
  let service: SequencesService;
  let sequenceRepository: any;
  let episodeRepository: any;
  let versionRepository: any;
  let episodesService: EpisodesService;
  let module: TestingModule;

  const mockEpisode: Episode = {
    id: 123,
    code: 'EP_001',
    name: 'Test Episode',
  } as Episode;

  const mockSequence: Sequence = {
    id: 456,
    code: 'SEQ_001',
    name: 'Test Sequence',
    description: 'Test description',
    statusId: 'status-uuid-in-progress',
    cutOrder: 1,
    duration: 300,
    episodeId: 123,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Sequence;

  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
  };

  const mockNotesQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  // Create a chainable mock query builder for shots
  const createShotsQueryBuilder = () => {
    const builder = {
      where: jest.fn(),
      orderBy: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    builder.where.mockReturnValue(builder);
    builder.orderBy.mockReturnValue(builder);
    return builder;
  };

  // Create a chainable mock query builder for notes
  const createNotesQueryBuilder = () => {
    const builder = {
      select: jest.fn(),
      from: jest.fn(),
      where: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    builder.select.mockReturnValue(builder);
    builder.from.mockReturnValue(builder);
    builder.where.mockReturnValue(builder);
    return builder;
  };

  // Mock for manager.createQueryBuilder that returns a chainable query builder
  const createManagerQueryBuilderMock = jest.fn((entity: any, alias?: string) => {
    if (entity === 'Shot' || entity?.name === 'Shot') {
      return createShotsQueryBuilder();
    }
    // For Note queries
    return createNotesQueryBuilder();
  });

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        SequencesService,
        {
          provide: getRepositoryToken(Sequence),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            manager: {
              createQueryBuilder: createManagerQueryBuilderMock,
            },
          },
        },
        {
          provide: getRepositoryToken(Episode),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Version),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: EpisodesService,
          useValue: {
            updateEpisodeDuration: jest.fn(),
          },
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
            verifySequenceAccess: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<SequencesService>(SequencesService);
    sequenceRepository = module.get(getRepositoryToken(Sequence));
    episodeRepository = module.get(getRepositoryToken(Episode));
    versionRepository = module.get(getRepositoryToken(Version));
    episodesService = module.get<EpisodesService>(EpisodesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a sequence successfully', async () => {
      const createDto: CreateSequenceDto = {
        code: 'SEQ_001',
        name: 'Test Sequence',
        cutOrder: 1,
        episodeId: 123,
        statusId: 'status-uuid-in-progress',
      };

      const mockVersion = {
        id: 'version-123',
        code: 'SEQ_001_001',
        versionNumber: 1,
      };

      sequenceRepository.findOne.mockResolvedValue(null); // No duplicate
      episodeRepository.findOne.mockResolvedValue(mockEpisode);
      versionRepository.create.mockReturnValue(mockVersion);
      versionRepository.save.mockResolvedValue(mockVersion);
      sequenceRepository.create.mockReturnValue(mockSequence);
      sequenceRepository.save.mockResolvedValue(mockSequence);
      jest.spyOn(episodesService, 'updateEpisodeDuration').mockResolvedValue(mockEpisode as any);

      const result = await service.create(createDto, undefined);

      expect(sequenceRepository.findOne).toHaveBeenCalledWith({
        where: { code: createDto.code },
      });
      expect(episodeRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDto.episodeId },
      });
      expect(versionRepository.create).toHaveBeenCalled();
      expect(versionRepository.save).toHaveBeenCalled();
      expect(sequenceRepository.create).toHaveBeenCalled();
      expect(sequenceRepository.save).toHaveBeenCalled();
      expect(episodesService.updateEpisodeDuration).toHaveBeenCalledWith(mockEpisode.id, undefined);
      expect(result).toEqual({ ...mockSequence, status: null });
    });

    it('should throw ConflictException when code already exists', async () => {
      const createDto: CreateSequenceDto = {
        code: 'SEQ_001',
        name: 'Test Sequence',
        cutOrder: 1,
        episodeId: 123,
      };

      episodeRepository.findOne.mockResolvedValue(mockEpisode);
      sequenceRepository.findOne.mockResolvedValue(mockSequence); // Duplicate exists

      await expect(service.create(createDto, undefined)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when episode not found', async () => {
      const createDto: CreateSequenceDto = {
        code: 'SEQ_001',
        name: 'Test Sequence',
        cutOrder: 1,
        episodeId: 999,
      };

      sequenceRepository.findOne.mockResolvedValue(null); // No duplicate
      episodeRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, undefined)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto, undefined)).rejects.toThrow('Episode with ID 999 not found');
    });
  });

  describe('findAll', () => {
    it('should return all sequences without filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockSequence]);

      const result = await service.findAll({}, undefined);

      expect(mockQueryBuilder.leftJoin).toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should apply status filter', async () => {
      const filters: FilterSequencesDto = {
        status: 'in_progress',
      };

      const mockStatusRepository = module.get(getRepositoryToken(Status));
      mockStatusRepository.findOne.mockResolvedValue({
        id: 'status-uuid-123',
        code: 'in_progress',
      });

      mockQueryBuilder.getMany.mockResolvedValue([mockSequence]);

      await service.findAll(filters, undefined);

      expect(mockStatusRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'in_progress' },
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('sequence.statusId = :statusId', {
        statusId: 'status-uuid-123',
      });
    });

    it('should apply episodeId filter', async () => {
      const filters: FilterSequencesDto = {
        episodeId: 123,
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockSequence]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('sequence.episodeId = :episodeId', {
        episodeId: 123,
      });
    });

    it('should ignore episodeCode filter (no longer supported)', async () => {
      const filters: FilterSequencesDto = {
        episodeCode: 'EP_001',
      } as any;

      mockQueryBuilder.getMany.mockResolvedValue([mockSequence]);

      await service.findAll(filters, undefined);

      // episodeCode is ignored, no filter should be applied
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('episodeCode'),
        expect.anything(),
      );
    });

    it('should ignore projectCode filter (no longer supported)', async () => {
      const filters: FilterSequencesDto = {
        projectCode: 'PROJ_001',
      } as any;

      mockQueryBuilder.getMany.mockResolvedValue([mockSequence]);

      await service.findAll(filters, undefined);

      // projectCode is ignored, no filter should be applied
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('projectCode'),
        expect.anything(),
      );
    });

    it('should apply cutOrder filter', async () => {
      const filters: FilterSequencesDto = {
        cutOrder: 1,
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockSequence]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('sequence.cutOrder = :cutOrder', {
        cutOrder: 1,
      });
    });

    it('should apply createdBy filter', async () => {
      const filters: FilterSequencesDto = {
        createdBy: 123,
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockSequence]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('sequence.createdBy = :createdBy', {
        createdBy: 123,
      });
    });

    it('should apply assignedTo filter', async () => {
      const filters: FilterSequencesDto = {
        assignedTo: 123,
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockSequence]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('sequence.assignedTo = :assignedTo', {
        assignedTo: 123,
      });
    });

    it('should apply search filter', async () => {
      const filters: FilterSequencesDto = {
        search: 'test',
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockSequence]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('sequence.name ILIKE :search', {
        search: '%test%',
      });
    });

    it('should apply pagination', async () => {
      const filters: FilterSequencesDto = {
        page: 2,
        limit: 10,
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockSequence]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('findOneById', () => {
    it('should return a sequence by id', async () => {
      sequenceRepository.findOne.mockResolvedValue(mockSequence);

      const result = await service.findOneById(456, undefined);

      expect(sequenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 456 },
        relations: ['episode', 'status'],
      });
      expect(result).toBeDefined();
      expect((result as any).shots).toBeDefined();
      expect((result as any).notes).toBeDefined();
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.findOneById(0, undefined)).rejects.toThrow(BadRequestException);
      await expect(service.findOneById(-1, undefined)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when sequence not found', async () => {
      sequenceRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneById(999, undefined)).rejects.toThrow(NotFoundException);
      await expect(service.findOneById(999, undefined)).rejects.toThrow('Sequence with ID 999 not found');
    });
  });

  describe('findOne', () => {
    it('should return a sequence by code', async () => {
      sequenceRepository.findOne.mockResolvedValue(mockSequence);

      const result = await service.findOne('SEQ_001', undefined);

      expect(sequenceRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'SEQ_001' },
        relations: ['episode', 'status'],
      });
      expect(result).toBeDefined();
      expect((result as any).shots).toBeDefined();
      expect((result as any).notes).toBeDefined();
    });

    it('should throw NotFoundException when sequence not found', async () => {
      sequenceRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('SEQ_999', undefined)).rejects.toThrow(NotFoundException);
      await expect(service.findOne('SEQ_999', undefined)).rejects.toThrow(
        'Sequence with code SEQ_999 not found',
      );
    });
  });

  describe('update', () => {
    it('should update a sequence successfully', async () => {
      const updateDto: UpdateSequenceDto = {
        name: 'Updated Sequence Name',
        statusId: 'status-uuid-approved',
      };

      const sequenceWithEpisode = {
        ...mockSequence,
        episode: mockEpisode,
      };

      const updatedSequence = { ...mockSequence, ...updateDto };

      sequenceRepository.findOne
        .mockResolvedValueOnce(sequenceWithEpisode)
        .mockResolvedValueOnce(updatedSequence);
      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(updatedSequence as any);
      sequenceRepository.update.mockResolvedValue({ affected: 1 });
      jest.spyOn(episodesService, 'updateEpisodeDuration').mockResolvedValue(mockEpisode as any);

      const result = await service.update(456, updateDto, undefined);

      expect(sequenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 456 },
        relations: ['episode'],
      });
      expect(sequenceRepository.update).toHaveBeenCalled();
      expect(episodesService.updateEpisodeDuration).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when sequence not found', async () => {
      const updateDto: UpdateSequenceDto = { name: 'Updated Name' };

      sequenceRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, updateDto, undefined)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating code to duplicate', async () => {
      const updateDto: UpdateSequenceDto = {
        code: 'SEQ_DUPLICATE',
      };

      const sequenceWithEpisode = {
        ...mockSequence,
        episode: mockEpisode,
      };

      sequenceRepository.findOne
        .mockResolvedValueOnce(sequenceWithEpisode)
        .mockResolvedValueOnce({
          id: 999,
          code: 'SEQ_DUPLICATE',
        });
      jest.spyOn(service, 'findOneById').mockResolvedValue(mockSequence as any);

      await expect(service.update(456, updateDto, undefined)).rejects.toThrow(ConflictException);
    });

    it('should validate episode when episodeId is updated', async () => {
      const updateDto: UpdateSequenceDto = {
        episodeId: 123,
      };

      const sequenceWithEpisode = {
        ...mockSequence,
        episode: mockEpisode,
      };

      episodeRepository.findOne.mockResolvedValue(mockEpisode);
      sequenceRepository.findOne
        .mockResolvedValueOnce(sequenceWithEpisode)
        .mockResolvedValueOnce(mockSequence);
      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(mockSequence as any);
      sequenceRepository.update.mockResolvedValue({ affected: 1 });
      jest.spyOn(episodesService, 'updateEpisodeDuration').mockResolvedValue(mockEpisode as any);

      await service.update(456, updateDto, undefined);

      expect(sequenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 456 },
        relations: ['episode'],
      });
      expect(episodeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 123 },
      });
    });
  });

  describe('remove', () => {
    it('should delete a sequence successfully', async () => {
      const sequenceWithEpisode = {
        ...mockSequence,
        episode: mockEpisode,
      };

      sequenceRepository.findOne.mockResolvedValue(sequenceWithEpisode);
      sequenceRepository.delete.mockResolvedValue({ affected: 1 });
      jest.spyOn(episodesService, 'updateEpisodeDuration').mockResolvedValue(mockEpisode as any);

      await service.remove(456, undefined);

      expect(sequenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 456 },
        relations: ['episode'],
      });
      expect(sequenceRepository.delete).toHaveBeenCalledWith(456);
      expect(episodesService.updateEpisodeDuration).toHaveBeenCalledWith(mockEpisode.id, undefined);
    });

    it('should throw NotFoundException when sequence not found', async () => {
      jest
        .spyOn(service, 'findOneById')
        .mockRejectedValue(new NotFoundException('Sequence with ID 999 not found'));

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(sequenceRepository.delete).not.toHaveBeenCalled();
    });
  });
});
