import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { VersionsService } from './versions.service';
import { Version } from '../entities/version.entity';
import { Shot } from '../entities/shot.entity';
import { Asset } from '../entities/asset.entity';
import { Playlist } from '../entities/playlist.entity';
import { Sequence } from '../entities/sequence.entity';
import { Status } from '../entities/status.entity';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateVersionDto, VersionEntityType } from './dto/create-version.dto';
import { UpdateVersionDto } from './dto/update-version.dto';
import { CreateShotWithVersionDto } from './dto/create-shot-with-version.dto';
import { CreateAssetWithVersionDto } from './dto/create-asset-with-version.dto';
import { CreatePlaylistWithVersionDto } from './dto/create-playlist-with-version.dto';
import { CreateSequenceWithVersionDto } from './dto/create-sequence-with-version.dto';
import { VersionStatus } from '../entities/version.entity';
import { MinioService } from '../files/minio.service';
import { ImageOptimizationService } from '../files/image-optimization.service';
import { SlackService } from '../notifications/slack/slack.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectAccessService } from '../auth/services/project-access.service';

describe('VersionsService', () => {
  let service: VersionsService;
  let versionsRepository: any;
  let shotRepository: any;
  let assetRepository: any;
  let playlistRepository: any;
  let sequenceRepository: any;
  let minioService: any;
  let slackService: any;
  let notificationsService: any;
  let dataSource: any;
  let module: TestingModule;

  const mockVersion: Version = {
    id: 123,
    code: 'VER_001',
    name: 'Test Version',
    description: 'Test description',
    versionNumber: 1,
    statusId: 'status-uuid-wip',
    entityId: 456,
    entityCode: 'SH_001',
    entityType: VersionEntityType.SHOT,
    latest: true,
    filePath: 'http://localhost:9000/media/path/file.mp4',
    thumbnailPath: 'http://localhost:9000/thumbnails/path/thumb.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Version;

  const mockShot: Shot = {
    id: 456,
    code: 'SH_001',
    name: 'Test Shot',
  } as Shot;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getMany: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
  };

  const mockUpdateQueryBuilder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        VersionsService,
        {
          provide: getRepositoryToken(Version),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            query: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Shot),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            exist: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Asset),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            exist: jest.fn(),
            manager: {
              getRepository: jest.fn(),
            },
          },
        },
        {
          provide: getRepositoryToken(Playlist),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            manager: {
              getRepository: jest.fn(),
            },
          },
        },
        {
          provide: getRepositoryToken(Sequence),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            exist: jest.fn(),
            manager: {
              getRepository: jest.fn(),
            },
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((callback) => callback({})),
          },
        },
        {
          provide: MinioService,
          useValue: {
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
            getValidationOptions: jest.fn(() => ({})),
            extractBucketAndPath: jest
              .fn()
              .mockImplementation((path: string, defaultBucket?: string) => {
                if (!path) return null;
                // If path is a full URL, extract just the filename
                const pathOnly = path.includes('/') ? path.split('/').pop() || path : path;
                return { bucket: defaultBucket || 'thumbnails', path: pathOnly };
              }),
          },
        },
        {
          provide: ImageOptimizationService,
          useValue: {
            optimizeImage: jest.fn().mockResolvedValue(Buffer.from('optimized')),
          },
        },
        {
          provide: SlackService,
          useValue: {
            notifyVersionApproved: jest.fn(),
            notifyVersionRejected: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            notifyVersionApproved: jest.fn(),
            notifyVersionRejected: jest.fn(),
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
            verifyVersionAccess: jest.fn().mockResolvedValue(undefined),
            getProjectIdFromVersion: jest.fn().mockResolvedValue(123),
          },
        },
      ],
    }).compile();

    service = module.get<VersionsService>(VersionsService);
    versionsRepository = module.get(getRepositoryToken(Version));
    shotRepository = module.get(getRepositoryToken(Shot));
    assetRepository = module.get(getRepositoryToken(Asset));
    playlistRepository = module.get(getRepositoryToken(Playlist));
    sequenceRepository = module.get(getRepositoryToken(Sequence));
    minioService = module.get(MinioService);
    slackService = module.get(SlackService);
    notificationsService = module.get(NotificationsService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a version successfully with entityCode', async () => {
      const createDto: CreateVersionDto = {
        code: 'VER_001',
        name: 'Test Version',
        entityCode: 'SH_001',
        entityType: VersionEntityType.SHOT,
        status: VersionStatus.WIP,
      };

      versionsRepository.findOne.mockResolvedValue(null); // No duplicate
      // Mock query builder for max version query
      const maxVersionQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxVersion: null }),
      };

      // Mock update query builder for unmarking latest
      versionsRepository.createQueryBuilder
        .mockReturnValueOnce(maxVersionQueryBuilder)
        .mockReturnValue(mockUpdateQueryBuilder);
      mockUpdateQueryBuilder.execute.mockResolvedValue({ affected: 0 });
      versionsRepository.create.mockReturnValue(mockVersion);
      versionsRepository.save.mockResolvedValue(mockVersion);

      const result = await service.create(createDto, undefined);

      expect(versionsRepository.findOne).toHaveBeenCalledWith({
        where: { code: createDto.code },
      });
      expect(versionsRepository.create).toHaveBeenCalled();
      expect(versionsRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should create a version successfully with entityId', async () => {
      const createDto: CreateVersionDto = {
        code: 'VER_001',
        name: 'Test Version',
        entityId: 456,
        entityType: VersionEntityType.SHOT,
        status: VersionStatus.WIP,
      };

      versionsRepository.findOne.mockResolvedValue(null); // No duplicate
      // Mock query builder for max version query
      const maxVersionQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxVersion: null }),
      };

      versionsRepository.createQueryBuilder.mockReturnValue(maxVersionQueryBuilder);
      versionsRepository.query = jest.fn().mockResolvedValue([]);
      versionsRepository.find = jest.fn().mockResolvedValue([]);
      versionsRepository.update.mockResolvedValue({ affected: 0 });
      shotRepository.exist = jest.fn().mockResolvedValue(true);
      versionsRepository.create.mockReturnValue(mockVersion);
      versionsRepository.save.mockResolvedValue(mockVersion);

      const result = await service.create(createDto, undefined);

      expect(shotRepository.exist).toHaveBeenCalledWith({
        where: { id: 456 },
      });
      expect(versionsRepository.create).toHaveBeenCalled();
      expect(versionsRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw ConflictException when code already exists', async () => {
      const createDto: CreateVersionDto = {
        code: 'VER_001',
        name: 'Test Version',
        entityCode: 'SH_001',
        entityType: VersionEntityType.SHOT,
      };

      versionsRepository.findOne.mockResolvedValue(mockVersion); // Duplicate exists

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when neither entityCode nor entityId provided', async () => {
      const createDto: CreateVersionDto = {
        code: 'VER_001',
        name: 'Test Version',
        entityType: VersionEntityType.SHOT,
      } as CreateVersionDto;

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Either entityCode or entityId must be provided',
      );
    });

    it('should throw BadRequestException when entityType missing', async () => {
      const createDto: CreateVersionDto = {
        code: 'VER_001',
        name: 'Test Version',
        entityCode: 'SH_001',
      } as CreateVersionDto;

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow('entityType must be provided');
    });

    it('should unmark other latest versions when creating new latest', async () => {
      const createDto: CreateVersionDto = {
        code: 'VER_001',
        name: 'Test Version',
        entityCode: 'SH_001',
        entityType: VersionEntityType.SHOT,
        latest: true,
      };

      const maxVersionQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxVersion: '2' }),
      };

      versionsRepository.createQueryBuilder.mockReturnValue(maxVersionQueryBuilder);
      versionsRepository.update.mockResolvedValue({ affected: 1 });
      versionsRepository.create.mockReturnValue(mockVersion);
      versionsRepository.save.mockResolvedValue(mockVersion);

      await service.create(createDto, undefined);

      expect(versionsRepository.update).toHaveBeenCalledWith(
        {
          entityCode: 'SH_001',
          entityType: 'shot',
          latest: true,
        },
        { latest: false },
      );
    });
  });

  describe('findAll', () => {
    it('should return all versions without filters', async () => {
      const findAllQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockVersion]),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
      };
      versionsRepository.createQueryBuilder.mockReturnValue(findAllQueryBuilder);

      const result = await service.findAll(undefined, undefined, undefined, undefined, undefined);

      expect(findAllQueryBuilder.orderBy).toHaveBeenCalled();
      expect(result).toEqual([{ ...mockVersion, status: null }]);
    });

    it('should apply entityCode filter', async () => {
      const findAllQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockVersion]),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
      };
      versionsRepository.createQueryBuilder.mockReturnValue(findAllQueryBuilder);

      await service.findAll('SH_001', undefined, undefined, undefined, undefined);

      expect(findAllQueryBuilder.andWhere).toHaveBeenCalledWith(
        'version.entityCode = :entityCode',
        {
          entityCode: 'SH_001',
        },
      );
    });

    it('should apply entityType filter', async () => {
      const findAllQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockVersion]),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
      };
      versionsRepository.createQueryBuilder.mockReturnValue(findAllQueryBuilder);

      await service.findAll(undefined, VersionEntityType.SHOT, undefined, undefined, undefined);

      expect(findAllQueryBuilder.andWhere).toHaveBeenCalledWith(
        'version.entityType = :entityType',
        {
          entityType: VersionEntityType.SHOT,
        },
      );
    });

    it('should apply latest filter', async () => {
      const findAllQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockVersion]),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
      };
      versionsRepository.createQueryBuilder.mockReturnValue(findAllQueryBuilder);

      await service.findAll(undefined, undefined, true, undefined, undefined);

      expect(findAllQueryBuilder.andWhere).toHaveBeenCalledWith('version.latest = :latest', {
        latest: true,
      });
    });
  });

  describe('findOneById', () => {
    it('should return a version by id', async () => {
      versionsRepository.findOne.mockResolvedValue(mockVersion);

      const result = await service.findOneById(123, undefined);

      expect(versionsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 123 },
        relations: ['status'],
      });
      expect(result).toEqual({ ...mockVersion, status: null });
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.findOneById(0)).rejects.toThrow(BadRequestException);
      await expect(service.findOneById(-1)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when version not found', async () => {
      versionsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOneById(999)).rejects.toThrow('Version with ID 999 not found');
    });
  });

  describe('findOne', () => {
    it('should return a version by code', async () => {
      versionsRepository.findOne.mockResolvedValue(mockVersion);

      const result = await service.findOne('VER_001', undefined);

      expect(versionsRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'VER_001' },
        relations: ['status'],
      });
      expect(result).toEqual({ ...mockVersion, status: null });
    });

    it('should throw NotFoundException when version not found', async () => {
      versionsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('VER_999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a version successfully', async () => {
      const updateDto: UpdateVersionDto = {
        name: 'Updated Version Name',
        statusId: 'status-uuid-review',
      };

      const currentVersion = {
        ...mockVersion,
        status: { id: 'status-uuid-wip', code: 'wip' },
      };

      const updatedVersion = {
        ...mockVersion,
        name: 'Updated Version Name',
        statusId: 'status-uuid-review',
      };

      versionsRepository.findOne
        .mockResolvedValueOnce(currentVersion)
        .mockResolvedValueOnce(updatedVersion);
      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(updatedVersion);
      versionsRepository.createQueryBuilder.mockReturnValue(mockUpdateQueryBuilder);
      mockUpdateQueryBuilder.execute.mockResolvedValue({ affected: 0 });
      versionsRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(123, updateDto, undefined);

      expect(versionsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 123 },
        relations: ['status'],
      });
      expect(versionsRepository.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should update statusUpdatedAt when status changes', async () => {
      const updateDto: UpdateVersionDto = {
        status: VersionStatus.APPROVED,
      };

      const currentVersion = {
        ...mockVersion,
        statusId: 'status-uuid-wip',
        status: { id: 'status-uuid-wip', code: 'wip' },
      };

      const updatedVersion = {
        ...mockVersion,
        statusId: 'status-uuid-approved',
      };

      const mockStatusRepository = module.get(getRepositoryToken(Status));
      // Mock for getStatusCodeById (called first to get current status code)
      mockStatusRepository.findOne.mockImplementation(({ where }) => {
        if (where.code === 'approved') {
          return Promise.resolve({
            id: 'status-uuid-approved',
            code: 'approved',
          });
        }
        return Promise.resolve(null);
      });

      versionsRepository.findOne
        .mockResolvedValueOnce(currentVersion)
        .mockResolvedValueOnce(updatedVersion);
      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(updatedVersion);
      versionsRepository.createQueryBuilder.mockReturnValue(mockUpdateQueryBuilder);
      mockUpdateQueryBuilder.execute.mockResolvedValue({ affected: 0 });
      versionsRepository.update.mockResolvedValue({ affected: 1 });

      await service.update(123, updateDto, undefined);

      expect(versionsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 123 },
        relations: ['status'],
      });
      expect(versionsRepository.update).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          statusId: 'status-uuid-approved',
          statusUpdatedAt: expect.any(Date),
        }),
      );
    });

    it('should unmark other latest versions when marking as latest', async () => {
      const updateDto: UpdateVersionDto = {
        latest: true,
      };

      const versionWithEntityId = {
        ...mockVersion,
        entityId: 456,
        status: { id: 'status-uuid-wip', code: 'wip' },
      };

      versionsRepository.findOne.mockResolvedValueOnce(versionWithEntityId);
      jest.spyOn(service, 'findOneById').mockResolvedValueOnce({
        ...versionWithEntityId,
        latest: true,
      });
      versionsRepository.update
        .mockResolvedValueOnce({ affected: 1 }) // For unmarking other latest
        .mockResolvedValueOnce({ affected: 1 }); // For updating current version

      await service.update(123, updateDto, undefined);

      expect(versionsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 123 },
        relations: ['status'],
      });
      // The update call uses Not(id) from TypeORM, so we check that update was called
      // with the correct structure (entityId, entityType, latest: true, and id: Not(123))
      expect(versionsRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 456,
          entityType: VersionEntityType.SHOT,
          latest: true,
        }),
        { latest: false },
      );
    });

    it('should throw NotFoundException when version not found', async () => {
      const updateDto: UpdateVersionDto = { name: 'Updated Name' };

      versionsRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, updateDto, undefined)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a version successfully', async () => {
      const versionToDelete = {
        ...mockVersion,
        entityId: 456,
        entityType: VersionEntityType.SHOT,
        latest: false,
      };
      versionsRepository.findOne
        .mockResolvedValueOnce(versionToDelete)
        .mockResolvedValueOnce(null); // No other version found
      minioService.deleteFile.mockResolvedValue(undefined);
      versionsRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(123, undefined);

      expect(versionsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 123 },
        relations: ['status'],
      });
      expect(versionsRepository.delete).toHaveBeenCalledWith(123);
    });

    it('should delete associated files from storage', async () => {
      const versionWithFiles = {
        ...mockVersion,
        entityId: 456,
        entityType: VersionEntityType.SHOT,
        thumbnailPath: 'http://localhost:9000/thumbnails/thumb.jpg',
        filePath: 'http://localhost:9000/media/file.mp4',
      };
      versionsRepository.findOne
        .mockResolvedValueOnce(versionWithFiles)
        .mockResolvedValueOnce(null); // No other version found
      minioService.deleteFile.mockResolvedValue(undefined);
      minioService.extractBucketAndPath.mockReturnValue({
        bucket: 'thumbnails',
        path: 'thumb.jpg',
      });
      versionsRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(123, undefined);

      expect(minioService.deleteFile).toHaveBeenCalled();
    });

    it('should assign latest to most recent version if deleted was latest', async () => {
      const versionWithEntityId = {
        ...mockVersion,
        entityId: 456,
        entityType: VersionEntityType.SHOT,
        latest: true,
      };
      const otherVersion = {
        ...versionWithEntityId,
        id: 124,
        code: 'VER_002',
        latest: false,
      };
      versionsRepository.findOne
        .mockResolvedValueOnce(versionWithEntityId)
        .mockResolvedValueOnce(otherVersion);
      minioService.deleteFile.mockResolvedValue(undefined);
      versionsRepository.delete.mockResolvedValue({ affected: 1 });
      versionsRepository.update.mockResolvedValue({ affected: 1 });

      await service.remove(123, undefined);

      expect(versionsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 123 },
        relations: ['status'],
      });
      expect(versionsRepository.update).toHaveBeenCalledWith({ id: 124 }, { latest: true });
    });

    it('should throw NotFoundException when version not found', async () => {
      jest
        .spyOn(service, 'findOneById')
        .mockRejectedValue(new NotFoundException('Version with ID 999 not found'));

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(versionsRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('uploadThumbnail', () => {
    it('should upload thumbnail successfully', async () => {
      const mockFile = { originalname: 'thumb.jpg' } as any;
      const uploadResult = { url: 'http://localhost:9000/thumbnails/new.jpg' };
      const updatedVersion = {
        ...mockVersion,
        thumbnailPath: uploadResult.url,
      };

      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(mockVersion);
      minioService.deleteFile.mockResolvedValue(undefined);
      minioService.uploadFile.mockResolvedValue({ path: 'new.jpg', url: uploadResult.url });
      versionsRepository.update.mockResolvedValue({ affected: 1 });
      versionsRepository.findOne.mockResolvedValue(updatedVersion); // For the final findOne call after update

      const result = await service.uploadThumbnail(123, mockFile);

      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(versionsRepository.update).toHaveBeenCalledWith(123, {
        thumbnailPath: 'new.jpg', // Service stores path, not URL
      });
      expect(result).toBeDefined();
    });

    it('should delete old thumbnail before uploading new one', async () => {
      const mockFile = { originalname: 'thumb.jpg' } as any;
      const uploadResult = { url: 'http://localhost:9000/thumbnails/new.jpg' };
      const versionWithThumbnail = {
        ...mockVersion,
        thumbnailPath: 'http://localhost:9000/thumbnails/old.jpg',
      };
      const updatedVersion = {
        ...versionWithThumbnail,
        thumbnailPath: uploadResult.url,
      };

      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(versionWithThumbnail);
      minioService.deleteFile.mockResolvedValue(undefined);
      minioService.extractBucketAndPath.mockReturnValue({ bucket: 'thumbnails', path: 'old.jpg' });
      minioService.uploadFile.mockResolvedValue({ path: 'new.jpg', url: uploadResult.url });
      versionsRepository.update.mockResolvedValue({ affected: 1 });
      versionsRepository.findOne.mockResolvedValue(updatedVersion); // For the final findOne call after update

      await service.uploadThumbnail(123, mockFile);

      expect(minioService.deleteFile).toHaveBeenCalled();
      expect(minioService.uploadFile).toHaveBeenCalled();
    });

    it('should continue upload even if deleting old thumbnail fails', async () => {
      const mockFile = { originalname: 'thumb.jpg' } as any;
      const uploadResult = { url: 'http://localhost:9000/thumbnails/new.jpg' };
      const versionWithThumbnail = {
        ...mockVersion,
        thumbnailPath: 'http://localhost:9000/thumbnails/old.jpg',
      };
      const updatedVersion = {
        ...versionWithThumbnail,
        thumbnailPath: uploadResult.url,
      };

      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(versionWithThumbnail);
      minioService.deleteFile.mockRejectedValue(new Error('Delete failed'));
      minioService.extractBucketAndPath.mockReturnValue({ bucket: 'thumbnails', path: 'old.jpg' });
      minioService.uploadFile.mockResolvedValue({ path: 'new.jpg', url: uploadResult.url });
      versionsRepository.update.mockResolvedValue({ affected: 1 });
      versionsRepository.findOne.mockResolvedValue(updatedVersion); // For the final findOne call after update

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await service.uploadThumbnail(123, mockFile);

      expect(minioService.deleteFile).toHaveBeenCalled();
      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(versionsRepository.update).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to delete old thumbnail:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should throw NotFoundException when version not found', async () => {
      const mockFile = { originalname: 'thumb.jpg' } as any;

      jest
        .spyOn(service, 'findOneById')
        .mockRejectedValue(new NotFoundException('Version with ID 999 not found'));

      await expect(service.uploadThumbnail(999, mockFile)).rejects.toThrow(NotFoundException);
      expect(minioService.uploadFile).not.toHaveBeenCalled();
    });

    it('should throw error when Minio upload fails', async () => {
      const mockFile = { originalname: 'thumb.jpg' } as any;
      const uploadError = new Error('Minio upload failed');

      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(mockVersion);
      minioService.deleteFile.mockResolvedValue(undefined);
      minioService.uploadFile.mockRejectedValue(uploadError);

      await expect(service.uploadThumbnail(123, mockFile)).rejects.toThrow('Minio upload failed');
      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(versionsRepository.update).not.toHaveBeenCalled();
    });

    it('should handle version without existing thumbnail', async () => {
      const mockFile = { originalname: 'thumb.jpg' } as any;
      const uploadResult = { url: 'http://localhost:9000/thumbnails/new.jpg' };
      const versionWithoutThumbnail = { ...mockVersion, thumbnailPath: null };
      const updatedVersion = {
        ...versionWithoutThumbnail,
        thumbnailPath: uploadResult.url,
      };

      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(versionWithoutThumbnail);
      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(updatedVersion);
      minioService.uploadFile.mockResolvedValue(uploadResult);
      versionsRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.uploadThumbnail(123, mockFile);

      expect(minioService.deleteFile).not.toHaveBeenCalled();
      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockFile = { originalname: 'video.mp4' } as any;
      const uploadResult = { path: 'media/new.mp4', url: 'http://localhost:9000/media/new.mp4' };
      const updatedVersion = { ...mockVersion, filePath: uploadResult.path };

      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(mockVersion);
      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(updatedVersion);
      minioService.deleteFile.mockResolvedValue(undefined);
      minioService.uploadFile.mockResolvedValue(uploadResult);
      versionsRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.uploadFile(123, mockFile);

      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(versionsRepository.update).toHaveBeenCalledWith(123, {
        filePath: uploadResult.path,
      });
      expect(result).toBeDefined();
    });

    it('should delete old file before uploading new one', async () => {
      const mockFile = { originalname: 'video.mp4' } as any;
      const uploadResult = { url: 'http://localhost:9000/media/new.mp4' };
      const versionWithFile = {
        ...mockVersion,
        filePath: 'http://localhost:9000/media/old.mp4',
      };
      const updatedVersion = { ...versionWithFile, filePath: uploadResult.url };

      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(versionWithFile);
      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(updatedVersion);
      minioService.deleteFile.mockResolvedValue(undefined);
      minioService.uploadFile.mockResolvedValue(uploadResult);
      versionsRepository.update.mockResolvedValue({ affected: 1 });

      await service.uploadFile(123, mockFile);

      expect(minioService.deleteFile).toHaveBeenCalledWith('media', expect.any(String));
      expect(minioService.uploadFile).toHaveBeenCalled();
    });

    it('should continue upload even if deleting old file fails', async () => {
      const mockFile = { originalname: 'video.mp4' } as any;
      const uploadResult = { url: 'http://localhost:9000/media/new.mp4' };
      const versionWithFile = {
        ...mockVersion,
        filePath: 'http://localhost:9000/media/old.mp4',
      };
      const updatedVersion = { ...versionWithFile, filePath: uploadResult.url };

      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(versionWithFile);
      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(updatedVersion);
      minioService.deleteFile.mockRejectedValue(new Error('Delete failed'));
      minioService.uploadFile.mockResolvedValue(uploadResult);
      versionsRepository.update.mockResolvedValue({ affected: 1 });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await service.uploadFile(123, mockFile);

      expect(minioService.deleteFile).toHaveBeenCalled();
      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(versionsRepository.update).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to delete old file:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should throw NotFoundException when version not found', async () => {
      const mockFile = { originalname: 'video.mp4' } as any;

      jest
        .spyOn(service, 'findOneById')
        .mockRejectedValue(new NotFoundException('Version with ID 999 not found'));

      await expect(service.uploadFile(999, mockFile)).rejects.toThrow(NotFoundException);
      expect(minioService.uploadFile).not.toHaveBeenCalled();
    });

    it('should throw error when Minio upload fails', async () => {
      const mockFile = { originalname: 'video.mp4' } as any;
      const uploadError = new Error('Minio upload failed');

      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(mockVersion);
      minioService.deleteFile.mockResolvedValue(undefined);
      minioService.uploadFile.mockRejectedValue(uploadError);

      await expect(service.uploadFile(123, mockFile)).rejects.toThrow('Minio upload failed');
      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(versionsRepository.update).not.toHaveBeenCalled();
    });

    it('should handle version without existing file', async () => {
      const mockFile = { originalname: 'video.mp4' } as any;
      const uploadResult = { url: 'http://localhost:9000/media/new.mp4' };
      const versionWithoutFile = {
        ...mockVersion,
        filePath: null,
        thumbnailPath: null, // Also no thumbnail
      };
      const updatedVersion = {
        ...versionWithoutFile,
        filePath: uploadResult.url,
      };

      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(versionWithoutFile);
      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(updatedVersion);
      minioService.uploadFile.mockResolvedValue(uploadResult);
      versionsRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.uploadFile(123, mockFile, undefined);

      expect(minioService.deleteFile).not.toHaveBeenCalled();
      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('createShotWithVersion', () => {
    it('should create shot with version successfully using sequenceId', async () => {
      const dto: CreateShotWithVersionDto = {
        name: 'Test Shot',
        sequenceNumber: 1,
        sequenceId: 789,
        versionCode: 'VER_001',
        versionName: 'Test Version',
      };

      const mockSequence = { id: 789, code: 'SEQ_001' };
      const mockManager = {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        save: jest.fn(),
      };
      mockManager.create.mockReturnValue(mockShot);
      mockManager.save.mockResolvedValueOnce(mockShot).mockResolvedValueOnce(mockVersion);

      dataSource.transaction.mockImplementation((callback) => callback(mockManager));
      sequenceRepository.findOne.mockResolvedValue(mockSequence);

      const result = await service.createShotWithVersion(dto, undefined);

      expect(sequenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 789 },
      });
      expect(mockManager.create).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.shot).toBeDefined();
      expect(result.version).toBeDefined();
    });

    it('should throw BadRequestException when sequenceCode is provided instead of sequenceId', async () => {
      const dto: CreateShotWithVersionDto = {
        name: 'Test Shot',
        sequenceNumber: 1,
        sequenceCode: 'SEQ_001',
        versionCode: 'VER_001',
        versionName: 'Test Version',
      } as any;

      const mockManager = {
        getRepository: jest.fn(),
      };

      dataSource.transaction.mockImplementation((callback) => callback(mockManager));

      await expect(service.createShotWithVersion(dto)).rejects.toThrow(BadRequestException);
      await expect(service.createShotWithVersion(dto)).rejects.toThrow('sequenceId is required');
    });
  });

  describe('createAssetWithVersion', () => {
    it('should create asset with version successfully using projectId', async () => {
      const dto: CreateAssetWithVersionDto = {
        name: 'Test Asset',
        assetType: 'character',
        projectId: 123,
        versionCode: 'VER_001',
        versionName: 'Test Version',
      };

      const mockProject = { id: 123, code: 'PROJ_001' };
      const mockProjectRepo = {
        findOne: jest.fn().mockResolvedValue(mockProject),
      };

      assetRepository.manager.getRepository.mockReturnValue(mockProjectRepo);

      const mockAsset = { id: 456, code: 'CHAR_001' };
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(mockProjectRepo),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        save: jest.fn(),
      };

      mockManager.create.mockReturnValueOnce(mockAsset).mockReturnValueOnce(mockVersion);
      mockManager.save.mockResolvedValueOnce(mockAsset).mockResolvedValueOnce(mockVersion);

      dataSource.transaction.mockImplementation((callback) => callback(mockManager));

      const result = await service.createAssetWithVersion(dto, undefined);

      expect(mockProjectRepo.findOne).toHaveBeenCalledWith({
        where: { id: 123 },
      });
      expect(mockManager.create).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.asset).toBeDefined();
      expect(result.version).toBeDefined();
    });
  });

  describe('createPlaylistWithVersion', () => {
    it('should create playlist with version successfully using projectId', async () => {
      const dto: CreatePlaylistWithVersionDto = {
        name: 'Test Playlist',
        projectId: 123,
        versionCode: 'VER_001',
        versionName: 'Test Version',
      };

      const mockProject = { id: 123, code: 'PROJ_001' };
      const mockProjectRepo = {
        findOne: jest.fn().mockResolvedValue(mockProject),
      };

      playlistRepository.manager.getRepository.mockReturnValue(mockProjectRepo);

      const mockPlaylist = { id: 789, code: 'PL_001' };
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(mockProjectRepo),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        save: jest.fn(),
      };

      mockManager.create.mockReturnValueOnce(mockPlaylist).mockReturnValueOnce(mockVersion);
      mockManager.save.mockResolvedValueOnce(mockPlaylist).mockResolvedValueOnce(mockVersion);

      dataSource.transaction.mockImplementation((callback) => callback(mockManager));

      const result = await service.createPlaylistWithVersion(dto, undefined);

      expect(mockProjectRepo.findOne).toHaveBeenCalledWith({
        where: { id: 123 },
      });
      expect(mockManager.create).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.playlist).toBeDefined();
      expect(result.version).toBeDefined();
    });

    it('should throw NotFoundException when project not found', async () => {
      const dto: CreatePlaylistWithVersionDto = {
        name: 'Test Playlist',
        projectId: 999,
        versionCode: 'VER_001',
      };

      const mockProjectRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      playlistRepository.manager.getRepository.mockReturnValue(mockProjectRepo);

      const mockManager = {
        getRepository: jest.fn().mockReturnValue(mockProjectRepo),
      };

      dataSource.transaction.mockImplementation((callback) => callback(mockManager));

      await expect(service.createPlaylistWithVersion(dto)).rejects.toThrow(NotFoundException);
      await expect(service.createPlaylistWithVersion(dto)).rejects.toThrow(
        'Project with ID 999 not found',
      );
    });
  });

  describe('createSequenceWithVersion', () => {
    it('should create sequence with version successfully using episodeId', async () => {
      const dto: CreateSequenceWithVersionDto = {
        name: 'Test Sequence',
        episodeId: 456,
        cutOrder: 1,
        versionCode: 'VER_001',
        versionName: 'Test Version',
      };

      const mockEpisode = { id: 456, code: 'EP_001' };
      const mockEpisodeRepo = {
        findOne: jest.fn().mockResolvedValue(mockEpisode),
      };

      sequenceRepository.manager.getRepository.mockReturnValue(mockEpisodeRepo);

      const mockSequence = { id: 789, code: 'SEQ_001' };
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(mockEpisodeRepo),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        save: jest.fn(),
      };

      mockManager.create.mockReturnValueOnce(mockSequence).mockReturnValueOnce(mockVersion);
      mockManager.save.mockResolvedValueOnce(mockSequence).mockResolvedValueOnce(mockVersion);

      dataSource.transaction.mockImplementation((callback) => callback(mockManager));

      const result = await service.createSequenceWithVersion(dto, undefined);

      expect(mockEpisodeRepo.findOne).toHaveBeenCalledWith({
        where: { id: 456 },
      });
      expect(mockManager.create).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.sequence).toBeDefined();
      expect(result.version).toBeDefined();
    });

    it('should throw NotFoundException when episode not found', async () => {
      const dto: CreateSequenceWithVersionDto = {
        name: 'Test Sequence',
        episodeId: 999,
        cutOrder: 1,
        versionCode: 'VER_001',
      };

      const mockEpisodeRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      sequenceRepository.manager.getRepository.mockReturnValue(mockEpisodeRepo);

      const mockManager = {
        getRepository: jest.fn().mockReturnValue(mockEpisodeRepo),
      };

      dataSource.transaction.mockImplementation((callback) => callback(mockManager));

      await expect(service.createSequenceWithVersion(dto)).rejects.toThrow(NotFoundException);
      await expect(service.createSequenceWithVersion(dto)).rejects.toThrow(
        'Episode with ID 999 not found',
      );
    });

    it('should throw BadRequestException when neither episodeId nor episodeCode provided', async () => {
      const dto: CreateSequenceWithVersionDto = {
        name: 'Test Sequence',
        cutOrder: 1,
        versionCode: 'VER_001',
      };

      const mockManager = {
        getRepository: jest.fn(),
      };

      dataSource.transaction.mockImplementation((callback) => callback(mockManager));

      await expect(service.createSequenceWithVersion(dto)).rejects.toThrow(BadRequestException);
      await expect(service.createSequenceWithVersion(dto)).rejects.toThrow('episodeId is required');
    });

    it('should handle errors during version creation in transaction', async () => {
      const dto: CreateSequenceWithVersionDto = {
        name: 'Test Sequence',
        episodeId: 456,
        cutOrder: 1,
        versionCode: 'VER_001',
      };

      const mockEpisode = { id: 456, code: 'EP_001' };
      const mockEpisodeRepo = {
        findOne: jest.fn().mockResolvedValue(mockEpisode),
      };

      sequenceRepository.manager.getRepository = jest.fn().mockReturnValue(mockEpisodeRepo);

      const mockSequence = { id: 789, code: 'SEQ_001' };
      const mockVersion = { id: 1, code: 'VER_001' };
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(mockEpisodeRepo),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        save: jest.fn(),
      };

      mockManager.create.mockReturnValueOnce(mockSequence).mockReturnValueOnce(mockVersion);
      mockManager.save
        .mockResolvedValueOnce(mockSequence)
        .mockRejectedValueOnce(new Error('Version creation failed'));

      dataSource.transaction.mockImplementation(async (callback) => {
        return await callback(mockManager);
      });

      await expect(service.createSequenceWithVersion(dto)).rejects.toThrow(Error);
    });
  });

  describe('createAssetWithVersion', () => {
    it('should throw BadRequestException when neither projectId nor projectCode provided', async () => {
      const dto: CreateAssetWithVersionDto = {
        name: 'Test Asset',
        assetType: 'character',
        versionCode: 'VER_001',
      };

      const mockManager = {
        getRepository: jest.fn(),
      };

      dataSource.transaction.mockImplementation((callback) => callback(mockManager));

      await expect(service.createAssetWithVersion(dto)).rejects.toThrow(BadRequestException);
      await expect(service.createAssetWithVersion(dto)).rejects.toThrow('projectId is required');
    });

    it('should handle errors during asset creation in transaction', async () => {
      const dto: CreateAssetWithVersionDto = {
        name: 'Test Asset',
        assetType: 'character',
        projectId: 123,
        versionCode: 'VER_001',
      };

      // Mock the assetRepository.manager.getRepository to return a project repository
      const mockProject = { id: 123, code: 'PROJ_001' };
      const mockProjectRepo = {
        findOne: jest.fn().mockResolvedValue(mockProject),
      };

      assetRepository.manager.getRepository = jest.fn().mockReturnValue(mockProjectRepo);

      const mockAsset = { id: 456, code: 'AST_001' };
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(mockProjectRepo),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        save: jest.fn(),
      };

      mockManager.create.mockReturnValueOnce(mockAsset);
      // Simulate error during asset save
      mockManager.save.mockRejectedValueOnce(new Error('Asset creation failed'));

      dataSource.transaction.mockImplementation(async (callback) => {
        return await callback(mockManager);
      });

      await expect(service.createAssetWithVersion(dto)).rejects.toThrow(Error);
    });
  });

  describe('createShotWithVersion', () => {
    it('should throw BadRequestException when neither sequenceId nor sequenceCode provided', async () => {
      const dto: CreateShotWithVersionDto = {
        name: 'Test Shot',
        sequenceNumber: 1,
        versionCode: 'VER_001',
      };

      const mockManager = {
        getRepository: jest.fn(),
      };

      dataSource.transaction.mockImplementation((callback) => callback(mockManager));

      await expect(service.createShotWithVersion(dto)).rejects.toThrow(BadRequestException);
      await expect(service.createShotWithVersion(dto)).rejects.toThrow('sequenceId is required');
    });

    it('should handle errors during shot creation in transaction', async () => {
      const dto: CreateShotWithVersionDto = {
        name: 'Test Shot',
        sequenceNumber: 1,
        sequenceId: 789,
        versionCode: 'VER_001',
      };

      // Mock the shotRepository.manager.getRepository to return a sequence repository
      const mockSequence = { id: 789, code: 'SEQ_001' };
      const mockSequenceRepo = {
        findOne: jest.fn().mockResolvedValue(mockSequence),
      };

      // Ensure manager exists
      if (!shotRepository.manager) {
        shotRepository.manager = {} as any;
      }
      shotRepository.manager.getRepository = jest.fn().mockReturnValue(mockSequenceRepo);

      const mockShot = { id: 456, code: 'SH_001' };
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(mockSequenceRepo),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        save: jest.fn(),
      };

      mockManager.create.mockReturnValueOnce(mockShot);
      // Simulate error during shot save
      mockManager.save.mockRejectedValueOnce(new Error('Shot creation failed'));

      dataSource.transaction.mockImplementation(async (callback) => {
        return await callback(mockManager);
      });

      await expect(service.createShotWithVersion(dto)).rejects.toThrow(Error);
    });
  });
});
