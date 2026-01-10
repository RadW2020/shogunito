import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from '../entities/audit-log.entity';
import { AxiomService } from './axiom.service';
import { Between } from 'typeorm';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogRepository: any;
  let axiomService: any;

  const mockAuditLog: AuditLog = {
    id: 'audit-123',
    userId: 'user-123',
    username: 'test@example.com',
    action: 'CREATE',
    entityType: 'Project',
    entityId: 'project-123',
    changes: { name: 'New Project' },
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    method: 'POST',
    endpoint: '/api/projects',
    statusCode: 201,
    errorMessage: null,
    metadata: {},
    createdAt: new Date(),
  } as AuditLog;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              delete: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              execute: jest.fn(),
            })),
          },
        },
        {
          provide: AxiomService,
          useValue: {
            sendLog: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditLogRepository = module.get(getRepositoryToken(AuditLog));
    axiomService = module.get(AxiomService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create and save audit log', async () => {
      const logData = {
        userId: 'user-123',
        action: 'CREATE',
        entityType: 'Project',
        entityId: 'project-123',
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog);
      axiomService.sendLog.mockResolvedValue(undefined);

      const result = await service.log(logData);

      expect(auditLogRepository.create).toHaveBeenCalledWith(logData);
      expect(auditLogRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockAuditLog);
    });

    it('should send log to Axiom asynchronously', async () => {
      const logData = {
        userId: 'user-123',
        action: 'CREATE',
        entityType: 'Project',
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog);
      axiomService.sendLog.mockResolvedValue(undefined);

      await service.log(logData);

      // Wait for async call to complete by flushing all pending promises
      // The service calls sendLog in a fire-and-forget manner with .catch()
      // We need to wait for the promise chain to be scheduled and processed
      await new Promise<void>((resolve) => {
        // Use setImmediate to wait for the next tick where the async call should be scheduled
        setImmediate(() => {
          // Give it one more tick to ensure the promise chain is processed
          setImmediate(() => {
            // One final tick to ensure the catch handler is processed
            setImmediate(resolve);
          });
        });
      });

      expect(axiomService.sendLog).toHaveBeenCalledWith(mockAuditLog);
    });

    it('should not fail if Axiom send fails', async () => {
      const logData = {
        userId: 'user-123',
        action: 'CREATE',
        entityType: 'Project',
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog);
      axiomService.sendLog.mockRejectedValue(new Error('Axiom error'));

      const result = await service.log(logData);

      expect(result).toEqual(mockAuditLog);
      // Should not throw even if Axiom fails
    });
  });

  describe('findAll', () => {
    it('should return paginated audit logs without filters', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(auditLogRepository.findAndCount).toHaveBeenCalled();
      expect(result.data).toEqual([mockAuditLog]);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by userId', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      await service.findAll({ userId: 'user-123', page: 1, limit: 20 });

      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by entityType', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      await service.findAll({ entityType: 'Project', page: 1, limit: 20 });

      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith({
        where: { entityType: 'Project' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by action', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      await service.findAll({ action: 'CREATE', page: 1, limit: 20 });

      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith({
        where: { action: 'CREATE' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      await service.findAll({
        startDate,
        endDate,
        page: 1,
        limit: 20,
      });

      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          createdAt: Between(startDate, endDate),
        },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should not filter by date range if only startDate provided', async () => {
      const startDate = new Date('2024-01-01');
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      await service.findAll({
        startDate,
        page: 1,
        limit: 20,
      });

      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should not filter by date range if only endDate provided', async () => {
      const endDate = new Date('2024-12-31');
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      await service.findAll({
        endDate,
        page: 1,
        limit: 20,
      });

      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should combine multiple filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      await service.findAll({
        userId: 'user-123',
        entityType: 'Project',
        action: 'CREATE',
        startDate,
        endDate,
        page: 1,
        limit: 20,
      });

      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          entityType: 'Project',
          action: 'CREATE',
          createdAt: Between(startDate, endDate),
        },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should apply pagination', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 2, limit: 10 });

      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        skip: 10,
        take: 10,
      });
    });
  });

  describe('findByUser', () => {
    it('should return audit logs for a specific user', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      const result = await service.findByUser('user-123', 1, 20);

      expect(auditLogRepository.findAndCount).toHaveBeenCalled();
      expect(result.data).toEqual([mockAuditLog]);
    });

    it('should use default pagination when not provided', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      await service.findByUser('user-123');

      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should apply custom pagination', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      await service.findByUser('user-123', 2, 10);

      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { createdAt: 'DESC' },
        skip: 10,
        take: 10,
      });
    });
  });

  describe('findByEntity', () => {
    it('should return audit logs for a specific entity', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      const result = await service.findByEntity('Project', 'project-123', 1, 20);

      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith({
        where: { entityType: 'Project', entityId: 'project-123' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toEqual([mockAuditLog]);
    });

    it('should use default pagination when not provided', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      await service.findByEntity('Project', 'project-123');

      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith({
        where: { entityType: 'Project', entityId: 'project-123' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should apply custom pagination', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      await service.findByEntity('Project', 'project-123', 3, 15);

      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith({
        where: { entityType: 'Project', entityId: 'project-123' },
        order: { createdAt: 'DESC' },
        skip: 30,
        take: 15,
      });
    });
  });

  describe('getStatistics', () => {
    it('should return audit statistics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      auditLogRepository.find.mockResolvedValue([
        {
          ...mockAuditLog,
          action: 'CREATE',
          userId: 'user-123',
          entityType: 'Project',
        },
        {
          ...mockAuditLog,
          action: 'UPDATE',
          entityType: 'Shot',
          userId: 'user-123',
        },
        {
          ...mockAuditLog,
          action: 'CREATE',
          userId: 'user-456',
          entityType: 'Project',
        },
      ]);

      const result = await service.getStatistics(startDate, endDate);

      expect(auditLogRepository.find).toHaveBeenCalledWith({
        where: {
          createdAt: Between(startDate, endDate),
        },
      });
      expect(result).toBeDefined();
      expect(result.total).toBe(3);
      expect(result.byAction).toBeDefined();
      expect(result.byAction.CREATE).toBe(2);
      expect(result.byAction.UPDATE).toBe(1);
      expect(result.byEntityType).toBeDefined();
      expect(result.byEntityType.Project).toBe(2);
      expect(result.byEntityType.Shot).toBe(1);
      expect(result.byUser).toBeDefined();
      expect(result.byUser['user-123']).toBe(2);
      expect(result.byUser['user-456']).toBe(1);
      expect(result.period.start).toEqual(startDate);
      expect(result.period.end).toEqual(endDate);
    });

    it('should return empty statistics when no logs found', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      auditLogRepository.find.mockResolvedValue([]);

      const result = await service.getStatistics(startDate, endDate);

      expect(result.total).toBe(0);
      expect(result.byAction).toEqual({});
      expect(result.byEntityType).toEqual({});
      expect(result.byUser).toEqual({});
    });
  });

  describe('deleteOldLogs', () => {
    it('should delete logs older than retention period', async () => {
      const retentionDays = 90;
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };

      auditLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.deleteOldLogs(retentionDays);

      expect(auditLogRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'audit_log.createdAt < :cutoffDate',
        expect.objectContaining({ cutoffDate: expect.any(Date) }),
      );
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('should return 0 when no logs are deleted', async () => {
      const retentionDays = 90;
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };

      auditLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.deleteOldLogs(retentionDays);

      expect(result).toBe(0);
    });

    it('should return 0 when affected is undefined', async () => {
      const retentionDays = 90;
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };

      auditLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.deleteOldLogs(retentionDays);

      expect(result).toBe(0);
    });
  });
});
