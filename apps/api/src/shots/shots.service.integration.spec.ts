import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ShotsService } from './shots.service';
import { Shot, Sequence, Episode, Status, ProjectRole, Version } from '../entities';
import { CreateShotDto } from './dto/create-shot.dto';
import { UpdateShotDto } from './dto/update-shot.dto';
import { FilterShotsDto } from './dto/filter-shots.dto';
import { ProjectAccessService, UserContext } from '../auth/services/project-access.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ShotType } from '../entities/shot.entity';

/**
 * Integration tests for ShotsService
 *
 * Tests shot management flows with:
 * - Shot creation with sequence validation
 * - Automatic code generation
 * - Access control and permissions
 * - Shot filtering and search
 * - Shot updates with permission checks
 * - Shot deletion
 */
describe('ShotsService Integration Tests', () => {
  let module: TestingModule;
  let shotsService: ShotsService;
  let shotRepository: jest.Mocked<any>;
  let sequenceRepository: jest.Mocked<any>;
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

  const mockProject = {
    id: 123,
    code: 'PROJ_001',
    name: 'Test Project',
  };

  const mockEpisode: Episode = {
    id: 456,
    code: 'EP_001',
    name: 'Episode 1',
    projectId: 123,
    project: mockProject as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Episode;

  const mockSequence: Sequence = {
    id: 789,
    code: 'SEQ_001',
    name: 'Sequence 1',
    episodeId: 456,
    episode: mockEpisode,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Sequence;

  const mockStatus: Status = {
    id: 'status-uuid-123',
    code: 'wip',
    name: 'Work In Progress',
    color: '#FFA500',
    isActive: true,
    sortOrder: 0,
    applicableEntities: ['shot'],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Status;

  const mockShot: Shot = {
    id: 1001,
    code: 'SH001',
    name: 'Test Shot',
    description: 'Test description',
    sequenceNumber: 1,
    statusId: 'status-uuid-123',
    status: mockStatus,
    shotType: ShotType.MEDIUM,
    duration: 120,
    cutOrder: 1,
    sequenceId: 789,
    sequence: mockSequence,
    createdBy: 1,
    assignedTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Shot;

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      providers: [
        ShotsService,
        {
          provide: getRepositoryToken(Shot),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => {
              const qb = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                leftJoin: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
              };
              return qb;
            }),
            manager: {
              createQueryBuilder: jest.fn(() => ({
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
              })),
            },
          },
        },
        {
          provide: getRepositoryToken(Sequence),
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
          provide: ProjectAccessService,
          useValue: {
            verifyProjectAccess: jest.fn(),
            verifyShotAccess: jest.fn(),
            isAdmin: jest.fn(),
            getAccessibleProjectIds: jest.fn(),
          },
        },
      ],
    }).compile();

    shotsService = testModule.get<ShotsService>(ShotsService);
    shotRepository = testModule.get(getRepositoryToken(Shot));
    sequenceRepository = testModule.get(getRepositoryToken(Sequence));
    statusRepository = testModule.get(getRepositoryToken(Status));
    projectAccessService = testModule.get<ProjectAccessService>(ProjectAccessService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Shot Creation', () => {
    it('should create shot with provided code', async () => {
      const createDto: CreateShotDto = {
        code: 'SH_CUSTOM',
        name: 'Custom Shot',
        sequenceNumber: 1,
        sequenceId: 789,
      };

      sequenceRepository.findOne.mockResolvedValue(mockSequence);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      shotRepository.findOne.mockResolvedValue(null); // No duplicate
      shotRepository.count.mockResolvedValue(0);
      shotRepository.create.mockReturnValue({
        ...mockShot,
        ...createDto,
      });
      shotRepository.save.mockResolvedValue({
        ...mockShot,
        ...createDto,
        id: 1002,
      });
      shotRepository.findOne
        .mockResolvedValueOnce(null) // Check duplicate
        .mockResolvedValueOnce({
          ...mockShot,
          ...createDto,
          id: 1002,
          sequence: mockSequence,
          status: mockStatus,
        }); // Reload after save
      statusRepository.findOne.mockResolvedValue(mockStatus);

      const result = await shotsService.create(createDto, mockUserContext);

      expect(result).toHaveProperty('code', createDto.code);
      expect(result).toHaveProperty('name', createDto.name);
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should generate code automatically if not provided', async () => {
      const createDto: CreateShotDto = {
        name: 'Auto Code Shot',
        sequenceNumber: 1,
        sequenceId: 789,
      };

      sequenceRepository.findOne.mockResolvedValue(mockSequence);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      shotRepository.count.mockResolvedValue(2); // 2 existing shots
      shotRepository.create.mockReturnValue({
        ...mockShot,
        ...createDto,
        code: 'SH003',
      });
      shotRepository.save.mockResolvedValue({
        ...mockShot,
        ...createDto,
        code: 'SH003',
        id: 1003,
      });
      shotRepository.findOne.mockResolvedValue({
        ...mockShot,
        ...createDto,
        code: 'SH003',
        id: 1003,
        sequence: mockSequence,
        status: mockStatus,
      });
      statusRepository.findOne.mockResolvedValue(mockStatus);

      const result = await shotsService.create(createDto, mockUserContext);

      expect(result.code).toBe('SH003');
      expect(shotRepository.count).toHaveBeenCalled();
    });

    it('should require sequenceId', async () => {
      const createDto: CreateShotDto = {
        name: 'Invalid Shot',
        sequenceNumber: 1,
      } as CreateShotDto;

      await expect(shotsService.create(createDto, mockUserContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for non-existent sequence', async () => {
      const createDto: CreateShotDto = {
        name: 'Shot',
        sequenceNumber: 1,
        sequenceId: 999,
      };

      sequenceRepository.findOne.mockResolvedValue(null);

      await expect(shotsService.create(createDto, mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should prevent duplicate shot codes', async () => {
      const createDto: CreateShotDto = {
        code: 'SH_DUPLICATE',
        name: 'Duplicate Shot',
        sequenceNumber: 1,
        sequenceId: 789,
      };

      sequenceRepository.findOne.mockResolvedValue(mockSequence);
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      shotRepository.findOne.mockResolvedValue(mockShot); // Existing shot with same code

      await expect(shotsService.create(createDto, mockUserContext)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should verify user has contributor access', async () => {
      const createDto: CreateShotDto = {
        name: 'Shot',
        sequenceNumber: 1,
        sequenceId: 789,
      };

      sequenceRepository.findOne.mockResolvedValue(mockSequence);
      projectAccessService.verifyProjectAccess.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(shotsService.create(createDto, mockUserContext)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Shot Filtering and Search', () => {
    it('should filter shots by status', async () => {
      const queryBuilder = shotRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockShot]);
      shotRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      shotRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);

      const filters: FilterShotsDto = { status: 'wip' };
      const result = await shotsService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter shots by shotType', async () => {
      const queryBuilder = shotRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockShot]);
      shotRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      shotRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);

      const filters: FilterShotsDto = { shotType: ShotType.MEDIUM };
      const result = await shotsService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter shots by sequenceId', async () => {
      const queryBuilder = shotRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockShot]);
      shotRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      shotRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);

      const filters: FilterShotsDto = { sequenceId: 789 };
      const result = await shotsService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter shots by sequenceCode', async () => {
      const queryBuilder = shotRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockShot]);
      shotRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      shotRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);
      sequenceRepository.findOne.mockResolvedValue(mockSequence);

      const filters: FilterShotsDto = { sequenceCode: 'SEQ_001' };
      const result = await shotsService.findAll(filters, mockAdminContext);

      expect(sequenceRepository.findOne).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array for non-existent sequenceCode', async () => {
      const queryBuilder = shotRepository.createQueryBuilder();
      shotRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);
      sequenceRepository.findOne.mockResolvedValue(null);

      const filters: FilterShotsDto = { sequenceCode: 'NON_EXISTENT' };
      const result = await shotsService.findAll(filters, mockAdminContext);

      expect(result).toEqual([]);
    });

    it('should filter shots by createdBy', async () => {
      const queryBuilder = shotRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockShot]);
      shotRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      shotRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);

      const filters: FilterShotsDto = { createdBy: 1 };
      const result = await shotsService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter shots by assignedTo', async () => {
      const queryBuilder = shotRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockShot]);
      shotRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      shotRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(true);

      const filters: FilterShotsDto = { assignedTo: 2 };
      const result = await shotsService.findAll(filters, mockAdminContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should restrict regular user to accessible projects', async () => {
      const queryBuilder = shotRepository.createQueryBuilder();
      queryBuilder.getMany = jest.fn().mockResolvedValue([mockShot]);
      shotRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      shotRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(false);
      projectAccessService.getAccessibleProjectIds = jest.fn().mockResolvedValue([123]);

      const result = await shotsService.findAll({}, mockUserContext);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when user has no project access', async () => {
      const queryBuilder = shotRepository.createQueryBuilder();
      shotRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);
      projectAccessService.isAdmin = jest.fn().mockReturnValue(false);
      projectAccessService.getAccessibleProjectIds = jest.fn().mockResolvedValue([]);

      const result = await shotsService.findAll({}, mockUserContext);

      expect(result).toEqual([]);
    });
  });

  describe('Shot Retrieval', () => {
    it('should find shot by ID', async () => {
      shotRepository.findOne.mockResolvedValue({
        ...mockShot,
        sequence: mockSequence,
        status: mockStatus,
      });
      projectAccessService.verifyShotAccess.mockResolvedValue(undefined);
      shotRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);

      const result = await shotsService.findOneById(1001, mockUserContext);

      expect(result).toHaveProperty('id', 1001);
      expect(projectAccessService.verifyShotAccess).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(shotsService.findOneById(-1, mockUserContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for non-existent shot', async () => {
      shotRepository.findOne.mockResolvedValue(null);

      await expect(shotsService.findOneById(9999, mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should find shot by code', async () => {
      shotRepository.findOne.mockResolvedValue({
        ...mockShot,
        sequence: mockSequence,
        status: mockStatus,
      });
      shotRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);

      const result = await shotsService.findOne('SH001');

      expect(result).toHaveProperty('code', 'SH001');
    });

    it('should throw NotFoundException for non-existent code', async () => {
      shotRepository.findOne.mockResolvedValue(null);

      await expect(shotsService.findOne('NON_EXISTENT')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Shot Updates', () => {
    it('should update shot information', async () => {
      const updateDto: UpdateShotDto = {
        name: 'Updated Shot Name',
        description: 'Updated description',
      };

      shotRepository.findOne
        .mockResolvedValueOnce({
          ...mockShot,
          sequence: mockSequence,
        }) // First call in update
        .mockResolvedValueOnce({
          ...mockShot,
          ...updateDto,
          sequence: mockSequence,
          status: mockStatus,
        }); // Second call in findOneById
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      shotRepository.update.mockResolvedValue({ affected: 1 });
      shotRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.verifyShotAccess.mockResolvedValue(undefined);

      const result = await shotsService.update(1001, updateDto, mockUserContext);

      expect(result.name).toBe(updateDto.name);
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should prevent duplicate code on update', async () => {
      const updateDto: UpdateShotDto = {
        code: 'SH_DUPLICATE',
      };

      shotRepository.findOne
        .mockResolvedValueOnce({
          ...mockShot,
          sequence: mockSequence,
        }) // First call in update
        .mockResolvedValueOnce({
          ...mockShot,
          id: 9999,
          code: 'SH_DUPLICATE',
        }); // Second call to check duplicate

      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);

      await expect(shotsService.update(1001, updateDto, mockUserContext)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow updating to same code', async () => {
      const updateDto: UpdateShotDto = {
        code: 'SH001', // Same as existing
        name: 'Updated Name',
      };

      shotRepository.findOne
        .mockResolvedValueOnce({
          ...mockShot,
          sequence: mockSequence,
        }) // First call in update
        .mockResolvedValueOnce({
          ...mockShot,
          code: 'SH001',
        }) // Second call to check duplicate (same ID)
        .mockResolvedValueOnce({
          ...mockShot,
          ...updateDto,
          sequence: mockSequence,
          status: mockStatus,
        }); // Third call in findOneById
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      shotRepository.update.mockResolvedValue({ affected: 1 });
      shotRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.verifyShotAccess.mockResolvedValue(undefined);

      const result = await shotsService.update(1001, updateDto, mockUserContext);

      expect(result.name).toBe(updateDto.name);
    });

    it('should update shot sequence', async () => {
      const newSequence: Sequence = {
        ...mockSequence,
        id: 999,
        code: 'SEQ_002',
      };
      const updateDto: UpdateShotDto = {
        sequenceId: 999,
      };

      shotRepository.findOne
        .mockResolvedValueOnce({
          ...mockShot,
          sequence: mockSequence,
        }) // First call in update
        .mockResolvedValueOnce({
          ...mockShot,
          sequenceId: 999,
          sequence: newSequence,
          status: mockStatus,
        }); // Second call in findOneById
      sequenceRepository.findOne.mockResolvedValue({
        ...newSequence,
        episode: mockEpisode,
      });
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      shotRepository.update.mockResolvedValue({ affected: 1 });
      shotRepository.manager.createQueryBuilder().getMany = jest.fn().mockResolvedValue([]);
      statusRepository.findOne.mockResolvedValue(mockStatus);
      projectAccessService.verifyShotAccess.mockResolvedValue(undefined);

      const result = await shotsService.update(1001, updateDto, mockUserContext);

      expect(sequenceRepository.findOne).toHaveBeenCalled();
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalledTimes(2); // Old and new sequence
    });

    it('should throw NotFoundException for non-existent shot', async () => {
      shotRepository.findOne.mockResolvedValue(null);

      await expect(shotsService.update(9999, { name: 'Updated' }, mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Shot Deletion', () => {
    it('should delete shot with contributor access', async () => {
      shotRepository.findOne.mockResolvedValue({
        ...mockShot,
        sequence: mockSequence,
      });
      projectAccessService.verifyProjectAccess.mockResolvedValue(undefined);
      shotRepository.delete.mockResolvedValue({ affected: 1 });

      await shotsService.remove(1001, mockUserContext);

      expect(shotRepository.delete).toHaveBeenCalledWith(1001);
      expect(projectAccessService.verifyProjectAccess).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent shot', async () => {
      shotRepository.findOne.mockResolvedValue(null);

      await expect(shotsService.remove(9999, mockUserContext)).rejects.toThrow(NotFoundException);
    });

    it('should verify user has contributor access before deletion', async () => {
      shotRepository.findOne.mockResolvedValue({
        ...mockShot,
        sequence: mockSequence,
      });
      projectAccessService.verifyProjectAccess.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(shotsService.remove(1001, mockUserContext)).rejects.toThrow(ForbiddenException);
    });
  });
});

