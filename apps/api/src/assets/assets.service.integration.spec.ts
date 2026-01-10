import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AssetsService } from './assets.service';
import { Asset, Project, Status, ProjectRole, Version } from '../entities';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { FilterAssetsDto } from './dto/filter-assets.dto';
import { ProjectAccessService, UserContext } from '../auth/services/project-access.service';
import { MinioService } from '../files/minio.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AssetType } from '@shogun/shared';

/**
 * Integration tests for AssetsService
 *
 * Tests asset management flows with:
 * - Asset creation with project validation
 * - Access control and permissions
 * - Asset filtering and search
 * - Asset updates with permission checks
 * - Thumbnail uploads
 * - Asset deletion
 */
describe('AssetsService Integration Tests', () => {
  let module: TestingModule;
  let assetsService: AssetsService;
  let assetRepository: jest.Mocked<any>;
  let projectRepository: jest.Mocked<any>;
  let statusRepository: jest.Mocked<any>;
  let minioService: jest.Mocked<MinioService>;
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
    applicableEntities: ['asset'],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Status;

  const mockAsset: Asset = {
    id: 2001,
    code: 'CHAR_001',
    name: 'Test Character',
    description: 'Test description',
    assetType: AssetType.CHARACTER,
    statusId: 'status-uuid-123',
    status: mockStatus,
    projectId: 123,
    thumbnailPath: 'thumbnails/2025/12/20/thumb.jpg',
    createdBy: 1,
    assignedTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Asset;

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        {
          provide: getRepositoryToken(Asset),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => {
              const qb = {
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
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
          provide: MinioService,
          useValue: {
            uploadFile: jest.fn(),
            getFileUrl: jest.fn(),
            extractBucketAndPath: jest.fn(),
            deleteFile: jest.fn(),
            getValidationOptions: jest.fn().mockReturnValue({
              maxSize: 5 * 1024 * 1024, // 5MB
              allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
            }),
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

    assetsService = testModule.get<AssetsService>(AssetsService);
    assetRepository = testModule.get(getRepositoryToken(Asset));
    projectRepository = testModule.get(getRepositoryToken(Project));
    statusRepository = testModule.get(getRepositoryToken(Status));
    minioService = testModule.get<MinioService>(MinioService);
    projectAccessService = testModule.get<ProjectAccessService>(ProjectAccessService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Asset Creation', () => {
    it('should create asset with projectId', async () => {
      const createDto: CreateAssetDto = {
        code: 'CHAR_NEW',
        name: 'New Character',
        assetType: AssetType.CHARACTER,
        projectId: 123,
      };

      assetRepository.findOne.mockResolvedValue(null); // No duplicate
      projectRepository.findOne.mockResolvedValue(mockProject);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      assetRepository.create.mockReturnValue({
        ...mockAsset,
        ...createDto,
      });
      assetRepository.save.mockResolvedValue({
        ...mockAsset,
        ...createDto,
        id: 2002,
      });
      minioService.getFileUrl.mockResolvedValue(
        'http://localhost:9000/thumbnails/thumb.jpg',
      );

      const result = await assetsService.create(createDto, mockUserContext);

      expect(result).toHaveProperty('code', createDto.code);
      expect(result).toHaveProperty('name', createDto.name);
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should create asset with projectCode', async () => {
      const createDto: CreateAssetDto = {
        code: 'PROP_001',
        name: 'Test Prop',
        assetType: AssetType.PROP,
        projectCode: 'PROJ_001',
      };

      assetRepository.findOne.mockResolvedValue(null);
      projectRepository.findOne.mockResolvedValue(mockProject);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      assetRepository.create.mockReturnValue({
        ...mockAsset,
        ...createDto,
      });
      assetRepository.save.mockResolvedValue({
        ...mockAsset,
        ...createDto,
        id: 2003,
      });
      minioService.getFileUrl.mockResolvedValue(
        'http://localhost:9000/thumbnails/thumb.jpg',
      );

      const result = await assetsService.create(createDto, mockUserContext);

      expect(result).toHaveProperty('code', createDto.code);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'PROJ_001' },
      });
    });

    it('should require project reference', async () => {
      const createDto: CreateAssetDto = {
        code: 'ASSET_NO_PROJECT',
        name: 'Asset Without Project',
        assetType: AssetType.TEXT,
      };

      assetRepository.findOne.mockResolvedValue(null);

      await expect(assetsService.create(createDto, mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for non-existent project', async () => {
      const createDto: CreateAssetDto = {
        code: 'ASSET_INVALID',
        name: 'Asset',
        assetType: AssetType.TEXT,
        projectId: 999,
      };

      assetRepository.findOne.mockResolvedValue(null);
      projectRepository.findOne.mockResolvedValue(null);

      await expect(assetsService.create(createDto, mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should prevent duplicate asset codes', async () => {
      const createDto: CreateAssetDto = {
        code: 'CHAR_001',
        name: 'Duplicate Character',
        assetType: AssetType.CHARACTER,
        projectId: 123,
      };

      assetRepository.findOne.mockResolvedValue(mockAsset); // Existing asset
      projectRepository.findOne.mockResolvedValue(mockProject);

      await expect(assetsService.create(createDto, mockUserContext)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should verify user has contributor access', async () => {
      const createDto: CreateAssetDto = {
        code: 'CHAR_002',
        name: 'Character',
        assetType: AssetType.CHARACTER,
        projectId: 123,
      };

      assetRepository.findOne.mockResolvedValue(null);
      projectRepository.findOne.mockResolvedValue(mockProject);
      projectAccessService.verifyProjectAccess.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(assetsService.create(createDto, mockUserContext)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Asset Filtering and Search', () => {
    it('should filter assets by status', async () => {
      const queryBuilder = assetRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockAsset]);
      assetRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);
      minioService.getFileUrl.mockResolvedValue(
        'http://localhost:9000/thumbnails/thumb.jpg',
      );

      const filters: FilterAssetsDto = { status: 'wip' };
      const result = await assetsService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter assets by assetType', async () => {
      const queryBuilder = assetRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockAsset]);
      assetRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);
      minioService.getFileUrl.mockResolvedValue(
        'http://localhost:9000/thumbnails/thumb.jpg',
      );

      const filters: FilterAssetsDto = { assetType: AssetType.CHARACTER };
      const result = await assetsService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter assets by projectId', async () => {
      const queryBuilder = assetRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockAsset]);
      assetRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);
      minioService.getFileUrl.mockResolvedValue(
        'http://localhost:9000/thumbnails/thumb.jpg',
      );

      const filters: FilterAssetsDto = { projectId: 123 };
      const result = await assetsService.findAll(filters, mockUserContext);

      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter assets by createdBy', async () => {
      const queryBuilder = assetRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockAsset]);
      assetRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);
      minioService.getFileUrl.mockResolvedValue(
        'http://localhost:9000/thumbnails/thumb.jpg',
      );

      const filters: FilterAssetsDto = { createdBy: 1 };
      const result = await assetsService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter assets by assignedTo', async () => {
      const queryBuilder = assetRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockAsset]);
      assetRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);
      minioService.getFileUrl.mockResolvedValue(
        'http://localhost:9000/thumbnails/thumb.jpg',
      );

      const filters: FilterAssetsDto = { assignedTo: 2 };
      const result = await assetsService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should restrict regular user to accessible projects', async () => {
      const queryBuilder = assetRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockAsset]);
      assetRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(false);
      projectAccessService.getAccessibleProjectIds = jest.fn().mockResolvedValue([123]);
      minioService.getFileUrl.mockResolvedValue(
        'http://localhost:9000/thumbnails/thumb.jpg',
      );

      const result = await assetsService.findAll({}, mockUserContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when user has no project access', async () => {
      const queryBuilder = assetRepository.createQueryBuilder();
      assetRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(false);
      projectAccessService.getAccessibleProjectIds = jest.fn().mockResolvedValue([]);

      const result = await assetsService.findAll({}, mockUserContext);

      expect(result).toEqual([]);
    });
  });

  describe('Asset Retrieval', () => {
    it('should find asset by ID', async () => {
      assetRepository.findOne.mockResolvedValue(mockAsset);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      minioService.extractBucketAndPath.mockReturnValue({
        bucket: 'thumbnails',
        path: '2025/12/20/thumb.jpg',
      });
      minioService.getFileUrl.mockResolvedValue(
        'http://localhost:9000/thumbnails/2025/12/20/thumb.jpg',
      );

      const result = await assetsService.findOneById(2001, mockUserContext);

      expect(result).toHaveProperty('id', 2001);
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(assetsService.findOneById(-1, mockUserContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for non-existent asset', async () => {
      assetRepository.findOne.mockResolvedValue(null);

      await expect(assetsService.findOneById(9999, mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should find asset by code', async () => {
      assetRepository.findOne.mockResolvedValue(mockAsset);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      minioService.extractBucketAndPath.mockReturnValue({
        bucket: 'thumbnails',
        path: '2025/12/20/thumb.jpg',
      });
      minioService.getFileUrl.mockResolvedValue(
        'http://localhost:9000/thumbnails/2025/12/20/thumb.jpg',
      );

      const result = await assetsService.findOne('CHAR_001', mockUserContext);

      expect(result).toHaveProperty('code', 'CHAR_001');
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent code', async () => {
      assetRepository.findOne.mockResolvedValue(null);

      await expect(assetsService.findOne('NON_EXISTENT', mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Asset Updates', () => {
    it('should update asset information', async () => {
      const updateDto: UpdateAssetDto = {
        name: 'Updated Asset Name',
        description: 'Updated description',
      };

      assetRepository.findOne
        .mockResolvedValueOnce(mockAsset) // First call in update
        .mockResolvedValueOnce({
          ...mockAsset,
          ...updateDto,
        }); // Second call after update
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      assetRepository.update.mockResolvedValue({ affected: 1 });
      minioService.extractBucketAndPath.mockReturnValue({
        bucket: 'thumbnails',
        path: '2025/12/20/thumb.jpg',
      });
      minioService.getFileUrl.mockResolvedValue(
        'http://localhost:9000/thumbnails/2025/12/20/thumb.jpg',
      );

      const result = await assetsService.update(2001, updateDto, mockUserContext);

      expect(result.name).toBe(updateDto.name);
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should prevent duplicate code on update', async () => {
      const updateDto: UpdateAssetDto = {
        code: 'CHAR_DUPLICATE',
      };

      assetRepository.findOne
        .mockResolvedValueOnce(mockAsset) // First call in update
        .mockResolvedValueOnce({
          ...mockAsset,
          id: 9999,
          code: 'CHAR_DUPLICATE',
        }); // Second call to check duplicate

      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);

      await expect(assetsService.update(2001, updateDto, mockUserContext)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow updating to same code', async () => {
      const updateDto: UpdateAssetDto = {
        code: 'CHAR_001', // Same as existing
        name: 'Updated Name',
      };

      assetRepository.findOne
        .mockResolvedValueOnce(mockAsset) // First call in update
        .mockResolvedValueOnce({
          ...mockAsset,
          code: 'CHAR_001',
        }) // Second call to check duplicate (same ID)
        .mockResolvedValueOnce({
          ...mockAsset,
          ...updateDto,
        }); // Third call after update
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      assetRepository.update.mockResolvedValue({ affected: 1 });
      minioService.extractBucketAndPath.mockReturnValue({
        bucket: 'thumbnails',
        path: '2025/12/20/thumb.jpg',
      });
      minioService.getFileUrl.mockResolvedValue(
        'http://localhost:9000/thumbnails/2025/12/20/thumb.jpg',
      );

      const result = await assetsService.update(2001, updateDto, mockUserContext);

      expect(result.name).toBe(updateDto.name);
    });

    it('should update asset project', async () => {
      const newProject: Project = {
        ...mockProject,
        id: 456,
        code: 'PROJ_002',
      };
      const updateDto: UpdateAssetDto = {
        projectId: 456,
      };

      assetRepository.findOne
        .mockResolvedValueOnce(mockAsset) // First call in update
        .mockResolvedValueOnce({
          ...mockAsset,
          projectId: 456,
        }); // Second call after update
      projectRepository.findOne.mockResolvedValue(newProject);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      assetRepository.update.mockResolvedValue({ affected: 1 });
      minioService.extractBucketAndPath.mockReturnValue({
        bucket: 'thumbnails',
        path: '2025/12/20/thumb.jpg',
      });
      minioService.getFileUrl.mockResolvedValue(
        'http://localhost:9000/thumbnails/2025/12/20/thumb.jpg',
      );

      const result = await assetsService.update(2001, updateDto, mockUserContext);

      expect(projectRepository.findOne).toHaveBeenCalled();
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalledTimes(2); // Old and new project
    });

    it('should throw NotFoundException for non-existent asset', async () => {
      assetRepository.findOne.mockResolvedValue(null);

      await expect(assetsService.update(9999, { name: 'Updated' }, mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Thumbnail Uploads', () => {
    it('should upload thumbnail by ID', async () => {
      const mockFile = {
        buffer: Buffer.from('test image'),
        originalname: 'thumbnail.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      assetRepository.findOne
        .mockResolvedValueOnce(mockAsset) // First call in findOneById
        .mockResolvedValueOnce({
          ...mockAsset,
          thumbnailPath: 'thumbnails/2025/12/20/new-thumb.jpg',
        }); // Second call after update
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      minioService.extractBucketAndPath.mockReturnValue({
        bucket: 'thumbnails',
        path: '2025/12/20/thumb.jpg',
      });
      minioService.deleteFile.mockResolvedValue(undefined);
      minioService.uploadFile.mockResolvedValue({ path: 'thumbnails/2025/12/20/new-thumb.jpg' });
      minioService.getFileUrl.mockResolvedValue(
        'http://localhost:9000/thumbnails/2025/12/20/new-thumb.jpg',
      );
      assetRepository.update.mockResolvedValue({ affected: 1 });

      const result = await assetsService.uploadThumbnail(2001, mockFile, mockUserContext);

      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(result).toHaveProperty('thumbnailPath');
    });

    it('should upload thumbnail by code', async () => {
      const mockFile = {
        buffer: Buffer.from('test image'),
        originalname: 'thumbnail.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      assetRepository.findOne
        .mockResolvedValueOnce(mockAsset) // First call in findOne
        .mockResolvedValueOnce({
          ...mockAsset,
          thumbnailPath: 'thumbnails/2025/12/20/new-thumb.jpg',
        }); // Second call after update
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      minioService.extractBucketAndPath.mockReturnValue({
        bucket: 'thumbnails',
        path: '2025/12/20/thumb.jpg',
      });
      minioService.deleteFile.mockResolvedValue(undefined);
      minioService.uploadFile.mockResolvedValue({ path: 'thumbnails/2025/12/20/new-thumb.jpg' });
      minioService.getFileUrl.mockResolvedValue(
        'http://localhost:9000/thumbnails/2025/12/20/new-thumb.jpg',
      );
      assetRepository.update.mockResolvedValue({ affected: 1 });

      const result = await assetsService.uploadThumbnailByCode('CHAR_001', mockFile, mockUserContext);

      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(result).toHaveProperty('thumbnailPath');
    });

    it('should delete old thumbnail before uploading new one', async () => {
      const mockFile = {
        buffer: Buffer.from('test image'),
        originalname: 'thumbnail.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      assetRepository.findOne
        .mockResolvedValueOnce(mockAsset) // First call in findOneById
        .mockResolvedValueOnce({
          ...mockAsset,
          thumbnailPath: 'thumbnails/2025/12/20/new-thumb.jpg',
        }); // Second call after update
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      minioService.extractBucketAndPath.mockReturnValue({
        bucket: 'thumbnails',
        path: '2025/12/20/thumb.jpg',
      });
      minioService.deleteFile.mockResolvedValue(undefined);
      minioService.uploadFile.mockResolvedValue({ path: 'thumbnails/2025/12/20/new-thumb.jpg' });
      minioService.getFileUrl.mockResolvedValue(
        'http://localhost:9000/thumbnails/2025/12/20/new-thumb.jpg',
      );
      assetRepository.update.mockResolvedValue({ affected: 1 });

      await assetsService.uploadThumbnail(2001, mockFile, mockUserContext);

      expect(minioService.deleteFile).toHaveBeenCalled();
    });
  });

  describe('Asset Deletion', () => {
    it('should delete asset with contributor access', async () => {
      assetRepository.findOne.mockResolvedValue(mockAsset);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      assetRepository.delete.mockResolvedValue({ affected: 1 });

      await assetsService.remove(2001, mockUserContext);

      expect(assetRepository.delete).toHaveBeenCalledWith(2001);
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent asset', async () => {
      assetRepository.findOne.mockResolvedValue(null);

      await expect(assetsService.remove(9999, mockUserContext)).rejects.toThrow(NotFoundException);
    });

    it('should verify user has contributor access before deletion', async () => {
      assetRepository.findOne.mockResolvedValue(mockAsset);
      projectAccessService.verifyProjectAccess.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(assetsService.remove(2001, mockUserContext)).rejects.toThrow(ForbiddenException);
    });
  });
});

