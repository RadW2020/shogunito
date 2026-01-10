import { Test, TestingModule } from '@nestjs/testing';
import { ShotsController } from './shots.controller';
import { ShotsService } from './shots.service';
import { CreateShotDto } from './dto/create-shot.dto';
import { UpdateShotDto } from './dto/update-shot.dto';
import { FilterShotsDto } from './dto/filter-shots.dto';
import { Shot, ShotType } from '../entities/shot.entity';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserRateLimitGuard } from '../common/guards/user-rate-limit.guard';

describe('ShotsController', () => {
  let controller: ShotsController;
  let service: ShotsService;

  const mockShot: Shot = {
    id: 123,
    code: 'SH_001',
    name: 'Test Shot',
    description: 'Test description',
    statusId: 'status-uuid-in-progress',
    sequenceNumber: 1,
    duration: 120,
    sequenceId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Shot;

  const mockShotsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOneById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShotsController],
      providers: [
        {
          provide: ShotsService,
          useValue: mockShotsService,
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

    controller = module.get<ShotsController>(ShotsController);
    service = module.get<ShotsService>(ShotsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a shot successfully', async () => {
      const createDto: CreateShotDto = {
        code: 'SH_001',
        name: 'Test Shot',
        sequenceNumber: 1,
        sequenceId: 1,
        statusId: 'status-uuid-in-progress',
      };

      mockShotsService.create.mockResolvedValue(mockShot);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto, undefined);
      expect(result).toEqual(mockShot);
    });

    it('should throw NotFoundException when sequence not found', async () => {
      const createDto: CreateShotDto = {
        code: 'SH_001',
        name: 'Test Shot',
        sequenceNumber: 1,
        sequenceId: 999,
      };

      mockShotsService.create.mockRejectedValue(
        new NotFoundException('Sequence with code SEQ_999 not found'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all shots without filters', async () => {
      const shots = [mockShot];
      mockShotsService.findAll.mockResolvedValue(shots);

      const result = await controller.findAll({});

      expect(service.findAll).toHaveBeenCalledWith({}, undefined);
      expect(result).toEqual(shots);
    });

    it('should return filtered shots', async () => {
      const filters: FilterShotsDto = {
        status: 'in_progress',
        shotType: ShotType.CLOSEUP,
      };

      mockShotsService.findAll.mockResolvedValue([mockShot]);

      const result = await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters, undefined);
      expect(result).toEqual([mockShot]);
    });
  });

  describe('findOne', () => {
    it('should return a shot by id', async () => {
      mockShotsService.findOneById.mockResolvedValue(mockShot);

      const result = await controller.findOne(123);

      expect(service.findOneById).toHaveBeenCalledWith(123, undefined);
      expect(result).toEqual(mockShot);
    });

    it('should throw NotFoundException when shot not found', async () => {
      mockShotsService.findOneById.mockRejectedValue(
        new NotFoundException('Shot with ID 999 not found'),
      );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a shot successfully', async () => {
      const updateDto: UpdateShotDto = {
        name: 'Updated Shot Name',
        statusId: 'status-uuid-approved',
      };

      const updatedShot = { ...mockShot, ...updateDto };
      mockShotsService.update.mockResolvedValue(updatedShot);

      const result = await controller.update(123, updateDto);

      expect(service.update).toHaveBeenCalledWith(123, updateDto, undefined);
      expect(result).toEqual(updatedShot);
    });

    it('should throw NotFoundException when shot not found', async () => {
      const updateDto: UpdateShotDto = { name: 'Updated Name' };

      mockShotsService.update.mockRejectedValue(
        new NotFoundException('Shot with code SH_999 not found'),
      );

      await expect(controller.update(999, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a shot successfully', async () => {
      mockShotsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(123);

      expect(service.remove).toHaveBeenCalledWith(123, undefined);
      expect(result).toEqual({ message: 'Shot eliminado exitosamente' });
    });

    it('should throw NotFoundException when shot not found', async () => {
      mockShotsService.remove.mockRejectedValue(
        new NotFoundException('Shot with code SH_999 not found'),
      );

      await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
