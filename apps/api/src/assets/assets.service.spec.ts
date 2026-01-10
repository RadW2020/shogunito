import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AssetsService } from './assets.service';
import { Asset } from '../entities/asset.entity';
import { Project } from '../entities/project.entity';
import { Version } from '../entities/version.entity';
import { Status } from '../entities/status.entity';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { FilterAssetsDto } from './dto/filter-assets.dto';
import { AssetType } from '@shogun/shared';
import { MinioService } from '../files/minio.service';
import { ProjectAccessService } from '../auth/services/project-access.service';

describe('AssetsService', () => {
  let service: AssetsService;
  let assetRepository: any;
  let projectRepository: any;
  let minioService: MinioService;
  let module: TestingModule;

  const mockProject: Project = {
    id: 123,
    code: 'PROJ_001',
    name: 'Test Project',
  } as Project;

  const mockAsset: Asset = {
    id: 456,
    code: 'CHAR_001',
    name: 'Test Asset',
    description: 'Test description',
    assetType: AssetType.TEXT,
    statusId: 'status-uuid-in-progress',
    projectId: 123,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Asset;

  const mockQueryBuilder = {
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
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
          useValue: {},
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
            deleteFile: jest.fn(),
            getValidationOptions: jest.fn(),
            extractBucketAndPath: jest
              .fn()
              .mockImplementation((path: string, defaultBucket: string) => {
                if (!path) return null;
                return { bucket: defaultBucket, path };
              }),
          },
        },
        {
          provide: ProjectAccessService,
          useValue: {
            isAdmin: jest.fn().mockReturnValue(false),
            getAccessibleProjectIds: jest.fn().mockResolvedValue([]),
            verifyProjectAccess: jest.fn().mockResolvedValue(undefined),
            verifyAssetAccess: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
    assetRepository = module.get(getRepositoryToken(Asset));
    projectRepository = module.get(getRepositoryToken(Project));
    minioService = module.get<MinioService>(MinioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an asset successfully with projectId', async () => {
      const createDto: CreateAssetDto = {
        code: 'CHAR_001',
        name: 'Test Asset',
        assetType: AssetType.TEXT,
        projectId: 123,
        statusId: 'status-uuid-in-progress',
      };

      assetRepository.findOne.mockResolvedValue(null); // No duplicate
      projectRepository.findOne.mockResolvedValue(mockProject);
      assetRepository.create.mockReturnValue(mockAsset);
      assetRepository.save.mockResolvedValue(mockAsset);

      const result = await service.create(createDto, undefined);

      expect(assetRepository.findOne).toHaveBeenCalledWith({
        where: { code: createDto.code },
      });
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDto.projectId },
      });
      expect(assetRepository.create).toHaveBeenCalled();
      expect(assetRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockAsset);
    });

    it('should create an asset successfully with projectCode', async () => {
      const createDto: CreateAssetDto = {
        code: 'CHAR_001',
        name: 'Test Asset',
        assetType: AssetType.TEXT,
        projectCode: 'PROJ_001',
      };

      projectRepository.findOne.mockResolvedValue(mockProject);
      assetRepository.create.mockReturnValue(mockAsset);
      assetRepository.save.mockResolvedValue(mockAsset);

      const result = await service.create(createDto, undefined);

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { code: createDto.projectCode },
      });
      expect(result).toEqual(mockAsset);
    });

    it('should throw ConflictException when code already exists', async () => {
      const createDto: CreateAssetDto = {
        code: 'CHAR_001',
        name: 'Test Asset',
        assetType: AssetType.TEXT,
        projectId: 123,
      };

      assetRepository.findOne.mockResolvedValue(mockAsset); // Duplicate exists

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when project not found by id', async () => {
      const createDto: CreateAssetDto = {
        code: 'CHAR_001',
        name: 'Test Asset',
        assetType: AssetType.TEXT,
        projectId: 999,
      };

      assetRepository.findOne.mockResolvedValue(null); // No duplicate
      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow('Project with ID 999 not found');
    });

    it('should throw NotFoundException when project not found by code', async () => {
      const createDto: CreateAssetDto = {
        code: 'CHAR_001',
        name: 'Test Asset',
        assetType: AssetType.TEXT,
        projectCode: 'PROJ_999',
      };

      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Project with code PROJ_999 not found',
      );
    });

    it('should throw NotFoundException when no project reference provided', async () => {
      const createDto: CreateAssetDto = {
        code: 'CHAR_001',
        name: 'Test Asset',
        assetType: AssetType.TEXT,
      };

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Project reference is required (projectId or projectCode)',
      );
    });
  });

  describe('findAll', () => {
    it('should return all assets without filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockAsset]);

      const result = await service.findAll({}, undefined);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
      expect(result).toEqual([mockAsset]);
    });

    it('should apply status filter', async () => {
      const filters: FilterAssetsDto = {
        status: 'in_progress',
      };

      const mockStatusRepository = module.get(getRepositoryToken(Status));
      mockStatusRepository.findOne.mockResolvedValue({
        id: 'status-uuid-123',
        code: 'in_progress',
      });

      mockQueryBuilder.getMany.mockResolvedValue([mockAsset]);

      await service.findAll(filters, undefined);

      expect(mockStatusRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'in_progress' },
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('asset.statusId = :statusId', {
        statusId: 'status-uuid-123',
      });
    });

    it('should apply assetType filter', async () => {
      const filters: FilterAssetsDto = {
        assetType: AssetType.TEXT,
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockAsset]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('asset.assetType = :assetType', {
        assetType: AssetType.TEXT,
      });
    });

    it('should apply projectId filter', async () => {
      const filters: FilterAssetsDto = {
        projectId: 123,
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockAsset]);

      await service.findAll(filters, undefined);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('asset.projectId = :projectId', {
        projectId: 123,
      });
    });

    it('should ignore projectCode filter (no longer supported)', async () => {
      const filters: FilterAssetsDto = {
        projectCode: 'PROJ_001',
      } as any;

      mockQueryBuilder.getMany.mockResolvedValue([mockAsset]);

      await service.findAll(filters, undefined);

      // projectCode is ignored, no filter should be applied
      expect(projectRepository.findOne).not.toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('projectCode'),
        expect.anything(),
      );
    });
  });

  describe('findOneById', () => {
    it('should return an asset by id', async () => {
      assetRepository.findOne.mockResolvedValue(mockAsset);

      const result = await service.findOneById(456, undefined);

      expect(assetRepository.findOne).toHaveBeenCalledWith({
        where: { id: 456 },
      });
      expect(result).toEqual(mockAsset);
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.findOneById(0)).rejects.toThrow(BadRequestException);
      await expect(service.findOneById(-1)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when asset not found', async () => {
      assetRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOneById(999)).rejects.toThrow('Asset with ID 999 not found');
    });
  });

  describe('findOne', () => {
    it('should return an asset by code', async () => {
      assetRepository.findOne.mockResolvedValue(mockAsset);

      const result = await service.findOne('CHAR_001', undefined);

      expect(assetRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'CHAR_001' },
      });
      expect(result).toEqual(mockAsset);
    });

    it('should throw NotFoundException when asset not found', async () => {
      assetRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('CHAR_999')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('CHAR_999')).rejects.toThrow(
        'Asset with code CHAR_999 not found',
      );
    });
  });

  describe('update', () => {
    it('should update an asset successfully', async () => {
      const updateDto: UpdateAssetDto = {
        name: 'Updated Asset Name',
        statusId: 'status-uuid-approved',
      };

      const updatedAsset = {
        ...mockAsset,
        name: 'Updated Asset Name',
        statusId: 'status-uuid-approved',
      };

      assetRepository.findOne
        .mockResolvedValueOnce(mockAsset)
        .mockResolvedValueOnce(updatedAsset);
      assetRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(456, updateDto, undefined);

      expect(assetRepository.update).toHaveBeenCalledWith(
        456,
        expect.objectContaining({
          name: 'Updated Asset Name',
          statusId: 'status-uuid-approved',
        }),
      );
      expect(result).toEqual(updatedAsset);
    });

    it('should throw NotFoundException when asset not found', async () => {
      const updateDto: UpdateAssetDto = { name: 'Updated Name' };

      assetRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, updateDto, undefined)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating code to duplicate', async () => {
      const updateDto: UpdateAssetDto = {
        code: 'CHAR_DUPLICATE',
      };

      assetRepository.findOne
        .mockResolvedValueOnce(mockAsset)
        .mockResolvedValueOnce({
          id: 999,
          code: 'CHAR_DUPLICATE',
        });

      await expect(service.update(456, updateDto, undefined)).rejects.toThrow(ConflictException);
    });

    it('should validate project when projectId is updated', async () => {
      const updateDto: UpdateAssetDto = {
        projectId: 123,
      };

      const assetWithDifferentProject = {
        ...mockAsset,
        projectId: 999, // Different from updateDto.projectId
      };

      const updatedAsset = {
        ...mockAsset,
        projectId: 123,
      };

      assetRepository.findOne
        .mockResolvedValueOnce(assetWithDifferentProject)
        .mockResolvedValueOnce(updatedAsset);
      projectRepository.findOne.mockResolvedValue(mockProject);
      assetRepository.update.mockResolvedValue({ affected: 1 });

      await service.update(456, updateDto, undefined);

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 123 },
      });
    });

    it('should throw NotFoundException when project not found during update', async () => {
      const updateDto: UpdateAssetDto = {
        projectId: 999,
      };

      assetRepository.findOne.mockResolvedValueOnce(mockAsset);
      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.update(456, updateDto, undefined)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an asset successfully', async () => {
      assetRepository.findOne.mockResolvedValue(mockAsset);
      assetRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(456, undefined);

      expect(assetRepository.findOne).toHaveBeenCalledWith({ where: { id: 456 } });
      expect(assetRepository.delete).toHaveBeenCalledWith(456);
    });

    it('should throw NotFoundException when asset not found', async () => {
      jest
        .spyOn(service, 'findOneById')
        .mockRejectedValue(new NotFoundException('Asset with ID 999 not found'));

      assetRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999, undefined)).rejects.toThrow(NotFoundException);
      expect(assetRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('uploadThumbnail', () => {
    it('should upload thumbnail successfully', async () => {
      const mockFile = {
        originalname: 'thumbnail.jpg',
        buffer: Buffer.from('test'),
      };

      const assetWithThumbnail = {
        ...mockAsset,
        thumbnailPath: 'http://localhost:9000/thumbnails/test.jpg',
      };

      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(mockAsset);
      (minioService.getValidationOptions as jest.Mock).mockReturnValue({});
      (minioService.uploadFile as jest.Mock).mockResolvedValue({
        url: 'http://localhost:9000/thumbnails/test.jpg',
      });
      assetRepository.update.mockResolvedValue({ affected: 1 });
      assetRepository.findOne.mockResolvedValue(assetWithThumbnail); // For the final findOne call after update

      const result = await service.uploadThumbnail(456, mockFile, undefined);

      expect(service.findOneById).toHaveBeenCalledWith(456, undefined);
      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(assetRepository.update).toHaveBeenCalled();
      expect(result).toEqual(assetWithThumbnail);
    });

    it('should delete old thumbnail before uploading new one', async () => {
      const mockFile = {
        originalname: 'new-thumbnail.jpg',
        buffer: Buffer.from('test'),
      };

      const assetWithOldThumbnail = {
        ...mockAsset,
        thumbnailPath: 'http://localhost:9000/thumbnails/old.jpg',
      };

      const assetWithNewThumbnail = {
        ...mockAsset,
        thumbnailPath: 'http://localhost:9000/thumbnails/new.jpg',
      };

      jest.spyOn(service, 'findOneById').mockResolvedValueOnce(assetWithOldThumbnail);
      (minioService.getValidationOptions as jest.Mock).mockReturnValue({});
      (minioService.uploadFile as jest.Mock).mockResolvedValue({
        url: 'http://localhost:9000/thumbnails/new.jpg',
      });
      (minioService.deleteFile as jest.Mock).mockResolvedValue(undefined);
      assetRepository.update.mockResolvedValue({ affected: 1 });
      assetRepository.findOne.mockResolvedValue(assetWithNewThumbnail); // For the final findOne call after update

      await service.uploadThumbnail(456, mockFile, undefined);

      // extractBucketAndPath returns the full path, so deleteFile receives the full path
      expect(minioService.deleteFile).toHaveBeenCalled();
    });
  });
});
