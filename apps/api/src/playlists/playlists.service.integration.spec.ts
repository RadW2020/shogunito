import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlaylistsService } from './playlists.service';
import { Playlist, Project, Version, Status, ProjectRole } from '../entities';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { FilterPlaylistsDto } from './dto/filter-playlists.dto';
import { CreatePlaylistFromVersionsDto } from './dto/create-playlist-from-versions.dto';
import { ProjectAccessService, UserContext } from '../auth/services/project-access.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Integration tests for PlaylistsService
 *
 * Tests playlist management flows with:
 * - Playlist creation with automatic initial version
 * - Access control and permissions
 * - Playlist filtering and search
 * - Playlist updates with permission checks
 * - Version management (add, remove, reorder)
 * - Playlist creation from existing versions
 * - Playlist deletion
 */
describe('PlaylistsService Integration Tests', () => {
  let module: TestingModule;
  let playlistsService: PlaylistsService;
  let playlistRepository: jest.Mocked<any>;
  let projectRepository: jest.Mocked<any>;
  let versionRepository: jest.Mocked<any>;
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
    code: 'review',
    name: 'In Review',
    color: '#FFA500',
    isActive: true,
    sortOrder: 0,
    applicableEntities: ['playlist'],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Status;

  const mockVersion: Version = {
    id: 5001,
    code: 'PL_001_001',
    name: 'Initial version',
    versionNumber: 1,
    latest: true,
    statusId: 'status-uuid-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Version;

  const mockVersion2: Version = {
    id: 5002,
    code: 'VER_002',
    name: 'Version 2',
    versionNumber: 2,
    latest: false,
    statusId: 'status-uuid-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Version;

  const mockPlaylist: Playlist = {
    id: 6001,
    code: 'PL_001',
    name: 'Test Playlist',
    description: 'Test description',
    statusId: 'status-uuid-123',
    status: mockStatus,
    projectId: 123,
    versionCodes: ['PL_001_001', 'VER_002'],
    createdBy: 1,
    assignedTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Playlist;

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
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
            findBy: jest.fn(),
            createQueryBuilder: jest.fn(() => {
              const qb = {
                orderBy: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
              };
              return qb;
            }),
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
            findOne: jest.fn(),
            findBy: jest.fn(),
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

    playlistsService = testModule.get<PlaylistsService>(PlaylistsService);
    playlistRepository = testModule.get(getRepositoryToken(Playlist));
    projectRepository = testModule.get(getRepositoryToken(Project));
    versionRepository = testModule.get(getRepositoryToken(Version));
    statusRepository = testModule.get(getRepositoryToken(Status));
    projectAccessService = testModule.get<ProjectAccessService>(ProjectAccessService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Playlist Creation', () => {
    it('should create playlist with automatic initial version', async () => {
      const createDto: CreatePlaylistDto = {
        code: 'PL_NEW',
        name: 'New Playlist',
        projectId: 123,
      };

      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      playlistRepository.findOne.mockResolvedValue(null); // No duplicate
      projectRepository.findOne.mockResolvedValue(mockProject);
      statusRepository.findOne.mockResolvedValue(mockStatus); // For 'wip' status
      versionRepository.create.mockReturnValue(mockVersion);
      versionRepository.save.mockResolvedValue(mockVersion);
      playlistRepository.create.mockReturnValue({
        ...mockPlaylist,
        ...createDto,
        versionCodes: [mockVersion.code],
      });
      playlistRepository.save.mockResolvedValue({
        ...mockPlaylist,
        ...createDto,
        id: 6002,
        versionCodes: [mockVersion.code],
      });

      const result = await playlistsService.create(createDto, mockUserContext);

      expect(result).toHaveProperty('code', createDto.code);
      expect(versionRepository.create).toHaveBeenCalled();
      expect(versionRepository.save).toHaveBeenCalled();
    });

    it('should create playlist with provided versionCodes', async () => {
      const createDto: CreatePlaylistDto = {
        code: 'PL_WITH_VERSIONS',
        name: 'Playlist with Versions',
        projectId: 123,
        versionCodes: ['VER_002'],
      };

      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      playlistRepository.findOne.mockResolvedValue(null);
      projectRepository.findOne.mockResolvedValue(mockProject);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      versionRepository.create.mockReturnValue(mockVersion);
      versionRepository.save.mockResolvedValue(mockVersion);
      playlistRepository.create.mockReturnValue({
        ...mockPlaylist,
        ...createDto,
        versionCodes: [mockVersion.code, 'VER_002'],
      });
      playlistRepository.save.mockResolvedValue({
        ...mockPlaylist,
        ...createDto,
        id: 6003,
        versionCodes: [mockVersion.code, 'VER_002'],
      });

      const result = await playlistsService.create(createDto, mockUserContext);

      expect(result.versionCodes).toContain('VER_002');
      expect(result.versionCodes).toContain(mockVersion.code);
    });

    it('should throw NotFoundException for non-existent project', async () => {
      const createDto: CreatePlaylistDto = {
        code: 'PL_INVALID',
        name: 'Playlist',
        projectId: 999,
      };

      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      playlistRepository.findOne.mockResolvedValue(null);
      projectRepository.findOne.mockResolvedValue(null);

      await expect(playlistsService.create(createDto, mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should prevent duplicate playlist codes', async () => {
      const createDto: CreatePlaylistDto = {
        code: 'PL_001',
        name: 'Duplicate Playlist',
        projectId: 123,
      };

      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      playlistRepository.findOne.mockResolvedValue(mockPlaylist); // Existing playlist
      projectRepository.findOne.mockResolvedValue(mockProject);

      await expect(playlistsService.create(createDto, mockUserContext)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should verify user has contributor access', async () => {
      const createDto: CreatePlaylistDto = {
        code: 'PL_002',
        name: 'Playlist',
        projectId: 123,
      };

      projectAccessService.verifyProjectAccess.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(playlistsService.create(createDto, mockUserContext)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Playlist Filtering and Search', () => {
    it('should filter playlists by status', async () => {
      const queryBuilder = playlistRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockPlaylist]);
      playlistRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.getAccessibleProjectIds = jest.fn().mockResolvedValue([123]);
      versionRepository.findBy.mockResolvedValue([mockVersion, mockVersion2]);

      const filters: FilterPlaylistsDto = { status: 'review' };
      const result = await playlistsService.findAll(filters, mockUserContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter playlists by projectId', async () => {
      const queryBuilder = playlistRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockPlaylist]);
      playlistRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      projectAccessService.getAccessibleProjectIds = jest.fn().mockResolvedValue([123]);
      versionRepository.findBy.mockResolvedValue([mockVersion, mockVersion2]);

      const filters: FilterPlaylistsDto = { projectId: 123 };
      const result = await playlistsService.findAll(filters, mockUserContext);

      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter playlists by code', async () => {
      const queryBuilder = playlistRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockPlaylist]);
      playlistRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.getAccessibleProjectIds = jest.fn().mockResolvedValue([123]);
      versionRepository.findBy.mockResolvedValue([mockVersion, mockVersion2]);

      const filters: FilterPlaylistsDto = { code: 'PL' };
      const result = await playlistsService.findAll(filters, mockUserContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter playlists by name', async () => {
      const queryBuilder = playlistRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockPlaylist]);
      playlistRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.getAccessibleProjectIds = jest.fn().mockResolvedValue([123]);
      versionRepository.findBy.mockResolvedValue([mockVersion, mockVersion2]);

      const filters: FilterPlaylistsDto = { name: 'Test' };
      const result = await playlistsService.findAll(filters, mockUserContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter playlists by createdBy', async () => {
      const queryBuilder = playlistRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockPlaylist]);
      playlistRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.getAccessibleProjectIds = jest.fn().mockResolvedValue([123]);
      versionRepository.findBy.mockResolvedValue([mockVersion, mockVersion2]);

      const filters: FilterPlaylistsDto = { createdBy: 1 };
      const result = await playlistsService.findAll(filters, mockUserContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter playlists by assignedTo', async () => {
      const queryBuilder = playlistRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockPlaylist]);
      playlistRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.getAccessibleProjectIds = jest.fn().mockResolvedValue([123]);
      versionRepository.findBy.mockResolvedValue([mockVersion, mockVersion2]);

      const filters: FilterPlaylistsDto = { assignedTo: 2 };
      const result = await playlistsService.findAll(filters, mockUserContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should restrict user to accessible projects', async () => {
      const queryBuilder = playlistRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockPlaylist]);
      playlistRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.getAccessibleProjectIds = jest.fn().mockResolvedValue([123]);
      versionRepository.findBy.mockResolvedValue([mockVersion, mockVersion2]);

      const result = await playlistsService.findAll({}, mockUserContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when user has no project access', async () => {
      const queryBuilder = playlistRepository.createQueryBuilder();
      playlistRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.getAccessibleProjectIds = jest.fn().mockResolvedValue([]);

      const result = await playlistsService.findAll({}, mockUserContext);

      expect(result).toEqual([]);
    });

    it('should load versions for playlists', async () => {
      const queryBuilder = playlistRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockPlaylist]);
      playlistRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.getAccessibleProjectIds = jest.fn().mockResolvedValue([123]);
      versionRepository.findBy.mockResolvedValue([mockVersion, mockVersion2]);

      const result = await playlistsService.findAll({}, mockUserContext);

      expect(result[0]).toHaveProperty('versions');
      expect(Array.isArray(result[0].versions)).toBe(true);
    });
  });

  describe('Playlist Retrieval', () => {
    it('should find playlist by ID', async () => {
      playlistRepository.findOne.mockResolvedValue({
        ...mockPlaylist,
        project: mockProject,
      });
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      versionRepository.findBy.mockResolvedValue([mockVersion, mockVersion2]);

      const result = await playlistsService.findOneById(6001, mockUserContext);

      expect(result).toHaveProperty('id', 6001);
      expect(result).toHaveProperty('versions');
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(playlistsService.findOneById(-1, mockUserContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for non-existent playlist', async () => {
      playlistRepository.findOne.mockResolvedValue(null);

      await expect(playlistsService.findOneById(9999, mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should find playlist by code', async () => {
      playlistRepository.findOne.mockResolvedValue({
        ...mockPlaylist,
        project: mockProject,
      });
      versionRepository.findBy.mockResolvedValue([mockVersion, mockVersion2]);

      const result = await playlistsService.findOne('PL_001');

      expect(result).toHaveProperty('code', 'PL_001');
      expect(result).toHaveProperty('versions');
    });

    it('should throw NotFoundException for non-existent code', async () => {
      playlistRepository.findOne.mockResolvedValue(null);

      await expect(playlistsService.findOne('NON_EXISTENT')).rejects.toThrow(NotFoundException);
    });

    it('should load versions for playlist', async () => {
      playlistRepository.findOne.mockResolvedValue({
        ...mockPlaylist,
        project: mockProject,
      });
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      versionRepository.findBy.mockResolvedValue([mockVersion, mockVersion2]);

      const result = await playlistsService.findOneById(6001, mockUserContext);

      expect(result.versions).toHaveLength(2);
      expect(versionRepository.findBy).toHaveBeenCalled();
    });
  });

  describe('Playlist Updates', () => {
    it('should update playlist information', async () => {
      const updateDto: UpdatePlaylistDto = {
        name: 'Updated Playlist Name',
        description: 'Updated description',
      };

      playlistRepository.findOne
        .mockResolvedValueOnce({
          ...mockPlaylist,
          project: mockProject,
        }) // First call in findOneById (update)
        .mockResolvedValueOnce({
          ...mockPlaylist,
          ...updateDto,
          project: mockProject,
        }); // Second call in findOneById (return)
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      playlistRepository.update.mockResolvedValue({ affected: 1 });
      versionRepository.findBy.mockResolvedValue([mockVersion, mockVersion2]);

      const result = await playlistsService.update(6001, updateDto, mockUserContext);

      expect(result.name).toBe(updateDto.name);
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should prevent duplicate code on update', async () => {
      const updateDto: UpdatePlaylistDto = {
        code: 'PL_DUPLICATE',
      };

      playlistRepository.findOne
        .mockResolvedValueOnce({
          ...mockPlaylist,
          project: mockProject,
        }) // First call in findOneById
        .mockResolvedValueOnce({
          ...mockPlaylist,
          id: 9999,
          code: 'PL_DUPLICATE',
        }); // Second call to check duplicate

      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);

      await expect(playlistsService.update(6001, updateDto, mockUserContext)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow updating to same code', async () => {
      const updateDto: UpdatePlaylistDto = {
        code: 'PL_001', // Same as existing
        name: 'Updated Name',
      };

      playlistRepository.findOne
        .mockResolvedValueOnce({
          ...mockPlaylist,
          project: mockProject,
        }) // First call in findOneById
        .mockResolvedValueOnce({
          ...mockPlaylist,
          code: 'PL_001',
        }) // Second call to check duplicate (same ID)
        .mockResolvedValueOnce({
          ...mockPlaylist,
          ...updateDto,
          project: mockProject,
        }); // Third call in findOneById (return)
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      playlistRepository.update.mockResolvedValue({ affected: 1 });
      versionRepository.findBy.mockResolvedValue([mockVersion, mockVersion2]);

      const result = await playlistsService.update(6001, updateDto, mockUserContext);

      expect(result.name).toBe(updateDto.name);
    });

    it('should update playlist project', async () => {
      const newProject: Project = {
        ...mockProject,
        id: 456,
        code: 'PROJ_002',
      };
      const updateDto: UpdatePlaylistDto = {
        projectId: 456,
      };

      playlistRepository.findOne
        .mockResolvedValueOnce({
          ...mockPlaylist,
          project: mockProject,
        }) // First call in findOneById (update)
        .mockResolvedValueOnce({
          ...mockPlaylist,
          projectId: 456,
          project: newProject,
        }); // Second call in findOneById (return)
      projectRepository.findOne.mockResolvedValue(newProject);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      playlistRepository.update.mockResolvedValue({ affected: 1 });
      versionRepository.findBy.mockResolvedValue([mockVersion, mockVersion2]);

      const result = await playlistsService.update(6001, updateDto, mockUserContext);

      expect(projectRepository.findOne).toHaveBeenCalled();
      // verifyProjectAccess is called: once for old project in update, once for new project in update, and in findOneById calls
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should update versionCodes', async () => {
      const updateDto: UpdatePlaylistDto = {
        versionCodes: ['VER_002'],
      };

      playlistRepository.findOne
        .mockResolvedValueOnce({
          ...mockPlaylist,
          project: mockProject,
        }) // First call in findOneById
        .mockResolvedValueOnce({
          ...mockPlaylist,
          ...updateDto,
          project: mockProject,
        }); // Second call in findOneById (return)
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      playlistRepository.update.mockResolvedValue({ affected: 1 });
      versionRepository.findBy.mockResolvedValue([mockVersion2]);

      const result = await playlistsService.update(6001, updateDto, mockUserContext);

      expect(result.versionCodes).toEqual(['VER_002']);
    });
  });

  describe('Version Management', () => {
    it('should add version to playlist', async () => {
      const newVersionCode = 'VER_003';
      const newVersion: Version = {
        ...mockVersion2,
        code: newVersionCode,
      };

      playlistRepository.findOne
        .mockResolvedValueOnce({
          ...mockPlaylist,
          project: mockProject,
        }) // First call in findOneById (addVersion)
        .mockResolvedValueOnce({
          ...mockPlaylist,
          versionCodes: [...mockPlaylist.versionCodes, newVersionCode],
          project: mockProject,
        }); // Second call in findOneById (return)
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      versionRepository.findOne.mockResolvedValue(newVersion);
      playlistRepository.update.mockResolvedValue({ affected: 1 });
      versionRepository.findBy.mockResolvedValue([mockVersion, mockVersion2, newVersion]);

      const result = await playlistsService.addVersion(6001, newVersionCode, undefined, mockUserContext);

      expect(result.versionCodes).toContain(newVersionCode);
      expect(versionRepository.findOne).toHaveBeenCalledWith({
        where: { code: newVersionCode },
      });
    });

    it('should add version at specific position', async () => {
      const newVersionCode = 'VER_003';
      const newVersion: Version = {
        ...mockVersion2,
        code: newVersionCode,
      };

      playlistRepository.findOne
        .mockResolvedValueOnce({
          ...mockPlaylist,
          project: mockProject,
        }) // First call in findOneById
        .mockResolvedValueOnce({
          ...mockPlaylist,
          versionCodes: [mockPlaylist.versionCodes[0], newVersionCode, mockPlaylist.versionCodes[1]],
          project: mockProject,
        }); // Second call in findOneById (return)
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      versionRepository.findOne.mockResolvedValue(newVersion);
      playlistRepository.update.mockResolvedValue({ affected: 1 });
      versionRepository.findBy.mockResolvedValue([mockVersion, newVersion, mockVersion2]);

      const result = await playlistsService.addVersion(6001, newVersionCode, 1, mockUserContext);

      expect(result.versionCodes[1]).toBe(newVersionCode);
    });

    it('should throw NotFoundException for non-existent version', async () => {
      playlistRepository.findOne.mockResolvedValue({
        ...mockPlaylist,
        project: mockProject,
      });
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      versionRepository.findOne.mockResolvedValue(null);

      await expect(
        playlistsService.addVersion(6001, 'NON_EXISTENT', undefined, mockUserContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for duplicate version', async () => {
      playlistRepository.findOne.mockResolvedValue({
        ...mockPlaylist,
        project: mockProject,
      });
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      versionRepository.findOne.mockResolvedValue(mockVersion2); // Already in playlist

      await expect(
        playlistsService.addVersion(6001, 'VER_002', undefined, mockUserContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('should remove version from playlist', async () => {
      playlistRepository.findOne
        .mockResolvedValueOnce({
          ...mockPlaylist,
          project: mockProject,
        }) // First call in findOneById
        .mockResolvedValueOnce({
          ...mockPlaylist,
          versionCodes: [mockPlaylist.versionCodes[0]],
          project: mockProject,
        }); // Second call in findOneById (return)
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      playlistRepository.update.mockResolvedValue({ affected: 1 });
      versionRepository.findBy.mockResolvedValue([mockVersion]);

      const result = await playlistsService.removeVersion(6001, 'VER_002', mockUserContext);

      expect(result.versionCodes).not.toContain('VER_002');
      expect(result.versionCodes).toHaveLength(1);
    });

    it('should reorder versions in playlist', async () => {
      const reorderedCodes = ['VER_002', 'PL_001_001'];

      playlistRepository.findOne
        .mockResolvedValueOnce({
          ...mockPlaylist,
          project: mockProject,
        }) // First call in findOneById
        .mockResolvedValueOnce({
          ...mockPlaylist,
          versionCodes: reorderedCodes,
          project: mockProject,
        }); // Second call in findOneById (return)
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      versionRepository.findBy.mockResolvedValue([mockVersion2, mockVersion]);
      playlistRepository.update.mockResolvedValue({ affected: 1 });
      versionRepository.findBy.mockResolvedValue([mockVersion2, mockVersion]);

      const result = await playlistsService.reorderVersions(6001, reorderedCodes, mockUserContext);

      expect(result.versionCodes).toEqual(reorderedCodes);
      expect(versionRepository.findBy).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid version codes in reorder', async () => {
      const invalidCodes = ['VER_002', 'NON_EXISTENT'];

      playlistRepository.findOne.mockResolvedValue({
        ...mockPlaylist,
        project: mockProject,
      });
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      versionRepository.findBy.mockResolvedValue([mockVersion2]); // Only one found

      await expect(
        playlistsService.reorderVersions(6001, invalidCodes, mockUserContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Playlist Creation from Versions', () => {
    it('should create playlist from existing versions', async () => {
      const createDto: CreatePlaylistFromVersionsDto = {
        code: 'PL_FROM_VERSIONS',
        name: 'Playlist from Versions',
        projectId: 123,
        versionCodes: ['VER_002'],
      };

      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      projectRepository.findOne.mockResolvedValue(mockProject);
      versionRepository.findBy.mockResolvedValue([mockVersion2]);
      playlistRepository.create.mockReturnValue({
        ...mockPlaylist,
        ...createDto,
      });
      playlistRepository.save.mockResolvedValue({
        ...mockPlaylist,
        ...createDto,
        id: 6004,
      });

      const result = await playlistsService.createFromVersions(createDto, mockUserContext);

      expect(result).toHaveProperty('code', createDto.code);
      expect(result.versionCodes).toEqual(createDto.versionCodes);
      expect(versionRepository.findBy).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent project', async () => {
      const createDto: CreatePlaylistFromVersionsDto = {
        code: 'PL_INVALID',
        name: 'Playlist',
        projectId: 999,
        versionCodes: ['VER_002'],
      };

      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      projectRepository.findOne.mockResolvedValue(null);

      await expect(playlistsService.createFromVersions(createDto, mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for non-existent versions', async () => {
      const createDto: CreatePlaylistFromVersionsDto = {
        code: 'PL_INVALID',
        name: 'Playlist',
        projectId: 123,
        versionCodes: ['NON_EXISTENT'],
      };

      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      projectRepository.findOne.mockResolvedValue(mockProject);
      versionRepository.findBy.mockResolvedValue([]); // No versions found

      await expect(playlistsService.createFromVersions(createDto, mockUserContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should verify user has contributor access', async () => {
      const createDto: CreatePlaylistFromVersionsDto = {
        code: 'PL_002',
        name: 'Playlist',
        projectId: 123,
        versionCodes: ['VER_002'],
      };

      projectAccessService.verifyProjectAccess.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(playlistsService.createFromVersions(createDto, mockUserContext)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Playlist Deletion', () => {
    it('should delete playlist with contributor access', async () => {
      playlistRepository.findOne.mockResolvedValue({
        ...mockPlaylist,
        project: mockProject,
      });
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      playlistRepository.delete.mockResolvedValue({ affected: 1 });
      versionRepository.findBy.mockResolvedValue([mockVersion, mockVersion2]);

      await playlistsService.remove(6001, mockUserContext);

      expect(playlistRepository.delete).toHaveBeenCalledWith(6001);
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent playlist', async () => {
      playlistRepository.findOne.mockResolvedValue(null);

      await expect(playlistsService.remove(9999, mockUserContext)).rejects.toThrow(NotFoundException);
    });

    it('should verify user has contributor access before deletion', async () => {
      playlistRepository.findOne.mockResolvedValue({
        ...mockPlaylist,
        project: mockProject,
      });
      projectAccessService.verifyProjectAccess.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );
      versionRepository.findBy.mockResolvedValue([mockVersion, mockVersion2]);

      await expect(playlistsService.remove(6001, mockUserContext)).rejects.toThrow(ForbiddenException);
    });
  });
});

