import { Test, TestingModule } from '@nestjs/testing';
import { EpisodesController } from './episodes.controller';
import { EpisodesService } from './episodes.service';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { UpdateEpisodeDto } from './dto/update-episode.dto';
import { FilterEpisodesDto } from './dto/filter-episodes.dto';
import { Episode } from '../entities/episode.entity';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserRateLimitGuard } from '../common/guards/user-rate-limit.guard';

describe('EpisodesController', () => {
  let controller: EpisodesController;
  let service: EpisodesService;

  const mockEpisode: Episode = {
    id: 456,
    code: 'EP_001',
    name: 'Test Episode',
    description: 'Test description',
    statusId: 'status-uuid-in-progress',
    duration: 1440,
    epNumber: 1,
    projectId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Episode;

  const mockEpisodesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOneById: jest.fn(),
    findOneWithCalculatedDuration: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EpisodesController],
      providers: [
        {
          provide: EpisodesService,
          useValue: mockEpisodesService,
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

    controller = module.get<EpisodesController>(EpisodesController);
    service = module.get<EpisodesService>(EpisodesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an episode successfully', async () => {
      const createDto: CreateEpisodeDto = {
        code: 'EP_001',
        name: 'Test Episode',
        projectId: 1,
        cutOrder: 1,
        statusId: 'status-uuid-in-progress',
      };

      mockEpisodesService.create.mockResolvedValue(mockEpisode);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto, undefined);
      expect(result).toEqual(mockEpisode);
    });

    it('should throw NotFoundException when project not found', async () => {
      const createDto: CreateEpisodeDto = {
        code: 'EP_001',
        name: 'Test Episode',
        projectId: 999,
        cutOrder: 1,
      };

      mockEpisodesService.create.mockRejectedValue(
        new NotFoundException('Project with ID project-999 not found'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all episodes without filters', async () => {
      const episodes = [mockEpisode];
      mockEpisodesService.findAll.mockResolvedValue(episodes);

      const result = await controller.findAll({});

      expect(service.findAll).toHaveBeenCalledWith({}, undefined);
      expect(result).toEqual(episodes);
    });

    it('should return filtered episodes', async () => {
      const filters: FilterEpisodesDto = {
        statusId: 'status-uuid-in-progress',
        projectId: 1,
      };

      mockEpisodesService.findAll.mockResolvedValue([mockEpisode]);

      const result = await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters, undefined);
      expect(result).toEqual([mockEpisode]);
    });
  });

  describe('findOne', () => {
    it('should return an episode by id', async () => {
      mockEpisodesService.findOneById.mockResolvedValue(mockEpisode);

      const result = await controller.findOne(456);

      expect(service.findOneById).toHaveBeenCalledWith(456, undefined);
      expect(result).toEqual(mockEpisode);
    });

    it('should throw NotFoundException when episode not found', async () => {
      mockEpisodesService.findOneById.mockRejectedValue(
        new NotFoundException('Episode with ID 999 not found'),
      );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneWithCalculatedDuration', () => {
    it('should return an episode with calculated duration', async () => {
      const episodeWithDuration = {
        ...mockEpisode,
        calculatedDuration: 1440,
      };

      mockEpisodesService.findOneWithCalculatedDuration.mockResolvedValue(episodeWithDuration);

      const result = await controller.findOneWithCalculatedDuration(456);

      expect(service.findOneWithCalculatedDuration).toHaveBeenCalledWith(456, undefined);
      expect(result).toEqual(episodeWithDuration);
    });

    it('should throw NotFoundException when episode not found', async () => {
      mockEpisodesService.findOneWithCalculatedDuration.mockRejectedValue(
        new NotFoundException('Episode with ID 999 not found'),
      );

      await expect(controller.findOneWithCalculatedDuration(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an episode successfully', async () => {
      const updateDto: UpdateEpisodeDto = {
        name: 'Updated Episode Name',
        statusId: 'status-uuid-approved',
      };

      const updatedEpisode = { ...mockEpisode, ...updateDto };
      mockEpisodesService.update.mockResolvedValue(updatedEpisode);

      const result = await controller.update(456, updateDto);

      expect(service.update).toHaveBeenCalledWith(456, updateDto, undefined);
      expect(result).toEqual(updatedEpisode);
    });

    it('should throw NotFoundException when episode not found', async () => {
      const updateDto: UpdateEpisodeDto = { name: 'Updated Name' };

      mockEpisodesService.update.mockRejectedValue(
        new NotFoundException('Episode with ID 999 not found'),
      );

      await expect(controller.update(999, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an episode successfully', async () => {
      mockEpisodesService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(456);

      expect(service.remove).toHaveBeenCalledWith(456, undefined);
      expect(result).toEqual({ message: 'Episodio eliminado exitosamente' });
    });

    it('should throw NotFoundException when episode not found', async () => {
      mockEpisodesService.remove.mockRejectedValue(
        new NotFoundException('Episode with ID 999 not found'),
      );

      await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
