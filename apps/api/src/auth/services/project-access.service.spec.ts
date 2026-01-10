import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import { ProjectAccessService, UserContext } from './project-access.service';
import {
  ProjectPermission,
  ProjectRole,
  Project,
  Episode,
  Sequence,
  Shot,
} from '../../entities';

describe('ProjectAccessService', () => {
  let service: ProjectAccessService;
  let projectPermissionRepository: jest.Mocked<Repository<ProjectPermission>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let episodeRepository: jest.Mocked<Repository<Episode>>;
  let sequenceRepository: jest.Mocked<Repository<Sequence>>;
  let shotRepository: jest.Mocked<Repository<Shot>>;

  const mockAdminContext: UserContext = {
    userId: 1,
    role: 'admin',
  };

  const mockUserContext: UserContext = {
    userId: 2,
    role: 'director',
  };

  const mockProject: Project = {
    id: 1,
    code: 'PROJ_001',
    name: 'Test Project',
    description: 'Test description',
    statusId: 'status-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Project;

  const mockProjectPermission: ProjectPermission = {
    id: 1,
    userId: 2,
    projectId: 1,
    role: ProjectRole.CONTRIBUTOR,
    createdAt: new Date(),
  } as ProjectPermission;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectAccessService,
        {
          provide: getRepositoryToken(ProjectPermission),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            find: jest.fn(),
            manager: {
              getRepository: jest.fn(),
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
          provide: getRepositoryToken(Sequence),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Shot),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectAccessService>(ProjectAccessService);
    projectPermissionRepository = module.get(
      getRepositoryToken(ProjectPermission),
    );
    projectRepository = module.get(getRepositoryToken(Project));
    episodeRepository = module.get(getRepositoryToken(Episode));
    sequenceRepository = module.get(getRepositoryToken(Sequence));
    shotRepository = module.get(getRepositoryToken(Shot));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isAdmin', () => {
    it('should return true for admin user', () => {
      expect(service.isAdmin(mockAdminContext)).toBe(true);
    });

    it('should return false for non-admin user', () => {
      expect(service.isAdmin(mockUserContext)).toBe(false);
    });

    it('should return false when userContext is undefined', () => {
      expect(service.isAdmin(undefined)).toBe(false);
    });

    it('should return false when role is not admin', () => {
      expect(service.isAdmin({ userId: 1, role: 'director' })).toBe(false);
    });
  });

  describe('getAccessibleProjectIds', () => {
    it('should return all project IDs for admin user', async () => {
      const projects = [
        { id: 1 } as Project,
        { id: 2 } as Project,
        { id: 3 } as Project,
      ];
      projectRepository.find.mockResolvedValue(projects);

      const result = await service.getAccessibleProjectIds(mockAdminContext);

      expect(result).toEqual([1, 2, 3]);
      expect(projectRepository.find).toHaveBeenCalledWith({
        select: ['id'],
      });
      expect(projectPermissionRepository.find).not.toHaveBeenCalled();
    });

    it('should return project IDs from permissions for non-admin user', async () => {
      const permissions = [
        { projectId: 1 } as ProjectPermission,
        { projectId: 2 } as ProjectPermission,
      ];
      projectPermissionRepository.find.mockResolvedValue(permissions);

      const result = await service.getAccessibleProjectIds(mockUserContext);

      expect(result).toEqual([1, 2]);
      expect(projectPermissionRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserContext.userId },
        select: ['projectId'],
      });
      expect(projectRepository.find).not.toHaveBeenCalled();
    });

    it('should return empty array when user has no permissions', async () => {
      projectPermissionRepository.find.mockResolvedValue([]);

      const result = await service.getAccessibleProjectIds(mockUserContext);

      expect(result).toEqual([]);
    });
  });

  describe('hasProjectPermission', () => {
    it('should return true for admin user regardless of role', async () => {
      const result = await service.hasProjectPermission(
        1,
        mockAdminContext,
        ProjectRole.OWNER,
      );

      expect(result).toBe(true);
      expect(projectPermissionRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return false when user has no permission', async () => {
      projectPermissionRepository.findOne.mockResolvedValue(null);

      const result = await service.hasProjectPermission(
        1,
        mockUserContext,
        ProjectRole.VIEWER,
      );

      expect(result).toBe(false);
      expect(projectPermissionRepository.findOne).toHaveBeenCalledWith({
        where: { projectId: 1, userId: mockUserContext.userId },
      });
    });

    it('should return true when user has OWNER role and requires VIEWER', async () => {
      const permission = {
        ...mockProjectPermission,
        role: ProjectRole.OWNER,
      };
      projectPermissionRepository.findOne.mockResolvedValue(permission);

      const result = await service.hasProjectPermission(
        1,
        mockUserContext,
        ProjectRole.VIEWER,
      );

      expect(result).toBe(true);
    });

    it('should return true when user has OWNER role and requires CONTRIBUTOR', async () => {
      const permission = {
        ...mockProjectPermission,
        role: ProjectRole.OWNER,
      };
      projectPermissionRepository.findOne.mockResolvedValue(permission);

      const result = await service.hasProjectPermission(
        1,
        mockUserContext,
        ProjectRole.CONTRIBUTOR,
      );

      expect(result).toBe(true);
    });

    it('should return true when user has OWNER role and requires OWNER', async () => {
      const permission = {
        ...mockProjectPermission,
        role: ProjectRole.OWNER,
      };
      projectPermissionRepository.findOne.mockResolvedValue(permission);

      const result = await service.hasProjectPermission(
        1,
        mockUserContext,
        ProjectRole.OWNER,
      );

      expect(result).toBe(true);
    });

    it('should return true when user has CONTRIBUTOR role and requires VIEWER', async () => {
      const permission = {
        ...mockProjectPermission,
        role: ProjectRole.CONTRIBUTOR,
      };
      projectPermissionRepository.findOne.mockResolvedValue(permission);

      const result = await service.hasProjectPermission(
        1,
        mockUserContext,
        ProjectRole.VIEWER,
      );

      expect(result).toBe(true);
    });

    it('should return true when user has CONTRIBUTOR role and requires CONTRIBUTOR', async () => {
      const permission = {
        ...mockProjectPermission,
        role: ProjectRole.CONTRIBUTOR,
      };
      projectPermissionRepository.findOne.mockResolvedValue(permission);

      const result = await service.hasProjectPermission(
        1,
        mockUserContext,
        ProjectRole.CONTRIBUTOR,
      );

      expect(result).toBe(true);
    });

    it('should return false when user has CONTRIBUTOR role and requires OWNER', async () => {
      const permission = {
        ...mockProjectPermission,
        role: ProjectRole.CONTRIBUTOR,
      };
      projectPermissionRepository.findOne.mockResolvedValue(permission);

      const result = await service.hasProjectPermission(
        1,
        mockUserContext,
        ProjectRole.OWNER,
      );

      expect(result).toBe(false);
    });

    it('should return true when user has VIEWER role and requires VIEWER', async () => {
      const permission = {
        ...mockProjectPermission,
        role: ProjectRole.VIEWER,
      };
      projectPermissionRepository.findOne.mockResolvedValue(permission);

      const result = await service.hasProjectPermission(
        1,
        mockUserContext,
        ProjectRole.VIEWER,
      );

      expect(result).toBe(true);
    });

    it('should return false when user has VIEWER role and requires CONTRIBUTOR', async () => {
      const permission = {
        ...mockProjectPermission,
        role: ProjectRole.VIEWER,
      };
      projectPermissionRepository.findOne.mockResolvedValue(permission);

      const result = await service.hasProjectPermission(
        1,
        mockUserContext,
        ProjectRole.CONTRIBUTOR,
      );

      expect(result).toBe(false);
    });

    it('should return false when user has VIEWER role and requires OWNER', async () => {
      const permission = {
        ...mockProjectPermission,
        role: ProjectRole.VIEWER,
      };
      projectPermissionRepository.findOne.mockResolvedValue(permission);

      const result = await service.hasProjectPermission(
        1,
        mockUserContext,
        ProjectRole.OWNER,
      );

      expect(result).toBe(false);
    });

    it('should default to VIEWER role when minRole is not provided', async () => {
      const permission = {
        ...mockProjectPermission,
        role: ProjectRole.VIEWER,
      };
      projectPermissionRepository.findOne.mockResolvedValue(permission);

      const result = await service.hasProjectPermission(1, mockUserContext);

      expect(result).toBe(true);
    });
  });

  describe('verifyProjectAccess', () => {
    it('should not throw for admin user', async () => {
      jest
        .spyOn(service, 'hasProjectPermission')
        .mockResolvedValue(true);

      await expect(
        service.verifyProjectAccess(1, mockAdminContext, ProjectRole.OWNER),
      ).resolves.not.toThrow();
    });

    it('should not throw when user has permission', async () => {
      jest
        .spyOn(service, 'hasProjectPermission')
        .mockResolvedValue(true);

      await expect(
        service.verifyProjectAccess(1, mockUserContext, ProjectRole.VIEWER),
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user has no permission', async () => {
      jest
        .spyOn(service, 'hasProjectPermission')
        .mockResolvedValue(false);

      await expect(
        service.verifyProjectAccess(1, mockUserContext, ProjectRole.VIEWER),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.verifyProjectAccess(1, mockUserContext, ProjectRole.VIEWER),
      ).rejects.toThrow('You do not have access to this project');
    });

    it('should default to VIEWER role when minRole is not provided', async () => {
      jest
        .spyOn(service, 'hasProjectPermission')
        .mockResolvedValue(true);

      await expect(
        service.verifyProjectAccess(1, mockUserContext),
      ).resolves.not.toThrow();

      expect(service.hasProjectPermission).toHaveBeenCalledWith(
        1,
        mockUserContext,
        ProjectRole.VIEWER,
      );
    });
  });

  describe('getProjectIdFromEpisode', () => {
    it('should return projectId when episode exists', async () => {
      const episode = { id: 1, projectId: 1 } as Episode;
      episodeRepository.findOne.mockResolvedValue(episode);

      const result = await service.getProjectIdFromEpisode(1);

      expect(result).toBe(1);
      expect(episodeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        select: ['projectId'],
      });
    });

    it('should return null when episode does not exist', async () => {
      episodeRepository.findOne.mockResolvedValue(null);

      const result = await service.getProjectIdFromEpisode(999);

      expect(result).toBeNull();
    });

    it('should return null when episode has no projectId', async () => {
      const episode = { id: 1, projectId: null } as Episode;
      episodeRepository.findOne.mockResolvedValue(episode);

      const result = await service.getProjectIdFromEpisode(1);

      expect(result).toBeNull();
    });
  });

  describe('getProjectIdFromSequence', () => {
    it('should return projectId when sequence and episode exist', async () => {
      const sequence = { id: 1, episodeId: 1 } as Sequence;
      const episode = { id: 1, projectId: 1 } as Episode;
      sequenceRepository.findOne.mockResolvedValue(sequence);
      episodeRepository.findOne.mockResolvedValue(episode);

      const result = await service.getProjectIdFromSequence(1);

      expect(result).toBe(1);
      expect(sequenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        select: ['episodeId'],
      });
    });

    it('should return null when sequence does not exist', async () => {
      sequenceRepository.findOne.mockResolvedValue(null);

      const result = await service.getProjectIdFromSequence(999);

      expect(result).toBeNull();
      expect(episodeRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return null when sequence has no episodeId', async () => {
      const sequence = { id: 1, episodeId: null } as Sequence;
      sequenceRepository.findOne.mockResolvedValue(sequence);

      const result = await service.getProjectIdFromSequence(1);

      expect(result).toBeNull();
      expect(episodeRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return null when episode does not exist', async () => {
      const sequence = { id: 1, episodeId: 1 } as Sequence;
      sequenceRepository.findOne.mockResolvedValue(sequence);
      episodeRepository.findOne.mockResolvedValue(null);

      const result = await service.getProjectIdFromSequence(1);

      expect(result).toBeNull();
    });
  });

  describe('getProjectIdFromShot', () => {
    it('should return projectId when shot, sequence and episode exist', async () => {
      const shot = { id: 1, sequenceId: 1 } as Shot;
      const sequence = { id: 1, episodeId: 1 } as Sequence;
      const episode = { id: 1, projectId: 1 } as Episode;
      shotRepository.findOne.mockResolvedValue(shot);
      sequenceRepository.findOne.mockResolvedValue(sequence);
      episodeRepository.findOne.mockResolvedValue(episode);

      const result = await service.getProjectIdFromShot(1);

      expect(result).toBe(1);
      expect(shotRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        select: ['sequenceId'],
      });
    });

    it('should return null when shot does not exist', async () => {
      shotRepository.findOne.mockResolvedValue(null);

      const result = await service.getProjectIdFromShot(999);

      expect(result).toBeNull();
      expect(sequenceRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return null when shot has no sequenceId', async () => {
      const shot = { id: 1, sequenceId: null } as Shot;
      shotRepository.findOne.mockResolvedValue(shot);

      const result = await service.getProjectIdFromShot(1);

      expect(result).toBeNull();
      expect(sequenceRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return null when sequence does not exist', async () => {
      const shot = { id: 1, sequenceId: 1 } as Shot;
      shotRepository.findOne.mockResolvedValue(shot);
      sequenceRepository.findOne.mockResolvedValue(null);

      const result = await service.getProjectIdFromShot(1);

      expect(result).toBeNull();
    });
  });

  describe('verifyEpisodeAccess', () => {
    it('should verify access when episode exists and user has permission', async () => {
      const episode = { id: 1, projectId: 1 } as Episode;
      episodeRepository.findOne.mockResolvedValue(episode);
      jest
        .spyOn(service, 'verifyProjectAccess')
        .mockResolvedValue(undefined);

      await expect(
        service.verifyEpisodeAccess(1, mockUserContext, ProjectRole.VIEWER),
      ).resolves.not.toThrow();

      expect(service.verifyProjectAccess).toHaveBeenCalledWith(
        1,
        mockUserContext,
        ProjectRole.VIEWER,
      );
    });

    it('should throw ForbiddenException when episode does not exist', async () => {
      episodeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.verifyEpisodeAccess(999, mockUserContext, ProjectRole.VIEWER),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.verifyEpisodeAccess(999, mockUserContext, ProjectRole.VIEWER),
      ).rejects.toThrow('Episode not found or not associated with a project');
    });

    it('should throw ForbiddenException when episode has no projectId', async () => {
      const episode = { id: 1, projectId: null } as Episode;
      episodeRepository.findOne.mockResolvedValue(episode);

      await expect(
        service.verifyEpisodeAccess(1, mockUserContext, ProjectRole.VIEWER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should default to VIEWER role when minRole is not provided', async () => {
      const episode = { id: 1, projectId: 1 } as Episode;
      episodeRepository.findOne.mockResolvedValue(episode);
      jest
        .spyOn(service, 'verifyProjectAccess')
        .mockResolvedValue(undefined);

      await expect(
        service.verifyEpisodeAccess(1, mockUserContext),
      ).resolves.not.toThrow();

      expect(service.verifyProjectAccess).toHaveBeenCalledWith(
        1,
        mockUserContext,
        ProjectRole.VIEWER,
      );
    });
  });

  describe('verifySequenceAccess', () => {
    it('should verify access when sequence exists and user has permission', async () => {
      const sequence = { id: 1, episodeId: 1 } as Sequence;
      const episode = { id: 1, projectId: 1 } as Episode;
      sequenceRepository.findOne.mockResolvedValue(sequence);
      episodeRepository.findOne.mockResolvedValue(episode);
      jest
        .spyOn(service, 'verifyProjectAccess')
        .mockResolvedValue(undefined);

      await expect(
        service.verifySequenceAccess(1, mockUserContext, ProjectRole.VIEWER),
      ).resolves.not.toThrow();

      expect(service.verifyProjectAccess).toHaveBeenCalledWith(
        1,
        mockUserContext,
        ProjectRole.VIEWER,
      );
    });

    it('should throw ForbiddenException when sequence does not exist', async () => {
      sequenceRepository.findOne.mockResolvedValue(null);

      await expect(
        service.verifySequenceAccess(999, mockUserContext, ProjectRole.VIEWER),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.verifySequenceAccess(999, mockUserContext, ProjectRole.VIEWER),
      ).rejects.toThrow('Sequence not found or not associated with a project');
    });

    it('should throw ForbiddenException when sequence has no episodeId', async () => {
      const sequence = { id: 1, episodeId: null } as Sequence;
      sequenceRepository.findOne.mockResolvedValue(sequence);

      await expect(
        service.verifySequenceAccess(1, mockUserContext, ProjectRole.VIEWER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should default to VIEWER role when minRole is not provided', async () => {
      const sequence = { id: 1, episodeId: 1 } as Sequence;
      const episode = { id: 1, projectId: 1 } as Episode;
      sequenceRepository.findOne.mockResolvedValue(sequence);
      episodeRepository.findOne.mockResolvedValue(episode);
      jest
        .spyOn(service, 'verifyProjectAccess')
        .mockResolvedValue(undefined);

      await expect(
        service.verifySequenceAccess(1, mockUserContext),
      ).resolves.not.toThrow();

      expect(service.verifyProjectAccess).toHaveBeenCalledWith(
        1,
        mockUserContext,
        ProjectRole.VIEWER,
      );
    });
  });

  describe('verifyShotAccess', () => {
    it('should verify access when shot exists and user has permission', async () => {
      const shot = { id: 1, sequenceId: 1 } as Shot;
      const sequence = { id: 1, episodeId: 1 } as Sequence;
      const episode = { id: 1, projectId: 1 } as Episode;
      shotRepository.findOne.mockResolvedValue(shot);
      sequenceRepository.findOne.mockResolvedValue(sequence);
      episodeRepository.findOne.mockResolvedValue(episode);
      jest
        .spyOn(service, 'verifyProjectAccess')
        .mockResolvedValue(undefined);

      await expect(
        service.verifyShotAccess(1, mockUserContext, ProjectRole.VIEWER),
      ).resolves.not.toThrow();

      expect(service.verifyProjectAccess).toHaveBeenCalledWith(
        1,
        mockUserContext,
        ProjectRole.VIEWER,
      );
    });

    it('should throw ForbiddenException when shot does not exist', async () => {
      shotRepository.findOne.mockResolvedValue(null);

      await expect(
        service.verifyShotAccess(999, mockUserContext, ProjectRole.VIEWER),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.verifyShotAccess(999, mockUserContext, ProjectRole.VIEWER),
      ).rejects.toThrow('Shot not found or not associated with a project');
    });

    it('should throw ForbiddenException when shot has no sequenceId', async () => {
      const shot = { id: 1, sequenceId: null } as Shot;
      shotRepository.findOne.mockResolvedValue(shot);

      await expect(
        service.verifyShotAccess(1, mockUserContext, ProjectRole.VIEWER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should default to VIEWER role when minRole is not provided', async () => {
      const shot = { id: 1, sequenceId: 1 } as Shot;
      const sequence = { id: 1, episodeId: 1 } as Sequence;
      const episode = { id: 1, projectId: 1 } as Episode;
      shotRepository.findOne.mockResolvedValue(shot);
      sequenceRepository.findOne.mockResolvedValue(sequence);
      episodeRepository.findOne.mockResolvedValue(episode);
      jest
        .spyOn(service, 'verifyProjectAccess')
        .mockResolvedValue(undefined);

      await expect(
        service.verifyShotAccess(1, mockUserContext),
      ).resolves.not.toThrow();

      expect(service.verifyProjectAccess).toHaveBeenCalledWith(
        1,
        mockUserContext,
        ProjectRole.VIEWER,
      );
    });
  });

  describe('getProjectIdFromVersion', () => {
    it('should return null when entityId is null', async () => {
      const version = { entityId: null, entityType: 'shot' };

      const result = await service.getProjectIdFromVersion(version);

      expect(result).toBeNull();
    });

    it('should return null when entityId is undefined', async () => {
      const version = { entityId: undefined, entityType: 'shot' };

      const result = await service.getProjectIdFromVersion(version);

      expect(result).toBeNull();
    });

    it('should return projectId for shot entity type', async () => {
      const version = { entityId: 1, entityType: 'shot' };
      const shot = { id: 1, sequenceId: 1 } as Shot;
      const sequence = { id: 1, episodeId: 1 } as Sequence;
      const episode = { id: 1, projectId: 1 } as Episode;
      shotRepository.findOne.mockResolvedValue(shot);
      sequenceRepository.findOne.mockResolvedValue(sequence);
      episodeRepository.findOne.mockResolvedValue(episode);

      const result = await service.getProjectIdFromVersion(version);

      expect(result).toBe(1);
    });

    it('should return projectId for sequence entity type', async () => {
      const version = { entityId: 1, entityType: 'sequence' };
      const sequence = { id: 1, episodeId: 1 } as Sequence;
      const episode = { id: 1, projectId: 1 } as Episode;
      sequenceRepository.findOne.mockResolvedValue(sequence);
      episodeRepository.findOne.mockResolvedValue(episode);

      const result = await service.getProjectIdFromVersion(version);

      expect(result).toBe(1);
    });

    it('should return projectId for asset entity type', async () => {
      const version = { entityId: 1, entityType: 'asset' };
      const mockAssetRepository = {
        findOne: jest.fn().mockResolvedValue({ id: 1, projectId: 1 }),
      };
      projectRepository.manager.getRepository = jest
        .fn()
        .mockReturnValue(mockAssetRepository);

      const result = await service.getProjectIdFromVersion(version);

      expect(result).toBe(1);
      expect(projectRepository.manager.getRepository).toHaveBeenCalledWith(
        'Asset',
      );
    });

    it('should return projectId for playlist entity type', async () => {
      const version = { entityId: 1, entityType: 'playlist' };
      const mockPlaylistRepository = {
        findOne: jest.fn().mockResolvedValue({ id: 1, projectId: 1 }),
      };
      projectRepository.manager.getRepository = jest
        .fn()
        .mockReturnValue(mockPlaylistRepository);

      const result = await service.getProjectIdFromVersion(version);

      expect(result).toBe(1);
      expect(projectRepository.manager.getRepository).toHaveBeenCalledWith(
        'Playlist',
      );
    });

    it('should return null for unknown entity type', async () => {
      const version = { entityId: 1, entityType: 'unknown' };

      const result = await service.getProjectIdFromVersion(version);

      expect(result).toBeNull();
    });

    it('should handle case-insensitive entity types', async () => {
      const version = { entityId: 1, entityType: 'SHOT' };
      const shot = { id: 1, sequenceId: 1 } as Shot;
      const sequence = { id: 1, episodeId: 1 } as Sequence;
      const episode = { id: 1, projectId: 1 } as Episode;
      shotRepository.findOne.mockResolvedValue(shot);
      sequenceRepository.findOne.mockResolvedValue(sequence);
      episodeRepository.findOne.mockResolvedValue(episode);

      const result = await service.getProjectIdFromVersion(version);

      expect(result).toBe(1);
    });

    it('should return null when asset does not exist', async () => {
      const version = { entityId: 1, entityType: 'asset' };
      const mockAssetRepository = {
        findOne: jest.fn().mockResolvedValue(null),
      };
      projectRepository.manager.getRepository = jest
        .fn()
        .mockReturnValue(mockAssetRepository);

      const result = await service.getProjectIdFromVersion(version);

      expect(result).toBeNull();
    });

    it('should return null when asset has no projectId', async () => {
      const version = { entityId: 1, entityType: 'asset' };
      const mockAssetRepository = {
        findOne: jest.fn().mockResolvedValue({ id: 1, projectId: null }),
      };
      projectRepository.manager.getRepository = jest
        .fn()
        .mockReturnValue(mockAssetRepository);

      const result = await service.getProjectIdFromVersion(version);

      expect(result).toBeNull();
    });
  });

  describe('verifyVersionAccess', () => {
    it('should verify access when version exists and user has permission', async () => {
      const version = { entityId: 1, entityType: 'shot' };
      const shot = { id: 1, sequenceId: 1 } as Shot;
      const sequence = { id: 1, episodeId: 1 } as Sequence;
      const episode = { id: 1, projectId: 1 } as Episode;
      shotRepository.findOne.mockResolvedValue(shot);
      sequenceRepository.findOne.mockResolvedValue(sequence);
      episodeRepository.findOne.mockResolvedValue(episode);
      jest
        .spyOn(service, 'verifyProjectAccess')
        .mockResolvedValue(undefined);

      await expect(
        service.verifyVersionAccess(version, mockUserContext, ProjectRole.VIEWER),
      ).resolves.not.toThrow();

      expect(service.verifyProjectAccess).toHaveBeenCalledWith(
        1,
        mockUserContext,
        ProjectRole.VIEWER,
      );
    });

    it('should throw ForbiddenException when version has no projectId', async () => {
      const version = { entityId: null, entityType: 'shot' };
      jest
        .spyOn(service, 'getProjectIdFromVersion')
        .mockResolvedValue(null);

      await expect(
        service.verifyVersionAccess(version, mockUserContext, ProjectRole.VIEWER),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.verifyVersionAccess(version, mockUserContext, ProjectRole.VIEWER),
      ).rejects.toThrow('Version not found or not associated with a project');
    });

    it('should default to VIEWER role when minRole is not provided', async () => {
      const version = { entityId: 1, entityType: 'shot' };
      jest
        .spyOn(service, 'getProjectIdFromVersion')
        .mockResolvedValue(1);
      jest
        .spyOn(service, 'verifyProjectAccess')
        .mockResolvedValue(undefined);

      await expect(
        service.verifyVersionAccess(version, mockUserContext),
      ).resolves.not.toThrow();

      expect(service.verifyProjectAccess).toHaveBeenCalledWith(
        1,
        mockUserContext,
        ProjectRole.VIEWER,
      );
    });
  });
});

