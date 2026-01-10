import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SequencesService } from './sequences.service';
import { Sequence, Episode, Version, Shot, Status, ProjectRole } from '../entities';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
import { FilterSequencesDto } from './dto/filter-sequences.dto';
import { ProjectAccessService, UserContext } from '../auth/services/project-access.service';
import { EpisodesService } from '../episodes/episodes.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Integration tests for SequencesService
 *
 * Tests sequence management flows with:
 * - Sequence creation with automatic initial version
 * - Episode duration updates
 * - Access control and permissions
 * - Sequence filtering and search
 * - Sequence updates with permission checks
 * - Sequence deletion with episode duration update
 */
describe('SequencesService Integration Tests', () => {
  let module: TestingModule;
  let sequencesService: SequencesService;
  let sequenceRepository: jest.Mocked<any>;
  let episodeRepository: jest.Mocked<any>;
  let versionRepository: jest.Mocked<any>;
  let statusRepository: jest.Mocked<any>;
  let episodesService: jest.Mocked<EpisodesService>;
  let projectAccessService: jest.Mocked<ProjectAccessService>;

  const mockUserContext: UserContext = {
    userId: 1,
    role: 'member',
  };

  const mockAdminContext: UserContext = {
    userId: 2,
    role: 'admin',
  };

  const mockProject = {
    id: 123,
    code: 'PROJ_001',
    name: 'Test Project',
  };

  const mockEpisode: Episode = {
    id: 3001,
    code: 'EP_001',
    name: 'Episode 1',
    projectId: 123,
    project: mockProject as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Episode;

  const mockStatus: Status = {
    id: 'status-uuid-123',
    code: 'wip',
    name: 'Work In Progress',
    color: '#FFA500',
    isActive: true,
    sortOrder: 0,
    applicableEntities: ['sequence'],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Status;

  const mockVersion: Version = {
    id: 5001,
    code: 'SEQ_001_001',
    name: 'Initial version',
    versionNumber: 1,
    latest: true,
    statusId: 'status-uuid-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Version;

  const mockShot: Shot = {
    id: 1001,
    code: 'SH001',
    name: 'Test Shot',
    sequenceId: 4001,
    sequenceNumber: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Shot;

  const mockSequence: Sequence = {
    id: 4001,
    code: 'SEQ_001',
    name: 'Test Sequence',
    description: 'Test description',
    statusId: 'status-uuid-123',
    status: mockStatus,
    episodeId: 3001,
    episode: mockEpisode,
    cutOrder: 1,
    duration: 120,
    createdBy: 1,
    assignedTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Sequence;

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
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
            createQueryBuilder: jest.fn(() => {
              const qb = {
                leftJoin: jest.fn().mockReturnThis(),
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
              };
              return qb;
            }),
            manager: {
              createQueryBuilder: jest.fn(() => ({
                select: jest.fn().mockReturnThis(),
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
              })),
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
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Status),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: EpisodesService,
          useValue: {
            updateEpisodeDuration: jest.fn(),
          },
        },
        {
          provide: ProjectAccessService,
          useValue: {
            verifyProjectAccess: jest.fn(),
            isAdmin: jest.fn(),
            getAccessibleProjectIds: jest.fn(),
          },
        },
      ],
    }).compile();

    sequencesService = testModule.get<SequencesService>(SequencesService);
    sequenceRepository = testModule.get(getRepositoryToken(Sequence));
    episodeRepository = testModule.get(getRepositoryToken(Episode));
    versionRepository = testModule.get(getRepositoryToken(Version));
    statusRepository = testModule.get(getRepositoryToken(Status));
    episodesService = testModule.get<EpisodesService>(EpisodesService);
    projectAccessService = testModule.get<ProjectAccessService>(ProjectAccessService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Sequence Creation', () => {
    it('should create sequence with automatic initial version', async () => {
      const createDto: CreateSequenceDto = {
        code: 'SEQ_NEW',
        name: 'New Sequence',
        cutOrder: 1,
        episodeId: 3001,
      };

      episodeRepository.findOne.mockResolvedValue(mockEpisode);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      sequenceRepository.findOne.mockResolvedValue(null); // No duplicate
      statusRepository.findOne.mockResolvedValue(mockStatus); // For 'wip' status
      versionRepository.create.mockReturnValue(mockVersion);
      versionRepository.save.mockResolvedValue(mockVersion);
      sequenceRepository.create.mockReturnValue({
        ...mockSequence,
        ...createDto,
      });
      sequenceRepository.save.mockResolvedValue({
        ...mockSequence,
        ...createDto,
        id: 4002,
      });
      episodesService.updateEpisodeDuration.mockResolvedValue(mockEpisode);

      const result = await sequencesService.create(createDto, mockUserContext);

      expect(result).toHaveProperty('code', createDto.code);
      expect(versionRepository.create).toHaveBeenCalled();
      expect(versionRepository.save).toHaveBeenCalled();
      expect(episodesService.updateEpisodeDuration).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent episode', async () => {
      const createDto: CreateSequenceDto = {
        code: 'SEQ_INVALID',
        name: 'Sequence',
        cutOrder: 1,
        episodeId: 9999,
      };

      episodeRepository.findOne.mockResolvedValue(null);

      await expect(sequencesService.create(createDto, mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should prevent duplicate sequence codes', async () => {
      const createDto: CreateSequenceDto = {
        code: 'SEQ_001',
        name: 'Duplicate Sequence',
        cutOrder: 1,
        episodeId: 3001,
      };

      episodeRepository.findOne.mockResolvedValue(mockEpisode);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      sequenceRepository.findOne.mockResolvedValue(mockSequence); // Existing sequence

      await expect(sequencesService.create(createDto, mockUserContext)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should verify user has contributor access', async () => {
      const createDto: CreateSequenceDto = {
        code: 'SEQ_002',
        name: 'Sequence',
        cutOrder: 1,
        episodeId: 3001,
      };

      episodeRepository.findOne.mockResolvedValue(mockEpisode);
      projectAccessService.verifyProjectAccess.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(sequencesService.create(createDto, mockUserContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should update episode duration after creation', async () => {
      const createDto: CreateSequenceDto = {
        code: 'SEQ_DURATION',
        name: 'Sequence',
        cutOrder: 1,
        episodeId: 3001,
        duration: 180,
      };

      episodeRepository.findOne.mockResolvedValue(mockEpisode);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      sequenceRepository.findOne.mockResolvedValue(null);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      versionRepository.create.mockReturnValue(mockVersion);
      versionRepository.save.mockResolvedValue(mockVersion);
      sequenceRepository.create.mockReturnValue({
        ...mockSequence,
        ...createDto,
      });
      sequenceRepository.save.mockResolvedValue({
        ...mockSequence,
        ...createDto,
        id: 4003,
      });
      episodesService.updateEpisodeDuration.mockResolvedValue(mockEpisode);

      await sequencesService.create(createDto, mockUserContext);

      expect(episodesService.updateEpisodeDuration).toHaveBeenCalledWith(3001, mockUserContext);
    });
  });

  describe('Sequence Filtering and Search', () => {
    it('should filter sequences by status', async () => {
      const queryBuilder = sequenceRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockSequence]);
      sequenceRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      sequenceRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);

      const filters: FilterSequencesDto = { status: 'wip' };
      const result = await sequencesService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter sequences by episodeId', async () => {
      const queryBuilder = sequenceRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockSequence]);
      sequenceRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      sequenceRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);

      const filters: FilterSequencesDto = { episodeId: 3001 };
      const result = await sequencesService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter sequences by projectId', async () => {
      const queryBuilder = sequenceRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockSequence]);
      sequenceRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      sequenceRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);

      const filters: FilterSequencesDto = { projectId: 123 };
      const result = await sequencesService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter sequences by cutOrder', async () => {
      const queryBuilder = sequenceRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockSequence]);
      sequenceRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      sequenceRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);

      const filters: FilterSequencesDto = { cutOrder: 1 };
      const result = await sequencesService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter sequences by search term', async () => {
      const queryBuilder = sequenceRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockSequence]);
      sequenceRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      sequenceRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);

      const filters: FilterSequencesDto = { search: 'Test' };
      const result = await sequencesService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should restrict regular user to accessible projects', async () => {
      const queryBuilder = sequenceRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockSequence]);
      sequenceRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      sequenceRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(false);
      projectAccessService.getAccessibleProjectIds = jest.fn().mockResolvedValue([123]);

      const result = await sequencesService.findAll({}, mockUserContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when user has no project access', async () => {
      const queryBuilder = sequenceRepository.createQueryBuilder();
      sequenceRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(false);
      projectAccessService.getAccessibleProjectIds = jest.fn().mockResolvedValue([]);

      const result = await sequencesService.findAll({}, mockUserContext);

      expect(result).toEqual([]);
    });

    it('should load shots and notes for sequences', async () => {
      const queryBuilder = sequenceRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockSequence]);
      sequenceRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      sequenceRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);

      const result = await sequencesService.findAll({}, mockAdminContext);

      expect(sequenceRepository.manager.createQueryBuilder).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Sequence Retrieval', () => {
    it('should find sequence by ID', async () => {
      sequenceRepository.findOne.mockResolvedValue({
        ...mockSequence,
        episode: mockEpisode,
        status: mockStatus,
      });
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      sequenceRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);

      const result = await sequencesService.findOneById(4001, mockUserContext);

      expect(result).toHaveProperty('id', 4001);
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(sequencesService.findOneById(-1, mockUserContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for non-existent sequence', async () => {
      sequenceRepository.findOne.mockResolvedValue(null);

      await expect(sequencesService.findOneById(9999, mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should find sequence by code', async () => {
      sequenceRepository.findOne.mockResolvedValue({
        ...mockSequence,
        episode: mockEpisode,
        status: mockStatus,
      });
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      sequenceRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);

      const result = await sequencesService.findOne('SEQ_001', mockUserContext);

      expect(result).toHaveProperty('code', 'SEQ_001');
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent code', async () => {
      sequenceRepository.findOne.mockResolvedValue(null);

      await expect(sequencesService.findOne('NON_EXISTENT', mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should load shots and notes for sequence', async () => {
      sequenceRepository.findOne.mockResolvedValue({
        ...mockSequence,
        episode: mockEpisode,
        status: mockStatus,
      });
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      sequenceRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);

      const result = await sequencesService.findOneById(4001, mockUserContext);

      expect(sequenceRepository.manager.createQueryBuilder).toHaveBeenCalled();
      expect(result.shots).toBeDefined();
    });
  });

  describe('Sequence Updates', () => {
    it('should update sequence information', async () => {
      const updateDto: UpdateSequenceDto = {
        name: 'Updated Sequence Name',
        description: 'Updated description',
      };

      sequenceRepository.findOne
        .mockResolvedValueOnce({
          ...mockSequence,
          episode: mockEpisode,
        }) // First call in update
        .mockResolvedValueOnce({
          ...mockSequence,
          ...updateDto,
          episode: mockEpisode,
          status: mockStatus,
        }); // Second call in findOneById
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      sequenceRepository.update.mockResolvedValue({ affected: 1 });
      sequenceRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      episodesService.updateEpisodeDuration.mockResolvedValue(mockEpisode);

      const result = await sequencesService.update(4001, updateDto, mockUserContext);

      expect(result.name).toBe(updateDto.name);
      expect(episodesService.updateEpisodeDuration).toHaveBeenCalled();
    });

    it('should prevent duplicate code on update', async () => {
      const updateDto: UpdateSequenceDto = {
        code: 'SEQ_DUPLICATE',
      };

      sequenceRepository.findOne
        .mockResolvedValueOnce({
          ...mockSequence,
          episode: mockEpisode,
        }) // First call in update
        .mockResolvedValueOnce({
          ...mockSequence,
          id: 9999,
          code: 'SEQ_DUPLICATE',
        }); // Second call to check duplicate

      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);

      await expect(sequencesService.update(4001, updateDto, mockUserContext)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow updating to same code', async () => {
      const updateDto: UpdateSequenceDto = {
        code: 'SEQ_001', // Same as existing
        name: 'Updated Name',
      };

      sequenceRepository.findOne
        .mockResolvedValueOnce({
          ...mockSequence,
          episode: mockEpisode,
        }) // First call in update
        .mockResolvedValueOnce({
          ...mockSequence,
          code: 'SEQ_001',
        }) // Second call to check duplicate (same ID)
        .mockResolvedValueOnce({
          ...mockSequence,
          ...updateDto,
          episode: mockEpisode,
          status: mockStatus,
        }); // Third call in findOneById
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      sequenceRepository.update.mockResolvedValue({ affected: 1 });
      sequenceRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      episodesService.updateEpisodeDuration.mockResolvedValue(mockEpisode);

      const result = await sequencesService.update(4001, updateDto, mockUserContext);

      expect(result.name).toBe(updateDto.name);
    });

    it('should update sequence episode', async () => {
      const newEpisode: Episode = {
        ...mockEpisode,
        id: 3002,
        code: 'EP_002',
      };
      const updateDto: UpdateSequenceDto = {
        episodeId: 3002,
      };

      sequenceRepository.findOne
        .mockResolvedValueOnce({
          ...mockSequence,
          episode: mockEpisode,
        }) // First call in update
        .mockResolvedValueOnce({
          ...mockSequence,
          episodeId: 3002,
          episode: newEpisode,
          status: mockStatus,
        }); // Second call in findOneById
      episodeRepository.findOne.mockResolvedValue(newEpisode);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      sequenceRepository.update.mockResolvedValue({ affected: 1 });
      sequenceRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      episodesService.updateEpisodeDuration.mockResolvedValue(mockEpisode);

      const result = await sequencesService.update(4001, updateDto, mockUserContext);

      expect(episodeRepository.findOne).toHaveBeenCalled();
      expect(episodesService.updateEpisodeDuration).toHaveBeenCalledTimes(2); // Old and new episode
    });

    it('should throw NotFoundException for non-existent sequence', async () => {
      sequenceRepository.findOne.mockResolvedValue(null);

      await expect(sequencesService.update(9999, { name: 'Updated' }, mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Sequence Deletion', () => {
    it('should delete sequence with contributor access', async () => {
      sequenceRepository.findOne.mockResolvedValue({
        ...mockSequence,
        episode: mockEpisode,
      });
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      sequenceRepository.delete.mockResolvedValue({ affected: 1 });
      episodesService.updateEpisodeDuration.mockResolvedValue(mockEpisode);

      await sequencesService.remove(4001, mockUserContext);

      expect(sequenceRepository.delete).toHaveBeenCalledWith(4001);
      expect(episodesService.updateEpisodeDuration).toHaveBeenCalledWith(3001, mockUserContext);
    });

    it('should throw NotFoundException for non-existent sequence', async () => {
      sequenceRepository.findOne.mockResolvedValue(null);

      await expect(sequencesService.remove(9999, mockUserContext)).rejects.toThrow(NotFoundException);
    });

    it('should verify user has contributor access before deletion', async () => {
      sequenceRepository.findOne.mockResolvedValue({
        ...mockSequence,
        episode: mockEpisode,
      });
      projectAccessService.verifyProjectAccess.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(sequencesService.remove(4001, mockUserContext)).rejects.toThrow(ForbiddenException);
    });

    it('should update episode duration after deletion', async () => {
      sequenceRepository.findOne.mockResolvedValue({
        ...mockSequence,
        episode: mockEpisode,
      });
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      sequenceRepository.delete.mockResolvedValue({ affected: 1 });
      episodesService.updateEpisodeDuration.mockResolvedValue(mockEpisode);

      await sequencesService.remove(4001, mockUserContext);

      expect(episodesService.updateEpisodeDuration).toHaveBeenCalledWith(3001, mockUserContext);
    });
  });
});





