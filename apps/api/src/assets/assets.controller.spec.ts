import { Test, TestingModule } from '@nestjs/testing';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { FilterAssetsDto } from './dto/filter-assets.dto';
import { Asset } from '../entities/asset.entity';
import { NotFoundException } from '@nestjs/common';
import { AssetType } from '@shogun/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserRateLimitGuard } from '../common/guards/user-rate-limit.guard';

describe('AssetsController', () => {
  let controller: AssetsController;
  let service: AssetsService;

  const mockAsset: Asset = {
    id: 123,
    code: 'CHAR_001',
    name: 'Test Asset',
    description: 'Test description',
    assetType: AssetType.TEXT,
    statusId: 'status-uuid-in-progress',
    projectId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Asset;

  const mockAssetsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOneById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    uploadThumbnail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssetsController],
      providers: [
        {
          provide: AssetsService,
          useValue: mockAssetsService,
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

    controller = module.get<AssetsController>(AssetsController);
    service = module.get<AssetsService>(AssetsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an asset successfully', async () => {
      const createDto: CreateAssetDto = {
        code: 'CHAR_001',
        name: 'Test Asset',
        assetType: AssetType.TEXT,
        projectId: 123,
        statusId: 'status-uuid-in-progress',
      };

      mockAssetsService.create.mockResolvedValue(mockAsset);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto, undefined);
      expect(result).toEqual(mockAsset);
    });

    it('should throw NotFoundException when project not found', async () => {
      const createDto: CreateAssetDto = {
        code: 'CHAR_001',
        name: 'Test Asset',
        assetType: AssetType.TEXT,
        projectId: 999,
      };

      mockAssetsService.create.mockRejectedValue(
        new NotFoundException('Project with ID project-999 not found'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all assets without filters', async () => {
      const assets = [mockAsset];
      mockAssetsService.findAll.mockResolvedValue(assets);

      const result = await controller.findAll(undefined);

      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toEqual(assets);
    });

    it('should return filtered assets', async () => {
      const filters: FilterAssetsDto = {
        status: 'in_progress',
        assetType: AssetType.TEXT,
      };

      mockAssetsService.findAll.mockResolvedValue([mockAsset]);

      const result = await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters, undefined);
      expect(result).toEqual([mockAsset]);
    });
  });

  describe('findOne', () => {
    it('should return an asset by id', async () => {
      mockAssetsService.findOneById.mockResolvedValue(mockAsset);

      const result = await controller.findOne(123);

      expect(service.findOneById).toHaveBeenCalledWith(123, undefined);
      expect(result).toEqual(mockAsset);
    });

    it('should throw NotFoundException when asset not found', async () => {
      mockAssetsService.findOneById.mockRejectedValue(
        new NotFoundException('Asset with ID 999 not found'),
      );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an asset successfully', async () => {
      const updateDto: UpdateAssetDto = {
        name: 'Updated Asset Name',
        statusId: 'status-uuid-approved',
      };

      const updatedAsset = { ...mockAsset, ...updateDto };
      mockAssetsService.update.mockResolvedValue(updatedAsset);

      const result = await controller.update(123, updateDto);

      expect(service.update).toHaveBeenCalledWith(123, updateDto, undefined);
      expect(result).toEqual(updatedAsset);
    });

    it('should throw NotFoundException when asset not found', async () => {
      const updateDto: UpdateAssetDto = { name: 'Updated Name' };

      mockAssetsService.update.mockRejectedValue(
        new NotFoundException('Asset with ID 999 not found'),
      );

      await expect(controller.update(999, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an asset successfully', async () => {
      mockAssetsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(123);

      expect(service.remove).toHaveBeenCalledWith(123, undefined);
      expect(result).toEqual({ message: 'Asset eliminado exitosamente' });
    });

    it('should throw NotFoundException when asset not found', async () => {
      mockAssetsService.remove.mockRejectedValue(
        new NotFoundException('Asset with ID 999 not found'),
      );

      await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
