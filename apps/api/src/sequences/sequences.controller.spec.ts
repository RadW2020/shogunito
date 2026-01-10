import { Test, TestingModule } from '@nestjs/testing';
import { SequencesController } from './sequences.controller';
import { SequencesService } from './sequences.service';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
import { FilterSequencesDto } from './dto/filter-sequences.dto';
import { Sequence } from '../entities/sequence.entity';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserRateLimitGuard } from '../common/guards/user-rate-limit.guard';

describe('SequencesController', () => {
  let controller: SequencesController;
  let service: SequencesService;

  const mockSequence: Sequence = {
    id: 123,
    code: 'SEQ_001',
    name: 'Test Sequence',
    description: 'Test description',
    statusId: 'status-uuid-in-progress',
    cutOrder: 1,
    duration: 300,
    episodeId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Sequence;

  const mockSequencesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOneById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SequencesController],
      providers: [
        {
          provide: SequencesService,
          useValue: mockSequencesService,
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

    controller = module.get<SequencesController>(SequencesController);
    service = module.get<SequencesService>(SequencesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a sequence successfully', async () => {
      const createDto: CreateSequenceDto = {
        code: 'SEQ_001',
        name: 'Test Sequence',
        cutOrder: 1,
        episodeId: 1,
        statusId: 'status-uuid-in-progress',
      };

      mockSequencesService.create.mockResolvedValue(mockSequence);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto, undefined);
      expect(result).toEqual(mockSequence);
    });

    it('should throw NotFoundException when episode not found', async () => {
      const createDto: CreateSequenceDto = {
        code: 'SEQ_001',
        name: 'Test Sequence',
        cutOrder: 1,
        episodeId: 999,
      };

      mockSequencesService.create.mockRejectedValue(
        new NotFoundException('Episode with code EP_999 not found'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all sequences without filters', async () => {
      const sequences = [mockSequence];
      mockSequencesService.findAll.mockResolvedValue(sequences);

      const result = await controller.findAll({});

      expect(service.findAll).toHaveBeenCalledWith({}, undefined);
      expect(result).toEqual(sequences);
    });

    it('should return filtered sequences', async () => {
      const filters: FilterSequencesDto = {
        status: 'in_progress',
        episodeId: 1,
      };

      mockSequencesService.findAll.mockResolvedValue([mockSequence]);

      const result = await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters, undefined);
      expect(result).toEqual([mockSequence]);
    });
  });

  describe('findOne', () => {
    it('should return a sequence by id', async () => {
      mockSequencesService.findOneById.mockResolvedValue(mockSequence);

      const result = await controller.findOne(123);

      expect(service.findOneById).toHaveBeenCalledWith(123, undefined);
      expect(result).toEqual(mockSequence);
    });

    it('should throw NotFoundException when sequence not found', async () => {
      mockSequencesService.findOneById.mockRejectedValue(
        new NotFoundException('Sequence with ID 999 not found'),
      );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a sequence successfully', async () => {
      const updateDto: UpdateSequenceDto = {
        name: 'Updated Sequence Name',
        statusId: 'status-uuid-approved',
      };

      const updatedSequence = { ...mockSequence, ...updateDto };
      mockSequencesService.update.mockResolvedValue(updatedSequence);

      const result = await controller.update(123, updateDto);

      expect(service.update).toHaveBeenCalledWith(123, updateDto, undefined);
      expect(result).toEqual(updatedSequence);
    });

    it('should throw NotFoundException when sequence not found', async () => {
      const updateDto: UpdateSequenceDto = { name: 'Updated Name' };

      mockSequencesService.update.mockRejectedValue(
        new NotFoundException('Sequence with code SEQ_999 not found'),
      );

      await expect(controller.update(999, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a sequence successfully', async () => {
      mockSequencesService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(123);

      expect(service.remove).toHaveBeenCalledWith(123, undefined);
      expect(result).toEqual({ message: 'Secuencia eliminada exitosamente' });
    });

    it('should throw NotFoundException when sequence not found', async () => {
      mockSequencesService.remove.mockRejectedValue(
        new NotFoundException('Sequence with code SEQ_999 not found'),
      );

      await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
