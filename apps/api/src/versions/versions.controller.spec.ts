import { Test, TestingModule } from '@nestjs/testing';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';
import { CreateVersionDto, VersionEntityType } from './dto/create-version.dto';
import { UpdateVersionDto } from './dto/update-version.dto';
import { CreateShotWithVersionDto } from './dto/create-shot-with-version.dto';
import { Version, VersionStatus } from '../entities/version.entity';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserRateLimitGuard } from '../common/guards/user-rate-limit.guard';

describe('VersionsController', () => {
  let controller: VersionsController;
  let service: VersionsService;

  const mockVersion: Version = {
    id: 123,
    code: 'VER_001',
    name: 'Test Version',
    description: 'Test description',
    versionNumber: 1,
    status: VersionStatus.WIP,
    entityId: 456,
    entityType: VersionEntityType.SHOT,
    createdAt: new Date(),
    updatedAt: new Date(),
    latest: true,
    notes: Promise.resolve([]),
  } as unknown as Version;

  const mockVersionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOneById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createShotWithVersion: jest.fn(),
    createAssetWithVersion: jest.fn(),
    createSequenceWithVersion: jest.fn(),
    createPlaylistWithVersion: jest.fn(),
    uploadThumbnail: jest.fn(),
    uploadFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VersionsController],
      providers: [
        {
          provide: VersionsService,
          useValue: mockVersionsService,
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

    controller = module.get<VersionsController>(VersionsController);
    service = module.get<VersionsService>(VersionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a version successfully', async () => {
      const createDto: CreateVersionDto = {
        code: 'VER_001',
        name: 'Test Version',
        entityCode: 'SH_001',
        entityType: VersionEntityType.SHOT,
        status: VersionStatus.WIP,
      };

      mockVersionsService.create.mockResolvedValue(mockVersion);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto, undefined);
      expect(result).toEqual(mockVersion);
    });

    it('should throw NotFoundException when entity not found', async () => {
      const createDto: CreateVersionDto = {
        code: 'VER_001',
        name: 'Test Version',
        entityCode: 'SH_999',
        entityType: VersionEntityType.SHOT,
      };

      mockVersionsService.create.mockRejectedValue(
        new NotFoundException('Entity with code SH_999 not found'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all versions', async () => {
      const versions = [mockVersion];
      mockVersionsService.findAll.mockResolvedValue(versions);

      const result = await controller.findAll(undefined, undefined, undefined);

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(versions);
    });
  });

  describe('findOne', () => {
    it('should return a version by id', async () => {
      mockVersionsService.findOneById.mockResolvedValue(mockVersion);

      const result = await controller.findOne(123);

      expect(service.findOneById).toHaveBeenCalledWith(123, undefined);
      expect(result).toEqual(mockVersion);
    });

    it('should throw NotFoundException when version not found', async () => {
      mockVersionsService.findOneById.mockRejectedValue(
        new NotFoundException('Version with ID 999 not found'),
      );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a version successfully', async () => {
      const updateDto: UpdateVersionDto = {
        name: 'Updated Version Name',
        status: VersionStatus.APPROVED,
      };

      const updatedVersion = { ...mockVersion, ...updateDto };
      mockVersionsService.update.mockResolvedValue(updatedVersion);

      const result = await controller.update(123, updateDto);

      expect(service.update).toHaveBeenCalledWith(123, updateDto, undefined);
      expect(result).toEqual(updatedVersion);
    });
  });

  describe('remove', () => {
    it('should delete a version successfully', async () => {
      mockVersionsService.remove.mockResolvedValue(undefined);

      await controller.remove(123);

      expect(service.remove).toHaveBeenCalledWith(123, undefined);
    });
  });

  describe('createShotWithVersion', () => {
    it('should create shot with version successfully', async () => {
      const createDto: CreateShotWithVersionDto = {
        name: 'Test Shot',
        sequenceNumber: 1,
        sequenceCode: 'SEQ_001',
        versionCode: 'VER_001',
        versionName: 'Test Version',
      };

      const result = {
        shot: { id: 'shot-123', name: 'Test Shot' },
        version: mockVersion,
      };

      mockVersionsService.createShotWithVersion.mockResolvedValue(result);

      const response = await controller.createShotWithVersion(createDto);

      expect(service.createShotWithVersion).toHaveBeenCalledWith(createDto, undefined);
      expect(response).toEqual(result);
    });
  });

  describe('simple', () => {
    it('should return versions with count', async () => {
      const versions = [mockVersion, { ...mockVersion, id: 124 }];
      mockVersionsService.findAll.mockResolvedValue(versions);

      const result = await controller.simple();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual({
        count: 2,
        data: versions,
      });
    });

    it('should handle errors and return error information', async () => {
      const error = new Error('Database connection failed');
      mockVersionsService.findAll.mockRejectedValue(error);

      const result = await controller.simple();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('stack');
      expect(result.error).toBe('Database connection failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockVersionsService.findAll.mockRejectedValue('String error');

      const result = await controller.simple();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toHaveProperty('error');
      expect(result.error).toBe('String error');
    });
  });

  describe('findAll', () => {
    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockVersionsService.findAll.mockRejectedValue(error);

      await expect(controller.findAll(undefined, undefined, undefined)).rejects.toThrow(
        'Service error',
      );
    });
  });

  describe('findOne', () => {
    it('should handle invalid id parameter', async () => {
      // ParseIntPipe will throw BadRequestException for invalid IDs
      // This is handled by NestJS validation pipes
      mockVersionsService.findOneById.mockRejectedValue(
        new NotFoundException('Version with ID 999 not found'),
      );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should handle service errors', async () => {
      const updateDto: UpdateVersionDto = { name: 'Updated Name' };
      const error = new Error('Update failed');
      mockVersionsService.update.mockRejectedValue(error);

      await expect(controller.update(123, updateDto)).rejects.toThrow('Update failed');
    });
  });

  describe('remove', () => {
    it('should handle service errors', async () => {
      const error = new Error('Delete failed');
      mockVersionsService.remove.mockRejectedValue(error);

      await expect(controller.remove(123)).rejects.toThrow('Delete failed');
    });
  });

  describe('uploadThumbnail', () => {
    it('should handle file upload errors', async () => {
      const mockFile = { originalname: 'thumb.jpg' } as any;
      const error = new Error('Upload failed');
      mockVersionsService.uploadThumbnail = jest.fn().mockRejectedValue(error);

      await expect(controller.uploadThumbnail(123, mockFile)).rejects.toThrow('Upload failed');
    });

    it('should handle invalid file types', async () => {
      const mockFile = { originalname: 'document.pdf' } as any;
      const error = new Error('Invalid file type');
      mockVersionsService.uploadThumbnail = jest.fn().mockRejectedValue(error);

      await expect(controller.uploadThumbnail(123, mockFile)).rejects.toThrow('Invalid file type');
    });
  });

  describe('uploadFile', () => {
    it('should handle file upload errors', async () => {
      const mockFile = { originalname: 'video.mp4' } as any;
      const error = new Error('Upload failed');
      mockVersionsService.uploadFile = jest.fn().mockRejectedValue(error);

      await expect(controller.uploadFile(123, mockFile)).rejects.toThrow('Upload failed');
    });

    it('should handle file size errors', async () => {
      const mockFile = {
        originalname: 'large-video.mp4',
        size: 10000000000,
      } as any;
      const error = new Error('File too large');
      mockVersionsService.uploadFile = jest.fn().mockRejectedValue(error);

      await expect(controller.uploadFile(123, mockFile)).rejects.toThrow('File too large');
    });
  });
});
