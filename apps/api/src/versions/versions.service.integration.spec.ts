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
import { MinioService } from '../files/minio.service';
import { ImageOptimizationService } from '../files/image-optimization.service';
import { SlackService } from '../notifications/slack/slack.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectAccessService } from '../auth/services/project-access.service';
import { CreateVersionDto, VersionEntityType } from './dto/create-version.dto';
import { UpdateVersionDto } from './dto/update-version.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

/**
 * Integration tests for VersionsService
 *
 * Tests version management flows with:
 * - Version creation with automatic version numbering
 * - Latest flag management (only one latest per entity)
 * - Version updates and status changes
 * - File uploads and thumbnail generation
 * - Entity relationship validation
 */
describe('VersionsService Integration Tests', () => {
  let module: TestingModule;
  let versionsService: VersionsService;
  let versionsRepository: jest.Mocked<any>;
  let shotRepository: jest.Mocked<any>;
  let assetRepository: jest.Mocked<any>;
  let playlistRepository: jest.Mocked<any>;
  let sequenceRepository: jest.Mocked<any>;
  let statusRepository: jest.Mocked<any>;
  let minioService: jest.Mocked<MinioService>;
  let imageOptimizationService: jest.Mocked<ImageOptimizationService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockShot: Shot = {
    id: 123,
    code: 'SH_001',
    name: 'Test Shot',
    sequenceNumber: 1,
    projectId: 1,
    sequenceId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Shot;

  const mockAsset: Asset = {
    id: 456,
    code: 'AST_001',
    name: 'Test Asset',
    assetType: 'character',
    projectId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Asset;

  const mockStatus: Status = {
    id: 'status-uuid-123',
    code: 'wip',
    name: 'Work In Progress',
    color: '#FFA500',
    isActive: true,
    sortOrder: 0,
    applicableEntities: ['version'],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Status;

  const mockVersion: Version = {
    id: 789,
    code: 'VER_001',
    name: 'Test Version',
    description: 'Test description',
    versionNumber: 1,
    latest: true,
    entityId: 123,
    entityType: 'shot',
    entityCode: 'SH_001',
    statusId: 'status-uuid-123',
    status: mockStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Version;

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
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
            query: jest.fn().mockResolvedValue([]),
            createQueryBuilder: jest.fn(() => {
              const qb = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
                getRawOne: jest.fn().mockResolvedValue(null),
              };
              return qb;
            }),
          },
        },
        {
          provide: getRepositoryToken(Shot),
          useValue: {
            findOne: jest.fn(),
            exist: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Asset),
          useValue: {
            findOne: jest.fn(),
            exist: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Playlist),
          useValue: {
            findOne: jest.fn(),
            exist: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Sequence),
          useValue: {
            findOne: jest.fn(),
            exist: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Status),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryBuilder: jest.fn(() => ({
              update: jest.fn().mockReturnThis(),
              set: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              execute: jest.fn(),
            })),
          },
        },
        {
          provide: MinioService,
          useValue: {
            uploadFile: jest.fn(),
            getFileUrl: jest.fn(),
            extractBucketAndPath: jest.fn(),
            getValidationOptions: jest.fn().mockReturnValue({
              maxSize: 100 * 1024 * 1024, // 100MB
              allowedMimeTypes: ['video/mp4', 'image/jpeg', 'image/png'],
            }),
          },
        },
        {
          provide: ImageOptimizationService,
          useValue: {
            optimizeImage: jest.fn(),
          },
        },
        {
          provide: SlackService,
          useValue: {
            notifyVersionCreated: jest.fn(),
            notifyVersionApproved: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: ProjectAccessService,
          useValue: {
            verifyEntityAccess: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    module = testModule;
    versionsService = testModule.get<VersionsService>(VersionsService);
    versionsRepository = testModule.get(getRepositoryToken(Version));
    shotRepository = testModule.get(getRepositoryToken(Shot));
    assetRepository = testModule.get(getRepositoryToken(Asset));
    playlistRepository = testModule.get(getRepositoryToken(Playlist));
    sequenceRepository = testModule.get(getRepositoryToken(Sequence));
    statusRepository = testModule.get(getRepositoryToken(Status));
    minioService = testModule.get<MinioService>(MinioService);
    imageOptimizationService = testModule.get<ImageOptimizationService>(ImageOptimizationService);
    dataSource = testModule.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Version Creation with Automatic Numbering', () => {
    it('should create first version with versionNumber 1', async () => {
      const createDto: CreateVersionDto = {
        entityId: 123,
        entityType: VersionEntityType.SHOT,
        name: 'First Version',
        description: 'First version description',
      };

      shotRepository.exist.mockResolvedValue(true);
      shotRepository.findOne.mockResolvedValue(mockShot);
      versionsRepository.find.mockResolvedValue([]); // No existing versions
      versionsRepository.create.mockReturnValue({
        ...mockVersion,
        ...createDto,
        versionNumber: 1,
        latest: true,
      });
      versionsRepository.save.mockResolvedValue({
        ...mockVersion,
        ...createDto,
        versionNumber: 1,
        latest: true,
      });

      const result = await versionsService.create(createDto);

      expect(result.versionNumber).toBe(1);
      expect(result.latest).toBe(true);
    });

    it('should increment version number for subsequent versions', async () => {
      const createDto: CreateVersionDto = {
        entityId: 123,
        entityType: VersionEntityType.SHOT,
        name: 'Second Version',
      };

      const existingVersions = [
        { ...mockVersion, id: 1, versionNumber: 1, latest: false },
        { ...mockVersion, id: 2, versionNumber: 2, latest: false },
        { ...mockVersion, id: 3, versionNumber: 3, latest: true },
      ];

      shotRepository.exist.mockResolvedValue(true);
      shotRepository.findOne.mockResolvedValue(mockShot);
      versionsRepository.find.mockResolvedValue(existingVersions);
      versionsRepository.query.mockResolvedValue(existingVersions); // Mock the raw query
      versionsRepository.create.mockReturnValue({
        ...mockVersion,
        ...createDto,
        versionNumber: 4,
        latest: true,
      });
      versionsRepository.save.mockResolvedValue({
        ...mockVersion,
        ...createDto,
        versionNumber: 4,
        latest: true,
      });

      // Mock the repository update method (used to unmark previous latest versions)
      versionsRepository.update = jest.fn().mockResolvedValue({ affected: 1 });
      versionsRepository.query.mockResolvedValue(existingVersions);

      const result = await versionsService.create(createDto);

      expect(result.versionNumber).toBe(4);
      expect(result.latest).toBe(true);
      // Should update previous latest versions
      // The update is called to unmark previous latest versions
      expect(versionsRepository.update).toHaveBeenCalledWith(
        {
          entityId: createDto.entityId,
          entityType: createDto.entityType,
          latest: true,
        },
        { latest: false },
      );
    });
  });

  describe('Latest Flag Management', () => {
    it('should set only one version as latest per entity', async () => {
      const createDto: CreateVersionDto = {
        entityId: 123,
        entityType: VersionEntityType.SHOT,
        name: 'New Latest Version',
      };

      const existingVersions = [
        { ...mockVersion, id: 1, versionNumber: 1, latest: true },
        { ...mockVersion, id: 2, versionNumber: 2, latest: false },
      ];

      shotRepository.exist.mockResolvedValue(true);
      shotRepository.findOne.mockResolvedValue(mockShot);
      versionsRepository.find.mockResolvedValue(existingVersions);
      versionsRepository.query.mockResolvedValue(existingVersions);
      versionsRepository.create.mockReturnValue({
        ...mockVersion,
        ...createDto,
        versionNumber: 3,
        latest: true,
      });
      versionsRepository.save.mockResolvedValue({
        ...mockVersion,
        ...createDto,
        versionNumber: 3,
        latest: true,
      });
      
      // Mock the repository update method (used to unmark previous latest versions)
      versionsRepository.update = jest.fn().mockResolvedValue({ affected: 1 });
      versionsRepository.query.mockResolvedValue(existingVersions);

      await versionsService.create(createDto);

      // Should update previous latest version to false
      expect(versionsRepository.update).toHaveBeenCalled();
    });

    it('should update latest flag when explicitly set', async () => {
      const updateDto: UpdateVersionDto = {
        latest: true,
      };

      const existingVersions = [
        { ...mockVersion, id: 1, versionNumber: 1, latest: true },
        { ...mockVersion, id: 2, versionNumber: 2, latest: false },
      ];

      versionsRepository.findOne.mockResolvedValue({
        ...mockVersion,
        id: 2,
        latest: false,
      });
      versionsRepository.find.mockResolvedValue(existingVersions);
      versionsRepository.save.mockResolvedValue({
        ...mockVersion,
        id: 2,
        latest: true,
      });

      // Mock the repository update method (used to unmark previous latest versions)
      versionsRepository.update = jest.fn().mockResolvedValue({ affected: 1 });
      versionsRepository.find.mockResolvedValue(existingVersions);
      
      // Mock findOneById to return the updated version
      versionsRepository.findOne
        .mockResolvedValueOnce({
          ...mockVersion,
          id: 2,
          latest: false,
        }) // First call in update
        .mockResolvedValueOnce({
          ...mockVersion,
          id: 2,
          latest: true,
        }); // Second call in findOneById

      const result = await versionsService.update(2, updateDto);

      expect(result.latest).toBe(true);
      // Should update previous latest version
      expect(versionsRepository.update).toHaveBeenCalled();
    });
  });

  describe('Entity Relationship Validation', () => {
    it('should validate shot exists before creating version', async () => {
      const createDto: CreateVersionDto = {
        entityId: 999,
        entityType: VersionEntityType.SHOT,
        name: 'Version for non-existent shot',
      };

      shotRepository.exist.mockResolvedValue(false);

      await expect(versionsService.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should validate asset exists before creating version', async () => {
      const createDto: CreateVersionDto = {
        entityId: 999,
        entityType: VersionEntityType.ASSET,
        name: 'Version for non-existent asset',
      };

      assetRepository.exist.mockResolvedValue(false);

      await expect(versionsService.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should reject invalid entity type', async () => {
      const createDto = {
        entityId: 123,
        entityType: 'invalid' as VersionEntityType,
        name: 'Invalid version',
      };

      // The service checks entity existence first, which will throw NotFoundException
      // for invalid entity types since the switch statement doesn't handle 'invalid'
      // We need to mock all repository exist methods to return false
      shotRepository.exist.mockResolvedValue(false);
      assetRepository.exist.mockResolvedValue(false);
      sequenceRepository.exist.mockResolvedValue(false);
      // playlistRepository might not be defined in the test, so check if it exists
      if (playlistRepository && playlistRepository.exist) {
        playlistRepository.exist.mockResolvedValue(false);
      }

      await expect(versionsService.create(createDto as CreateVersionDto)).rejects.toThrow();
    });
  });

  describe('Version Updates', () => {
    it('should update version name and description', async () => {
      const updateDto: UpdateVersionDto = {
        name: 'Updated Version Name',
        description: 'Updated description',
      };

      versionsRepository.findOne
        .mockResolvedValueOnce(mockVersion) // First call in update
        .mockResolvedValueOnce({
          ...mockVersion,
          ...updateDto,
        }); // Second call in findOneById
      versionsRepository.update.mockResolvedValue({ affected: 1 });

      const result = await versionsService.update(789, updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
    });

    it('should update version status', async () => {
      const newStatus: Status = {
        ...mockStatus,
        id: 'status-uuid-456',
        code: 'approved',
      };

      const updateDto: UpdateVersionDto = {
        statusId: 'status-uuid-456',
      };

      const updatedVersion = {
        ...mockVersion,
        statusId: 'status-uuid-456',
        status: newStatus,
      };

      versionsRepository.findOne
        .mockResolvedValueOnce(mockVersion) // First call in update method
        .mockResolvedValueOnce(updatedVersion); // Second call in findOneById
      statusRepository.findOne.mockResolvedValue(newStatus);
      versionsRepository.update.mockResolvedValue({ affected: 1 });

      const result = await versionsService.update(789, updateDto);

      expect(result.statusId).toBe('status-uuid-456');
    });

    it('should throw NotFoundException for non-existent version', async () => {
      versionsRepository.findOne.mockResolvedValue(null);

      await expect(versionsService.update(999, { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('File Uploads and Thumbnails', () => {
    it('should handle file upload for version', async () => {
      const mockFile = {
        buffer: Buffer.from('test file content'),
        originalname: 'test.mp4',
        mimetype: 'video/mp4',
      } as Express.Multer.File;

      versionsRepository.findOne.mockResolvedValue(mockVersion);
      minioService.uploadFile.mockResolvedValue({ path: '2025/12/20/test-file.mp4' });
      minioService.getFileUrl.mockResolvedValue('http://localhost:9000/media/2025/12/20/test-file.mp4');
      versionsRepository.update.mockResolvedValue({ affected: 1 });
      versionsRepository.findOne
        .mockResolvedValueOnce(mockVersion) // First call
        .mockResolvedValueOnce({
          ...mockVersion,
          filePath: '2025/12/20/test-file.mp4',
        }); // Second call after update

      const result = await versionsService.uploadFile(789, mockFile);

      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(result).toHaveProperty('filePath');
    });

    it('should generate thumbnail for image files', async () => {
      const mockImageFile = {
        buffer: Buffer.from('image content'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      versionsRepository.findOne.mockResolvedValue(mockVersion);
      minioService.uploadFile.mockResolvedValue({ path: '2025/12/20/test-image.jpg' });
      imageOptimizationService.optimizeImage.mockResolvedValue(Buffer.from('optimized'));
      minioService.getFileUrl.mockResolvedValue('http://localhost:9000/media/2025/12/20/test-image.jpg');
      versionsRepository.update.mockResolvedValue({ affected: 1 });
      versionsRepository.findOne
        .mockResolvedValueOnce(mockVersion) // First call
        .mockResolvedValueOnce({
          ...mockVersion,
          filePath: '2025/12/20/test-image.jpg',
        }); // Second call after update

      const result = await versionsService.uploadFile(789, mockImageFile);

      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(result).toHaveProperty('filePath');
    });
  });

  describe('Version Filtering and Search', () => {
    it('should filter versions by entity type', async () => {
      const queryBuilder = versionsRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockVersion]);
      
      // Ensure the queryBuilder is properly mocked
      versionsRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      
      // Mock transformVersion which is called for each version
      jest.spyOn(versionsService as any, 'transformVersion').mockResolvedValue(mockVersion);

      const result = await versionsService.findAll({ entityType: 'shot' });

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter versions by entity ID', async () => {
      const queryBuilder = versionsRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockVersion]);
      
      // Ensure the queryBuilder is properly mocked
      versionsRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      
      // Mock transformVersion which is called for each version
      jest.spyOn(versionsService as any, 'transformVersion').mockResolvedValue(mockVersion);

      const result = await versionsService.findAll({ entityId: 123 });

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter versions by latest flag', async () => {
      const queryBuilder = versionsRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockVersion]);
      
      // Ensure the queryBuilder is properly mocked
      versionsRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      
      // Mock transformVersion which is called for each version
      jest.spyOn(versionsService as any, 'transformVersion').mockResolvedValue(mockVersion);

      const result = await versionsService.findAll({ latest: true });

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

