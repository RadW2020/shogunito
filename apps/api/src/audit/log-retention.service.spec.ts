import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { LogRetentionService } from './log-retention.service';
import { AuditLog } from '../entities/audit-log.entity';
import { AxiomService } from './axiom.service';
import { LessThan, In } from 'typeorm';

describe('LogRetentionService', () => {
  let service: LogRetentionService;
  let auditLogRepository: any;
  let axiomService: any;
  let configService: jest.Mocked<ConfigService>;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogRetentionService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            delete: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: AxiomService,
          useValue: {
            sendLogs: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                LOG_RETENTION_ENABLED: true,
                LOG_RETENTION_AUTH_DAYS: 90,
                LOG_RETENTION_ERROR_DAYS: 180,
                LOG_RETENTION_CRUD_DAYS: 30,
                LOG_RETENTION_DEFAULT_DAYS: 60,
                LOG_RETENTION_BATCH_SIZE: 1000,
                LOG_RETENTION_ARCHIVE_TO_AXIOM: true,
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LogRetentionService>(LogRetentionService);
    auditLogRepository = module.get(getRepositoryToken(AuditLog));
    axiomService = module.get(AxiomService);
    configService = module.get(ConfigService);

    // Mock delay to avoid actual timeouts in tests
    jest.spyOn(service as any, 'delay').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runCleanup', () => {
    it('should run cleanup for all log types', async () => {
      mockQueryBuilder.getMany
        .mockResolvedValueOnce([{ id: 'log-1' }]) // Auth logs
        .mockResolvedValueOnce([]) // No more auth logs
        .mockResolvedValueOnce([{ id: 'log-2' }]) // Error logs
        .mockResolvedValueOnce([]) // No more error logs
        .mockResolvedValueOnce([{ id: 'log-3' }]) // CRUD logs
        .mockResolvedValueOnce([]) // No more CRUD logs
        .mockResolvedValueOnce([{ id: 'log-4' }]) // Other logs
        .mockResolvedValueOnce([]); // No more other logs

      auditLogRepository.delete.mockResolvedValue({ affected: 1 });
      axiomService.sendLogs.mockResolvedValue(undefined);

      const result = await service.runCleanup();

      expect(result).toHaveProperty('auth');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('crud');
      expect(result).toHaveProperty('other');
      expect(result).toHaveProperty('total');
      expect(result.total).toBeGreaterThan(0);
    });

    it('should skip cleanup when disabled', async () => {
      configService.get.mockReturnValue(false);
      const newService = new LogRetentionService(auditLogRepository, axiomService, configService);

      const result = await newService.runCleanup();

      expect(result).toEqual({
        auth: 0,
        error: 0,
        crud: 0,
        other: 0,
        total: 0,
      });
    });

    it('should handle errors during cleanup', async () => {
      mockQueryBuilder.getMany.mockRejectedValue(new Error('Database error'));

      await expect(service.runCleanup()).rejects.toThrow('Database error');
    });
  });

  describe('getRetentionStats', () => {
    it('should return retention statistics', async () => {
      auditLogRepository.count
        .mockResolvedValueOnce(5) // Auth count
        .mockResolvedValueOnce(3) // CRUD count
        .mockResolvedValueOnce(100); // Total count

      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.andWhere.mockReturnThis();
      mockQueryBuilder.getCount = jest.fn().mockResolvedValue(2); // Error count

      const result = await service.getRetentionStats();

      expect(result).toHaveProperty('enabled', true);
      expect(result).toHaveProperty('retentionPolicies');
      expect(result.retentionPolicies).toHaveProperty('auth');
      expect(result.retentionPolicies).toHaveProperty('error');
      expect(result.retentionPolicies).toHaveProperty('crud');
      expect(result.retentionPolicies).toHaveProperty('default');
      expect(result).toHaveProperty('totalLogs', 100);
      expect(result).toHaveProperty('archiveToAxiom', true);
    });
  });

  describe('onModuleDestroy', () => {
    it('should cleanup interval on destroy', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const mockInterval = setInterval(() => {}, 1000) as any;
      (service as any).cleanupInterval = mockInterval;

      service.onModuleDestroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
      clearInterval(mockInterval);
    });
  });

  describe('private methods via runCleanup', () => {
    it('should archive logs to Axiom before deletion when enabled', async () => {
      const mockLogs = [{ id: 'log-1' }, { id: 'log-2' }];
      mockQueryBuilder.getMany.mockResolvedValueOnce(mockLogs).mockResolvedValueOnce([]);

      auditLogRepository.delete.mockResolvedValue({ affected: 2 });
      axiomService.sendLogs.mockResolvedValue(undefined);

      await service.runCleanup();

      expect(axiomService.sendLogs).toHaveBeenCalledWith(mockLogs);
    });

    it('should continue deletion even if archiving fails', async () => {
      const mockLogs = [{ id: 'log-1' }];
      mockQueryBuilder.getMany.mockResolvedValueOnce(mockLogs).mockResolvedValueOnce([]);

      auditLogRepository.delete.mockResolvedValue({ affected: 1 });
      axiomService.sendLogs.mockRejectedValue(new Error('Axiom error'));

      const result = await service.runCleanup();

      expect(auditLogRepository.delete).toHaveBeenCalled();
      expect(result.total).toBeGreaterThan(0);
    });

    it('should delete logs in batches', async () => {
      const batch1 = Array.from({ length: 1000 }, (_, i) => ({
        id: `log-${i}`,
      }));
      const batch2 = [{ id: 'log-1000' }];

      mockQueryBuilder.getMany
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2)
        .mockResolvedValueOnce([]);

      auditLogRepository.delete.mockResolvedValue({ affected: 1 });
      axiomService.sendLogs.mockResolvedValue(undefined);

      await service.runCleanup();

      expect(auditLogRepository.delete).toHaveBeenCalledTimes(2);
    });
  });
});
