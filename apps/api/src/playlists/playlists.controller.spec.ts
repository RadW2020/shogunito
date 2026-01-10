import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistsController } from './playlists.controller';
import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { FilterPlaylistsDto } from './dto/filter-playlists.dto';
import { Playlist } from '../entities/playlist.entity';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserRateLimitGuard } from '../common/guards/user-rate-limit.guard';

describe('PlaylistsController', () => {
  let controller: PlaylistsController;
  let service: PlaylistsService;

  const mockPlaylist: Playlist = {
    id: 123,
    code: 'PL_001',
    name: 'Test Playlist',
    description: 'Test description',
    statusId: 'status-uuid-in-progress',
    projectId: 1,
    versionCodes: ['VER_001'],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Playlist;

  const mockPlaylistsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOneById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createFromVersions: jest.fn(),
    addVersions: jest.fn(),
    removeVersions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlaylistsController],
      providers: [
        {
          provide: PlaylistsService,
          useValue: mockPlaylistsService,
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

    controller = module.get<PlaylistsController>(PlaylistsController);
    service = module.get<PlaylistsService>(PlaylistsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a playlist successfully', async () => {
      const createDto: CreatePlaylistDto = {
        code: 'PL_001',
        name: 'Test Playlist',
        projectId: 1,
        statusId: 'status-uuid-in-progress',
      };

      mockPlaylistsService.create.mockResolvedValue(mockPlaylist);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto, undefined);
      expect(result).toEqual(mockPlaylist);
    });

    it('should throw NotFoundException when project not found', async () => {
      const createDto: CreatePlaylistDto = {
        code: 'PL_001',
        name: 'Test Playlist',
        projectId: 999,
      };

      mockPlaylistsService.create.mockRejectedValue(
        new NotFoundException('Project with ID project-999 not found'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all playlists without filters', async () => {
      const playlists = [mockPlaylist];
      mockPlaylistsService.findAll.mockResolvedValue(playlists);

      const result = await controller.findAll({});

      expect(service.findAll).toHaveBeenCalledWith({}, undefined);
      expect(result).toEqual(playlists);
    });

    it('should return filtered playlists', async () => {
      const filters: FilterPlaylistsDto = {
        status: 'in_progress',
        projectId: 1,
      };

      mockPlaylistsService.findAll.mockResolvedValue([mockPlaylist]);

      const result = await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters, undefined);
      expect(result).toEqual([mockPlaylist]);
    });
  });

  describe('findOne', () => {
    it('should return a playlist by id', async () => {
      mockPlaylistsService.findOneById.mockResolvedValue(mockPlaylist);

      const result = await controller.findOne(123);

      expect(service.findOneById).toHaveBeenCalledWith(123, undefined);
      expect(result).toEqual(mockPlaylist);
    });

    it('should throw NotFoundException when playlist not found', async () => {
      mockPlaylistsService.findOneById.mockRejectedValue(
        new NotFoundException('Playlist with ID 999 not found'),
      );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a playlist successfully', async () => {
      const updateDto: UpdatePlaylistDto = {
        name: 'Updated Playlist Name',
        statusId: 'status-uuid-approved',
      };

      const updatedPlaylist = { ...mockPlaylist, ...updateDto };
      mockPlaylistsService.update.mockResolvedValue(updatedPlaylist);

      const result = await controller.update(123, updateDto);

      expect(service.update).toHaveBeenCalledWith(123, updateDto, undefined);
      expect(result).toEqual(updatedPlaylist);
    });
  });

  describe('remove', () => {
    it('should delete a playlist successfully', async () => {
      mockPlaylistsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(123);

      expect(service.remove).toHaveBeenCalledWith(123, undefined);
      expect(result).toEqual({ message: 'Playlist eliminada exitosamente' });
    });
  });
});
