import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from '../entities/audit-log.entity';
import { AxiomService } from './axiom.service';

/**
 * Integration tests for AuditService
 *
 * Tests audit logging flows with:
 * - Log creation
 * - Log filtering and search
 * - Statistics generation
 * - Log cleanup
 */
describe('AuditService Integration Tests', () => {
  let module: TestingModule;
  let auditService: AuditService;
  let auditLogRepository: jest.Mocked<any>;
  let axiomService: jest.Mocked<AxiomService>;

  const mockAuditLog: AuditLog = {
    id: 'log-uuid-123',
    userId: 1,
    username: 'testuser',
    action: 'CREATE',
    entityType: 'Project',
    entityId: 'PRJ_001',
    changes: { name: 'New Project' },
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    method: 'POST',
    endpoint: '/projects',
    statusCode: 201,
    errorMessage: null,
    metadata: {},
    createdAt: new Date(),
  } as AuditLog;

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            createQueryBuilder: jest.fn(() => {
              const qb = {
                delete: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue({ affected: 0 }),
              };
              return qb;
            }),
          },
        },
        {
          provide: AxiomService,
          useValue: {
            sendLog: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    auditService = testModule.get<AuditService>(AuditService);
    auditLogRepository = testModule.get(getRepositoryToken(AuditLog));
    axiomService = testModule.get<AxiomService>(AxiomService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Log Creation', () => {
    it('should create audit log', async () => {
      const logData: Partial<AuditLog> = {
        userId: 1,
        action: 'CREATE',
        entityType: 'Project',
        entityId: 'PRJ_001',
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog);

      const result = await auditService.log(logData);

      expect(result).toHaveProperty('action', 'CREATE');
      expect(auditLogRepository.create).toHaveBeenCalled();
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should send log to Axiom asynchronously', async () => {
      const logData: Partial<AuditLog> = {
        userId: 1,
        action: 'UPDATE',
        entityType: 'Project',
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog);

      await auditService.log(logData);

      // Axiom send should be called (but we don't wait for it)
      expect(axiomService.sendLog).toHaveBeenCalled();
    });
  });

  describe('Log Filtering and Search', () => {
    it('should find all logs with pagination', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      const result = await auditService.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(auditLogRepository.findAndCount).toHaveBeenCalled();
    });

    it('should filter logs by userId', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      const result = await auditService.findAll({ userId: 1, page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1 },
        }),
      );
    });

    it('should filter logs by entityType', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      const result = await auditService.findAll({ entityType: 'Project', page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: 'Project' },
        }),
      );
    });

    it('should filter logs by action', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      const result = await auditService.findAll({ action: 'CREATE', page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { action: 'CREATE' },
        }),
      );
    });

    it('should filter logs by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      const result = await auditService.findAll({
        startDate,
        endDate,
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(auditLogRepository.findAndCount).toHaveBeenCalled();
    });

    it('should find logs by user', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      const result = await auditService.findByUser(1, 1, 20);

      expect(result.data).toHaveLength(1);
      expect(auditLogRepository.findAndCount).toHaveBeenCalled();
    });

    it('should find logs by entity', async () => {
      auditLogRepository.findAndCount.mockResolvedValue([[mockAuditLog], 1]);

      const result = await auditService.findByEntity('Project', 'PRJ_001', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(auditLogRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: 'Project', entityId: 'PRJ_001' },
        }),
      );
    });
  });

  describe('Statistics', () => {
    it('should generate audit statistics', async () => {
      const logs: AuditLog[] = [
        { ...mockAuditLog, action: 'CREATE', entityType: 'Project' },
        { ...mockAuditLog, action: 'UPDATE', entityType: 'Project' },
        { ...mockAuditLog, action: 'CREATE', entityType: 'Shot' },
      ];

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      auditLogRepository.find.mockResolvedValue(logs);

      const result = await auditService.getStatistics(startDate, endDate);

      expect(result.total).toBe(3);
      expect(result.byAction.CREATE).toBe(2);
      expect(result.byAction.UPDATE).toBe(1);
      expect(result.byEntityType.Project).toBe(2);
      expect(result.byEntityType.Shot).toBe(1);
      expect(result.byUser['1']).toBe(3);
    });

    it('should handle empty statistics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      auditLogRepository.find.mockResolvedValue([]);

      const result = await auditService.getStatistics(startDate, endDate);

      expect(result.total).toBe(0);
      expect(Object.keys(result.byAction)).toHaveLength(0);
      expect(Object.keys(result.byEntityType)).toHaveLength(0);
      expect(Object.keys(result.byUser)).toHaveLength(0);
    });
  });

  describe('Log Cleanup', () => {
    it('should delete old logs', async () => {
      const mockExecute = jest.fn().mockResolvedValue({ affected: 10 });
      const queryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: mockExecute,
      };
      auditLogRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const result = await auditService.deleteOldLogs(30);

      expect(result).toBe(10);
      expect(queryBuilder.delete).toHaveBeenCalled();
      expect(queryBuilder.where).toHaveBeenCalled();
      expect(queryBuilder.execute).toHaveBeenCalled();
    });

    it('should return 0 when no old logs to delete', async () => {
      const queryBuilder = auditLogRepository.createQueryBuilder();
      queryBuilder.execute = jest.fn().mockResolvedValue({ affected: 0 });

      const result = await auditService.deleteOldLogs(30);

      expect(result).toBe(0);
    });
  });
});

