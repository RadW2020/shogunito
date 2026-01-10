import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EpisodesService } from './episodes.service';
import { Episode, Project, Sequence, Shot, Status, ProjectRole } from '../entities';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { UpdateEpisodeDto } from './dto/update-episode.dto';
import { FilterEpisodesDto } from './dto/filter-episodes.dto';
import { ProjectAccessService, UserContext } from '../auth/services/project-access.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Integration tests for EpisodesService
 *
 * Tests episode management flows with:
 * - Episode creation with project validation
 * - Access control and permissions
 * - Episode filtering and search
 * - Episode updates with permission checks
 * - Duration calculation from sequences
 * - Episode deletion
 */
describe('EpisodesService Integration Tests', () => {
  let module: TestingModule;
  let episodesService: EpisodesService;
  let episodeRepository: jest.Mocked<any>;
  let projectRepository: jest.Mocked<any>;
  let sequenceRepository: jest.Mocked<any>;
  let statusRepository: jest.Mocked<any>;
  let projectAccessService: jest.Mocked<ProjectAccessService>;

  const mockUserContext: UserContext = {
    userId: 1,
    role: 'member',
  };

  const mockAdminContext: UserContext = {
    userId: 2,
    role: 'admin',
  };

  const mockProject: Project = {
    id: 123,
    code: 'PROJ_001',
    name: 'Test Project',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Project;

  const mockStatus: Status = {
    id: 'status-uuid-123',
    code: 'wip',
    name: 'Work In Progress',
    color: '#FFA500',
    isActive: true,
    sortOrder: 0,
    applicableEntities: ['episode'],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Status;

  const mockSequence: Sequence = {
    id: 789,
    code: 'SEQ_001',
    name: 'Sequence 1',
    episodeId: 3001,
    duration: 120,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Sequence;

  const mockShot: Shot = {
    id: 1001,
    code: 'SH001',
    name: 'Test Shot',
    sequenceId: 789,
    sequenceNumber: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Shot;

  const mockEpisode: Episode = {
    id: 3001,
    code: 'EP_001',
    name: 'Test Episode',
    description: 'Test description',
    statusId: 'status-uuid-123',
    status: mockStatus,
    projectId: 123,
    epNumber: 1,
    cutOrder: 1,
    duration: 120,
    createdBy: 1,
    assignedTo: null,
    sequences: [mockSequence],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Episode;

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      providers: [
        EpisodesService,
        {
          provide: getRepositoryToken(Episode),
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
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
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
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Sequence),
          useValue: {
            find: jest.fn(),
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
          provide: ProjectAccessService,
          useValue: {
            verifyProjectAccess: jest.fn(),
            isAdmin: jest.fn(),
            getAccessibleProjectIds: jest.fn(),
          },
        },
      ],
    }).compile();

    episodesService = testModule.get<EpisodesService>(EpisodesService);
    episodeRepository = testModule.get(getRepositoryToken(Episode));
    projectRepository = testModule.get(getRepositoryToken(Project));
    sequenceRepository = testModule.get(getRepositoryToken(Sequence));
    statusRepository = testModule.get(getRepositoryToken(Status));
    projectAccessService = testModule.get<ProjectAccessService>(ProjectAccessService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Episode Creation', () => {
    it('should create episode with valid data', async () => {
      const createDto: CreateEpisodeDto = {
        code: 'EP_NEW',
        name: 'New Episode',
        cutOrder: 1,
        projectId: 123,
      };

      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      episodeRepository.findOne.mockResolvedValue(null); // No duplicate
      projectRepository.findOne.mockResolvedValue(mockProject);
      episodeRepository.create.mockReturnValue({
        ...mockEpisode,
        ...createDto,
      });
      episodeRepository.save.mockResolvedValue({
        ...mockEpisode,
        ...createDto,
        id: 3002,
      });

      const result = await episodesService.create(createDto, mockUserContext);

      expect(result).toHaveProperty('code', createDto.code);
      expect(result).toHaveProperty('name', createDto.name);
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should prevent duplicate episode codes', async () => {
      const createDto: CreateEpisodeDto = {
        code: 'EP_001',
        name: 'Duplicate Episode',
        cutOrder: 1,
        projectId: 123,
      };

      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      episodeRepository.findOne.mockResolvedValue(mockEpisode); // Existing episode

      await expect(episodesService.create(createDto, mockUserContext)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException for non-existent project', async () => {
      const createDto: CreateEpisodeDto = {
        code: 'EP_INVALID',
        name: 'Episode',
        cutOrder: 1,
        projectId: 999,
      };

      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      episodeRepository.findOne.mockResolvedValue(null);
      projectRepository.findOne.mockResolvedValue(null);

      await expect(episodesService.create(createDto, mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should verify user has contributor access', async () => {
      const createDto: CreateEpisodeDto = {
        code: 'EP_002',
        name: 'Episode',
        cutOrder: 1,
        projectId: 123,
      };

      projectAccessService.verifyProjectAccess.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(episodesService.create(createDto, mockUserContext)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Episode Filtering and Search', () => {
    it('should filter episodes by statusId', async () => {
      const queryBuilder = episodeRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockEpisode]);
      episodeRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      episodeRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);

      const filters: FilterEpisodesDto = { statusId: 'status-uuid-123' };
      const result = await episodesService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter episodes by projectId', async () => {
      const queryBuilder = episodeRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockEpisode]);
      episodeRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      episodeRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);

      const filters: FilterEpisodesDto = { projectId: 123 };
      const result = await episodesService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter episodes by createdBy', async () => {
      const queryBuilder = episodeRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockEpisode]);
      episodeRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      episodeRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);

      const filters: FilterEpisodesDto = { createdBy: 1 };
      const result = await episodesService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter episodes by assignedTo', async () => {
      const queryBuilder = episodeRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockEpisode]);
      episodeRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      episodeRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);

      const filters: FilterEpisodesDto = { assignedTo: 2 };
      const result = await episodesService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should restrict regular user to accessible projects', async () => {
      const queryBuilder = episodeRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockEpisode]);
      episodeRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      episodeRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(false);
      projectAccessService.getAccessibleProjectIds = jest.fn().mockResolvedValue([123]);

      const result = await episodesService.findAll({}, mockUserContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when user has no project access', async () => {
      const queryBuilder = episodeRepository.createQueryBuilder();
      episodeRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(false);
      projectAccessService.getAccessibleProjectIds = jest.fn().mockResolvedValue([]);

      const result = await episodesService.findAll({}, mockUserContext);

      expect(result).toEqual([]);
    });

    it('should load notes for episodes, sequences, and shots', async () => {
      const queryBuilder = episodeRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockEpisode]);
      episodeRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      episodeRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);

      const result = await episodesService.findAll({}, mockAdminContext);

      expect(episodeRepository.manager.createQueryBuilder).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Episode Retrieval', () => {
    it('should find episode by ID', async () => {
      episodeRepository.findOne.mockResolvedValue({
        ...mockEpisode,
        sequences: [mockSequence],
      });
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      episodeRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);

      const result = await episodesService.findOneById(3001, mockUserContext);

      expect(result).toHaveProperty('id', 3001);
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(episodesService.findOneById(-1, mockUserContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for non-existent episode', async () => {
      episodeRepository.findOne.mockResolvedValue(null);

      await expect(episodesService.findOneById(9999, mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should find episode by code', async () => {
      episodeRepository.findOne.mockResolvedValue({
        ...mockEpisode,
        sequences: [mockSequence],
      });
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      episodeRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);

      const result = await episodesService.findOne('EP_001', mockUserContext);

      expect(result).toHaveProperty('code', 'EP_001');
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent code', async () => {
      episodeRepository.findOne.mockResolvedValue(null);

      await expect(episodesService.findOne('NON_EXISTENT', mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should load sequences and shots for episode', async () => {
      episodeRepository.findOne.mockResolvedValue({
        ...mockEpisode,
        sequences: [mockSequence],
      });
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      episodeRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);

      const result = await episodesService.findOneById(3001, mockUserContext);

      expect(result.sequences).toBeDefined();
      expect(episodeRepository.manager.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('Episode Updates', () => {
    it('should update episode information', async () => {
      const updateDto: UpdateEpisodeDto = {
        name: 'Updated Episode Name',
        description: 'Updated description',
      };

      episodeRepository.findOne
        .mockResolvedValueOnce(mockEpisode) // First call in update
        .mockResolvedValueOnce({
          ...mockEpisode,
          ...updateDto,
          sequences: [],
        }); // Second call in findOneById
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      episodeRepository.update.mockResolvedValue({ affected: 1 });
      episodeRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);

      const result = await episodesService.update(3001, updateDto, mockUserContext);

      expect(result.name).toBe(updateDto.name);
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should prevent duplicate code on update', async () => {
      const updateDto: UpdateEpisodeDto = {
        code: 'EP_DUPLICATE',
      };

      episodeRepository.findOne
        .mockResolvedValueOnce(mockEpisode) // First call in update
        .mockResolvedValueOnce({
          ...mockEpisode,
          id: 9999,
          code: 'EP_DUPLICATE',
        }); // Second call to check duplicate

      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);

      await expect(episodesService.update(3001, updateDto, mockUserContext)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow updating to same code', async () => {
      const updateDto: UpdateEpisodeDto = {
        code: 'EP_001', // Same as existing
        name: 'Updated Name',
      };

      episodeRepository.findOne
        .mockResolvedValueOnce(mockEpisode) // First call in update
        .mockResolvedValueOnce({
          ...mockEpisode,
          code: 'EP_001',
        }) // Second call to check duplicate (same ID)
        .mockResolvedValueOnce({
          ...mockEpisode,
          ...updateDto,
          sequences: [],
        }); // Third call in findOneById
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      episodeRepository.update.mockResolvedValue({ affected: 1 });
      episodeRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);

      const result = await episodesService.update(3001, updateDto, mockUserContext);

      expect(result.name).toBe(updateDto.name);
    });

    it('should update episode project', async () => {
      const newProject: Project = {
        ...mockProject,
        id: 456,
        code: 'PROJ_002',
      };
      const updateDto: UpdateEpisodeDto = {
        projectId: 456,
      };

      episodeRepository.findOne
        .mockResolvedValueOnce(mockEpisode) // First call in update
        .mockResolvedValueOnce({
          ...mockEpisode,
          projectId: 456,
          sequences: [],
        }); // Second call in findOneById
      projectRepository.findOne.mockResolvedValue(newProject);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      episodeRepository.update.mockResolvedValue({ affected: 1 });
      episodeRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);

      const result = await episodesService.update(3001, updateDto, mockUserContext);

      expect(projectRepository.findOne).toHaveBeenCalled();
      // verifyProjectAccess is called: once for old project in update, once for new project in update, once in findOneById
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent episode', async () => {
      episodeRepository.findOne.mockResolvedValue(null);

      await expect(episodesService.update(9999, { name: 'Updated' }, mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Episode Duration Calculation', () => {
    it('should calculate duration from sequences', async () => {
      const sequences = [
        { ...mockSequence, id: 1, duration: 60 },
        { ...mockSequence, id: 2, duration: 90 },
        { ...mockSequence, id: 3, duration: 30 },
      ];

      const updatedEpisode = {
        ...mockEpisode,
        duration: 180,
        sequences: [],
      };

      episodeRepository.findOne
        .mockResolvedValueOnce(updatedEpisode) // First call in findOneById (after update)
        .mockResolvedValueOnce(updatedEpisode); // Second call in findOneById (return)
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      sequenceRepository.find.mockResolvedValue(sequences);
      episodeRepository.update.mockResolvedValue({ affected: 1 });
      episodeRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);

      const result = await episodesService.updateEpisodeDuration(3001, mockUserContext);

      expect(result.duration).toBe(180); // 60 + 90 + 30
      expect(sequenceRepository.find).toHaveBeenCalled();
      expect(episodeRepository.update).toHaveBeenCalledWith(3001, { duration: 180 });
    });

    it('should handle sequences with null duration', async () => {
      const sequences = [
        { ...mockSequence, id: 1, duration: 60 },
        { ...mockSequence, id: 2, duration: null },
        { ...mockSequence, id: 3, duration: 30 },
      ];

      const updatedEpisode = {
        ...mockEpisode,
        duration: 90,
        sequences: [],
      };

      episodeRepository.findOne
        .mockResolvedValueOnce(updatedEpisode) // First call in findOneById (after update)
        .mockResolvedValueOnce(updatedEpisode); // Second call in findOneById (return)
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      sequenceRepository.find.mockResolvedValue(sequences);
      episodeRepository.update.mockResolvedValue({ affected: 1 });
      episodeRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);

      const result = await episodesService.updateEpisodeDuration(3001, mockUserContext);

      expect(result.duration).toBe(90); // 60 + 0 + 30
      expect(episodeRepository.update).toHaveBeenCalledWith(3001, { duration: 90 });
    });

    it('should return episode with calculated duration', async () => {
      const sequences = [
        { ...mockSequence, id: 1, duration: 120 },
      ];

      episodeRepository.findOne
        .mockResolvedValueOnce(mockEpisode) // First call in findOneById (updateEpisodeDuration)
        .mockResolvedValueOnce({
          ...mockEpisode,
          duration: 120,
          sequences: [],
        }) // Second call after update
        .mockResolvedValueOnce({
          ...mockEpisode,
          duration: 120,
          sequences: [],
        }); // Third call in findOneById (findOneWithCalculatedDuration)
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      sequenceRepository.find.mockResolvedValue(sequences);
      episodeRepository.update.mockResolvedValue({ affected: 1 });
      episodeRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);

      const result = await episodesService.findOneWithCalculatedDuration(3001, mockUserContext);

      expect(result.duration).toBe(120);
      expect(episodeRepository.update).toHaveBeenCalled();
    });
  });

  describe('Episode Deletion', () => {
    it('should delete episode with contributor access', async () => {
      episodeRepository.findOne.mockResolvedValue(mockEpisode);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      episodeRepository.delete.mockResolvedValue({ affected: 1 });

      await episodesService.remove(3001, mockUserContext);

      expect(episodeRepository.delete).toHaveBeenCalledWith(3001);
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent episode', async () => {
      episodeRepository.findOne.mockResolvedValue(null);

      await expect(episodesService.remove(9999, mockUserContext)).rejects.toThrow(NotFoundException);
    });

    it('should verify user has contributor access before deletion', async () => {
      episodeRepository.findOne.mockResolvedValue(mockEpisode);
      projectAccessService.verifyProjectAccess.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(episodesService.remove(3001, mockUserContext)).rejects.toThrow(ForbiddenException);
    });
  });
});

