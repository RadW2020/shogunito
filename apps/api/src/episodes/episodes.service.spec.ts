import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EpisodesService } from './episodes.service';
import { Episode } from '../entities/episode.entity';
import { Project } from '../entities/project.entity';
import { Sequence } from '../entities/sequence.entity';
import { Shot } from '../entities/shot.entity';
import { Status } from '../entities/status.entity';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { UpdateEpisodeDto } from './dto/update-episode.dto';
import { FilterEpisodesDto } from './dto/filter-episodes.dto';
import { ProjectAccessService } from '../auth/services/project-access.service';

describe('EpisodesService', () => {
  let service: EpisodesService;
  let episodeRepository: any;
  let projectRepository: any;
  let sequenceRepository: any;
  let module: TestingModule;

  const mockProject: Project = {
    id: 123,
    code: 'PROJ_001',
    name: 'Test Project',
  } as Project;

  const mockEpisode: Episode = {
    id: 456,
    code: 'EP_001',
    name: 'Test Episode',
    description: 'Test description',
    statusId: 'status-uuid-in-progress',
    duration: 1440,
    epNumber: 1,
    cutOrder: 1,
    projectId: 123,
    sequences: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    project: mockProject,
  } as Episode;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
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
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            manager: {
              createQueryBuilder: jest.fn(() => mockQueryBuilder),
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
            verifyEpisodeAccess: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<EpisodesService>(EpisodesService);
    episodeRepository = module.get(getRepositoryToken(Episode));
    projectRepository = module.get(getRepositoryToken(Project));
    sequenceRepository = module.get(getRepositoryToken(Sequence));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an episode successfully', async () => {
      const createDto: CreateEpisodeDto = {
        code: 'EP_001',
        name: 'Test Episode',
        projectId: 123,
        cutOrder: 1,
        statusId: 'status-uuid-123',
      };

      projectRepository.findOne.mockResolvedValue(mockProject);
      episodeRepository.create.mockReturnValue(mockEpisode);
      episodeRepository.save.mockResolvedValue(mockEpisode);

      const result = await service.create(createDto, undefined);

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDto.projectId },
      });
      expect(episodeRepository.create).toHaveBeenCalled();
      expect(episodeRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockEpisode);
    });

    it('should throw NotFoundException when project not found', async () => {
      const createDto: CreateEpisodeDto = {
        code: 'EP_001',
        name: 'Test Episode',
        projectId: 999,
        cutOrder: 1,
      };

      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, undefined)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto, undefined)).rejects.toThrow('Project with ID 999 not found');
    });
  });

  describe('findAll', () => {
    it('should return all episodes without filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockEpisode]);

      const result = await service.findAll({}, undefined);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
      expect(result).toEqual([mockEpisode]);
    });

    it('should apply status filter', async () => {
      const filters: FilterEpisodesDto = {
        statusId: 'status-uuid-123',
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockEpisode]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('episode.statusId = :statusId', {
        statusId: 'status-uuid-123',
      });
    });

    it('should apply projectId filter', async () => {
      const filters: FilterEpisodesDto = {
        projectId: 123,
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockEpisode]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('episode.projectId = :projectId', {
        projectId: 123,
      });
    });

    it('should apply createdBy filter', async () => {
      const filters: FilterEpisodesDto = {
        createdBy: 123,
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockEpisode]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('episode.createdBy = :createdBy', {
        createdBy: 123,
      });
    });
  });

  describe('findOneById', () => {
    it('should return an episode by id', async () => {
      episodeRepository.findOne.mockResolvedValue(mockEpisode);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findOneById(456, undefined);

      expect(episodeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 456 },
        relations: ['sequences'],
      });
      expect(result).toEqual(mockEpisode);
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.findOneById(0, undefined)).rejects.toThrow(BadRequestException);
      await expect(service.findOneById(-1, undefined)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when episode not found', async () => {
      episodeRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneById(999, undefined)).rejects.toThrow(NotFoundException);
      await expect(service.findOneById(999, undefined)).rejects.toThrow('Episode with ID 999 not found');
    });
  });

  describe('findOne', () => {
    it('should return an episode by code', async () => {
      episodeRepository.findOne.mockResolvedValue(mockEpisode);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findOne('EP_001', undefined);

      expect(episodeRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'EP_001' },
        relations: ['sequences'],
      });
      expect(result).toEqual(mockEpisode);
    });

    it('should throw NotFoundException when episode not found', async () => {
      episodeRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('EP_999', undefined)).rejects.toThrow(NotFoundException);
      await expect(service.findOne('EP_999', undefined)).rejects.toThrow('Episode with code EP_999 not found');
    });
  });

  describe('update', () => {
    it('should update an episode successfully', async () => {
      const updateDto: UpdateEpisodeDto = {
        name: 'Updated Episode Name',
        statusId: 'status-uuid-approved',
      };

      const updatedEpisode = { ...mockEpisode, ...updateDto };

      episodeRepository.findOne
        .mockResolvedValueOnce(mockEpisode)
        .mockResolvedValueOnce(updatedEpisode);
      episodeRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(456, updateDto, undefined);

      expect(episodeRepository.findOne).toHaveBeenCalledWith({ where: { id: 456 } });
      expect(episodeRepository.update).toHaveBeenCalledWith(
        456,
        expect.objectContaining(updateDto),
      );
      expect(result).toEqual(updatedEpisode);
    });

    it('should throw NotFoundException when episode not found', async () => {
      const updateDto: UpdateEpisodeDto = { name: 'Updated Name' };

      episodeRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, updateDto, undefined)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating code to duplicate', async () => {
      const updateDto: UpdateEpisodeDto = { code: 'EP_DUPLICATE' };

      episodeRepository.findOne.mockResolvedValue({
        id: 999,
        code: 'EP_DUPLICATE',
      });
      jest.spyOn(service, 'findOneById').mockResolvedValue(mockEpisode);

      await expect(service.update(456, updateDto, undefined)).rejects.toThrow(ConflictException);
    });

    it('should validate project when projectId is updated', async () => {
      const updateDto: UpdateEpisodeDto = {
        projectId: 123,
      };

      const episodeWithDifferentProject = {
        ...mockEpisode,
        projectId: 999, // Different from updateDto.projectId
      };

      episodeRepository.findOne
        .mockResolvedValueOnce(episodeWithDifferentProject)
        .mockResolvedValueOnce(episodeWithDifferentProject);
      projectRepository.findOne.mockResolvedValue(mockProject);
      episodeRepository.update.mockResolvedValue({ affected: 1 });

      await service.update(456, updateDto, undefined);

      expect(episodeRepository.findOne).toHaveBeenCalledWith({ where: { id: 456 } });
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 123 },
      });
    });

    it('should throw NotFoundException when project not found during update', async () => {
      const updateDto: UpdateEpisodeDto = {
        projectId: 999,
      };

      projectRepository.findOne.mockResolvedValue(null);
      jest.spyOn(service, 'findOneById').mockResolvedValue(mockEpisode);

      await expect(service.update(456, updateDto, undefined)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an episode successfully', async () => {
      episodeRepository.findOne.mockResolvedValue(mockEpisode);
      episodeRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(456, undefined);

      expect(episodeRepository.findOne).toHaveBeenCalledWith({ where: { id: 456 } });
      expect(episodeRepository.delete).toHaveBeenCalledWith(456);
    });

    it('should throw NotFoundException when episode not found', async () => {
      episodeRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999, undefined)).rejects.toThrow(NotFoundException);
      expect(episodeRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateEpisodeDuration', () => {
    it('should calculate and update episode duration', async () => {
      const sequences = [{ duration: 100 }, { duration: 200 }, { duration: 300 }];

      sequenceRepository.find.mockResolvedValue(sequences);
      jest.spyOn(service, 'findOneById').mockResolvedValue({
        ...mockEpisode,
        duration: 600,
      });
      episodeRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateEpisodeDuration(456, undefined);

      expect(sequenceRepository.find).toHaveBeenCalledWith({
        where: { episode: { id: 456 } },
        select: ['duration'],
      });
      expect(episodeRepository.update).toHaveBeenCalledWith(456, {
        duration: 600,
      });
      expect(result.duration).toBe(600);
    });
  });

  describe('findOneWithCalculatedDuration', () => {
    it('should return episode with calculated duration', async () => {
      jest.spyOn(service, 'findOneById').mockResolvedValue(mockEpisode);
      jest.spyOn(service, 'updateEpisodeDuration').mockResolvedValue({
        ...mockEpisode,
        duration: 1440,
      });

      const result = await service.findOneWithCalculatedDuration(456, undefined);

      expect(service.findOneById).toHaveBeenCalledWith(456, undefined);
      expect(service.updateEpisodeDuration).toHaveBeenCalledWith(456, undefined);
      expect(result.duration).toBe(1440);
    });
  });
});
