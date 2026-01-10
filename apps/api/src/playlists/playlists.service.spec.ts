import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlaylistsService } from './playlists.service';
import { Playlist } from '../entities/playlist.entity';
import { Project } from '../entities/project.entity';
import { Version } from '../entities/version.entity';
import { Status } from '../entities/status.entity';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { FilterPlaylistsDto } from './dto/filter-playlists.dto';
import { CreatePlaylistFromVersionsDto } from './dto/create-playlist-from-versions.dto';
import { VersionStatus } from '../entities/version.entity';
import { In } from 'typeorm';
import { ProjectAccessService } from '../auth/services/project-access.service';

describe('PlaylistsService', () => {
  let service: PlaylistsService;
  let playlistRepository: any;
  let projectRepository: any;
  let versionRepository: any;
  let module: TestingModule;

  const mockProject: Project = {
    id: 123,
    code: 'PROJ_001',
    name: 'Test Project',
  } as Project;

  const mockPlaylist: Playlist & { versions: Version[] } = {
    id: 456,
    code: 'PL_001',
    name: 'Test Playlist',
    description: 'Test description',
    statusId: 'status-uuid-in-progress',
    projectId: 123,
    versionCodes: ['VER_001'],
    versions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Playlist & { versions: Version[] };

  const mockVersion: Version = {
    id: 123,
    code: 'VER_001',
    name: 'Version 1',
    versionNumber: 1,
    status: 'wip' as any,
    latest: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    entityType: 'playlist' as any,
  } as Version;

  const mockQueryBuilder = {
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        PlaylistsService,
        {
          provide: getRepositoryToken(Playlist),
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
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Version),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findBy: jest.fn(),
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
            isAdmin: jest.fn().mockReturnValue(false),
            getAccessibleProjectIds: jest.fn().mockResolvedValue([]),
            verifyProjectAccess: jest.fn().mockResolvedValue(undefined),
            verifyPlaylistAccess: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<PlaylistsService>(PlaylistsService);
    playlistRepository = module.get(getRepositoryToken(Playlist));
    projectRepository = module.get(getRepositoryToken(Project));
    versionRepository = module.get(getRepositoryToken(Version));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a playlist successfully', async () => {
      const createDto: CreatePlaylistDto = {
        code: 'PL_001',
        name: 'Test Playlist',
        projectId: 123,
        statusId: 'status-uuid-in-progress',
      };

      playlistRepository.findOne.mockResolvedValue(null); // No duplicate
      projectRepository.findOne.mockResolvedValue(mockProject);
      versionRepository.create.mockReturnValue(mockVersion);
      versionRepository.save.mockResolvedValue(mockVersion);
      playlistRepository.create.mockReturnValue(mockPlaylist);
      playlistRepository.save.mockResolvedValue(mockPlaylist);

      const result = await service.create(createDto, undefined);

      expect(playlistRepository.findOne).toHaveBeenCalledWith({
        where: { code: createDto.code },
      });
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDto.projectId },
      });
      expect(versionRepository.create).toHaveBeenCalled();
      expect(playlistRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw ConflictException when code already exists', async () => {
      const createDto: CreatePlaylistDto = {
        code: 'PL_001',
        name: 'Test Playlist',
        projectId: 123,
      };

      playlistRepository.findOne.mockResolvedValue(mockPlaylist); // Duplicate exists

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when project not found', async () => {
      const createDto: CreatePlaylistDto = {
        code: 'PL_001',
        name: 'Test Playlist',
        projectId: 999,
      };

      playlistRepository.findOne.mockResolvedValue(null); // No duplicate
      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow('Project with ID 999 not found');
    });
  });

  describe('findAll', () => {
    it('should return all playlists without filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockPlaylist]);
      versionRepository.findBy.mockResolvedValue([]);

      const result = await service.findAll({}, undefined);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should apply status filter', async () => {
      const filters: FilterPlaylistsDto = {
        status: 'in_progress',
      };

      const mockStatusRepository = module.get(getRepositoryToken(Status));
      mockStatusRepository.findOne.mockResolvedValue({
        id: 'status-uuid-123',
        code: 'in_progress',
      });

      mockQueryBuilder.getMany.mockResolvedValue([mockPlaylist]);
      versionRepository.findBy.mockResolvedValue([]);

      await service.findAll(filters, undefined);

      expect(mockStatusRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'in_progress' },
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('playlist.statusId = :statusId', {
        statusId: 'status-uuid-123',
      });
    });

    it('should apply projectId filter', async () => {
      const filters: FilterPlaylistsDto = {
        projectId: 123,
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockPlaylist]);
      versionRepository.findBy.mockResolvedValue([]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('playlist.projectId = :projectId', {
        projectId: 123,
      });
    });

    it('should apply createdBy filter', async () => {
      const filters: FilterPlaylistsDto = {
        createdBy: 123,
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockPlaylist]);
      versionRepository.findBy.mockResolvedValue([]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('playlist.createdBy = :createdBy', {
        createdBy: 123,
      });
    });

    it('should apply assignedTo filter', async () => {
      const filters: FilterPlaylistsDto = {
        assignedTo: 123,
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockPlaylist]);
      versionRepository.findBy.mockResolvedValue([]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('playlist.assignedTo = :assignedTo', {
        assignedTo: 123,
      });
    });

    it('should apply code filter', async () => {
      const filters: FilterPlaylistsDto = {
        code: 'PL_001',
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockPlaylist]);
      versionRepository.findBy.mockResolvedValue([]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('playlist.code ILIKE :code', {
        code: '%PL_001%',
      });
    });

    it('should apply name filter', async () => {
      const filters: FilterPlaylistsDto = {
        name: 'Test Playlist',
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockPlaylist]);
      versionRepository.findBy.mockResolvedValue([]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('playlist.name ILIKE :name', {
        name: '%Test Playlist%',
      });
    });

    it('should include versions in result', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockPlaylist]);
      versionRepository.findBy.mockResolvedValue([mockVersion]);

      const result = await service.findAll({}, undefined);

      expect((result[0] as Playlist & { versions: Version[] }).versions).toEqual([mockVersion]);
    });
  });

  describe('findOneById', () => {
    it('should return a playlist by id', async () => {
      playlistRepository.findOne.mockResolvedValue(mockPlaylist);
      versionRepository.findBy.mockResolvedValue([]);

      const result = await service.findOneById(456, undefined);

      expect(playlistRepository.findOne).toHaveBeenCalledWith({
        where: { id: 456 },
        relations: ['project'],
      });
      expect(result).toBeDefined();
      expect(result.versions).toBeDefined();
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.findOneById(0)).rejects.toThrow(BadRequestException);
      await expect(service.findOneById(-1)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when playlist not found', async () => {
      playlistRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOneById(999)).rejects.toThrow('Playlist with ID 999 not found');
    });
  });

  describe('findOne', () => {
    it('should return a playlist by code', async () => {
      playlistRepository.findOne.mockResolvedValue(mockPlaylist);
      versionRepository.findBy.mockResolvedValue([]);

      const result = await service.findOne('PL_001', undefined);

      expect(playlistRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'PL_001' },
        relations: ['project'],
      });
      expect(result).toBeDefined();
      expect(result.versions).toBeDefined();
    });

    it('should throw NotFoundException when playlist not found', async () => {
      playlistRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('PL_999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a playlist successfully', async () => {
      const updateDto: UpdatePlaylistDto = {
        name: 'Updated Playlist Name',
        statusId: 'status-uuid-approved',
      };

      const updatedPlaylist = { ...mockPlaylist, ...updateDto, versions: [] };

      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(mockPlaylist);
      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(updatedPlaylist);
      playlistRepository.update.mockResolvedValue({ affected: 1 });
      versionRepository.findBy.mockResolvedValue([]);

      const result = await service.update(456, updateDto, undefined);

      expect(playlistRepository.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when playlist not found', async () => {
      const updateDto: UpdatePlaylistDto = { name: 'Updated Name' };

      jest
        .spyOn(service, 'findOneById')
        .mockRejectedValue(new NotFoundException('Playlist with ID 999 not found'));

      await expect(service.update(999, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating code to duplicate', async () => {
      const updateDto: UpdatePlaylistDto = {
        code: 'PL_DUPLICATE',
      };

      playlistRepository.findOne.mockResolvedValue({
        id: 999,
        code: 'PL_DUPLICATE',
      });
      jest.spyOn(service, 'findOneById').mockResolvedValue(mockPlaylist);

      await expect(service.update(456, updateDto)).rejects.toThrow(ConflictException);
    });

    it('should validate project when projectId is updated', async () => {
      const updateDto: UpdatePlaylistDto = {
        projectId: 123,
      };

      projectRepository.findOne.mockResolvedValue(mockProject);
      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(mockPlaylist);
      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(mockPlaylist);
      playlistRepository.update.mockResolvedValue({ affected: 1 });
      versionRepository.findBy.mockResolvedValue([]);

      await service.update(456, updateDto, undefined);

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 123 },
      });
    });
  });

  describe('addVersion', () => {
    it('should add version to playlist', async () => {
      jest.spyOn(service, 'findOneById').mockResolvedValue(mockPlaylist);
      versionRepository.findOne.mockResolvedValue(mockVersion);
      playlistRepository.update.mockResolvedValue({ affected: 1 });
      versionRepository.findBy.mockResolvedValue([]);

      const result = await service.addVersion(456, 'VER_002', undefined, undefined);

      expect(service.findOneById).toHaveBeenCalledWith(456, undefined);
      expect(versionRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'VER_002' },
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when playlist not found', async () => {
      jest
        .spyOn(service, 'findOneById')
        .mockRejectedValue(new NotFoundException('Playlist with ID 999 not found'));

      await expect(service.addVersion(999, 'VER_001', undefined, undefined)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when version not found', async () => {
      jest.spyOn(service, 'findOneById').mockResolvedValue(mockPlaylist);
      versionRepository.findOne.mockResolvedValue(null);

      await expect(service.addVersion(456, 'VER_999', undefined, undefined)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when version already in playlist', async () => {
      jest.spyOn(service, 'findOneById').mockResolvedValue(mockPlaylist);
      versionRepository.findOne.mockResolvedValue(mockVersion);

      await expect(service.addVersion(456, 'VER_001', undefined, undefined)).rejects.toThrow(BadRequestException);
    });

    it('should add version at specific position', async () => {
      const playlistWithVersions = {
        ...mockPlaylist,
        versionCodes: ['VER_001', 'VER_003'],
        versions: [],
      };
      jest
        .spyOn(service, 'findOneById')
        .mockResolvedValueOnce(playlistWithVersions)
        .mockResolvedValueOnce({
          ...playlistWithVersions,
          versionCodes: ['VER_001', 'VER_002', 'VER_003'],
          versions: [],
        });
      versionRepository.findOne.mockResolvedValue(mockVersion);
      playlistRepository.update.mockResolvedValue({ affected: 1 });
      versionRepository.findBy.mockResolvedValue([]);

      const result = await service.addVersion(456, 'VER_002', 1, undefined);

      expect(playlistRepository.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('removeVersion', () => {
    it('should remove version from playlist', async () => {
      jest
        .spyOn(service, 'findOneById')
        .mockResolvedValueOnce(mockPlaylist)
        .mockResolvedValueOnce({
          ...mockPlaylist,
          versionCodes: [],
          versions: [],
        });
      playlistRepository.update.mockResolvedValue({ affected: 1 });
      versionRepository.findBy.mockResolvedValue([]);

      const result = await service.removeVersion(456, 'VER_001', undefined);

      expect(service.findOneById).toHaveBeenCalledWith(456, undefined);
      expect(playlistRepository.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when playlist not found', async () => {
      jest
        .spyOn(service, 'findOneById')
        .mockRejectedValue(new NotFoundException('Playlist with ID 999 not found'));

      await expect(service.removeVersion(999, 'VER_001', undefined)).rejects.toThrow(NotFoundException);
    });

    it('should handle removing version not in playlist gracefully', async () => {
      jest
        .spyOn(service, 'findOneById')
        .mockResolvedValueOnce(mockPlaylist)
        .mockResolvedValueOnce(mockPlaylist);
      playlistRepository.update.mockResolvedValue({ affected: 1 });
      versionRepository.findBy.mockResolvedValue([]);

      const result = await service.removeVersion(456, 'VER_999', undefined);

      // Should not throw, just filter out non-existent version
      expect(result).toBeDefined();
    });
  });

  describe('reorderVersions', () => {
    it('should reorder versions in playlist', async () => {
      const playlistWithVersions = {
        ...mockPlaylist,
        versionCodes: ['VER_001', 'VER_002', 'VER_003'],
        versions: [],
      };
      jest
        .spyOn(service, 'findOneById')
        .mockResolvedValueOnce(playlistWithVersions)
        .mockResolvedValueOnce({
          ...playlistWithVersions,
          versionCodes: ['VER_003', 'VER_001', 'VER_002'],
          versions: [],
        });
      versionRepository.findBy.mockResolvedValue([
        { code: 'VER_003' },
        { code: 'VER_001' },
        { code: 'VER_002' },
      ]);
      playlistRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.reorderVersions(456, ['VER_003', 'VER_001', 'VER_002']);

      expect(versionRepository.findBy).toHaveBeenCalledWith({
        code: In(['VER_003', 'VER_001', 'VER_002']),
      });
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when versions do not exist', async () => {
      const playlistWithVersions = {
        ...mockPlaylist,
        versionCodes: ['VER_001', 'VER_002'],
        versions: [],
      };
      jest.spyOn(service, 'findOneById').mockResolvedValue(playlistWithVersions);
      versionRepository.findBy.mockResolvedValue([{ code: 'VER_001' }]);

      await expect(service.reorderVersions(456, ['VER_001', 'VER_999'])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when playlist not found', async () => {
      jest
        .spyOn(service, 'findOneById')
        .mockRejectedValue(new NotFoundException('Playlist with ID 999 not found'));

      await expect(service.reorderVersions(999, ['VER_001'])).rejects.toThrow(NotFoundException);
    });
  });

  describe('createFromVersions', () => {
    it('should create playlist from versions', async () => {
      const createDto: CreatePlaylistFromVersionsDto = {
        code: 'PL_002',
        name: 'New Playlist',
        projectId: 123,
        versionCodes: ['VER_001', 'VER_002'],
      };

      projectRepository.findOne.mockResolvedValue(mockProject);
      versionRepository.findBy.mockResolvedValue([{ code: 'VER_001' }, { code: 'VER_002' }]);
      playlistRepository.create.mockReturnValue(mockPlaylist);
      playlistRepository.save.mockResolvedValue(mockPlaylist);

      const result = await service.createFromVersions(createDto, undefined);

      expect(projectRepository.findOne).toHaveBeenCalled();
      expect(versionRepository.findBy).toHaveBeenCalledWith({
        code: In(['VER_001', 'VER_002']),
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when project not found', async () => {
      const createDto: CreatePlaylistFromVersionsDto = {
        code: 'PL_002',
        name: 'New Playlist',
        projectId: 999,
        versionCodes: ['VER_001'],
      };

      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.createFromVersions(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.createFromVersions(createDto)).rejects.toThrow(
        'Project with ID 999 not found',
      );
    });

    it('should throw BadRequestException when versions do not exist', async () => {
      const createDto: CreatePlaylistFromVersionsDto = {
        code: 'PL_002',
        name: 'New Playlist',
        projectId: 123,
        versionCodes: ['VER_001', 'VER_999'],
      };

      projectRepository.findOne.mockResolvedValue(mockProject);
      versionRepository.findBy.mockResolvedValue([{ code: 'VER_001' }]);

      await expect(service.createFromVersions(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a playlist successfully', async () => {
      jest.spyOn(service, 'findOneById').mockResolvedValue(mockPlaylist);
      playlistRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(456, undefined);

      expect(service.findOneById).toHaveBeenCalledWith(456, undefined);
      expect(playlistRepository.delete).toHaveBeenCalledWith(456);
    });

    it('should throw NotFoundException when playlist not found', async () => {
      jest
        .spyOn(service, 'findOneById')
        .mockRejectedValue(new NotFoundException('Playlist with ID 999 not found'));

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(playlistRepository.delete).not.toHaveBeenCalled();
    });
  });
});
