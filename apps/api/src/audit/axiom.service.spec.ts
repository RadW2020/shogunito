import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AxiomService } from './axiom.service';
import { AuditLog } from '../entities/audit-log.entity';

describe('AxiomService', () => {
  let service: AxiomService;
  let configService: jest.Mocked<ConfigService>;
  let mockFetch: jest.Mock;

  const mockAuditLog: AuditLog = {
    id: 'log-123',
    userId: 'user-123',
    username: 'test@example.com',
    action: 'CREATE',
    entityType: 'Project',
    entityId: 'project-123',
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
    // Mock fetch before each test to ensure it's always mocked
    // This must be done BEFORE creating the service
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Default mock implementation that rejects to catch any unmocked calls
    mockFetch.mockRejectedValue(new Error('fetch was called without being mocked in this test'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AxiomService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                AXIOM_ENABLED: true,
                AXIOM_API_TOKEN: 'test-token',
                AXIOM_DATASET: 'test-dataset',
                AXIOM_ORG_ID: 'test-org-id',
                NODE_ENV: 'test',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AxiomService>(AxiomService);
    configService = module.get(ConfigService);

    // Reset mock call history but keep the mock implementation
    // Don't use clearAllMocks as it might interfere with the fetch mock
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.stopAutoFlush();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendLog', () => {
    it('should queue a log when configured', async () => {
      const queueSizeBefore = service.getQueueSize();
      await service.sendLog(mockAuditLog);
      const queueSizeAfter = service.getQueueSize();

      expect(queueSizeAfter).toBe(queueSizeBefore + 1);
    });

    it('should not queue when not configured', async () => {
      configService.get.mockReturnValue(false);
      const newService = new AxiomService(configService);

      await newService.sendLog(mockAuditLog);

      expect(newService.getQueueSize()).toBe(0);
    });

    it('should flush immediately when queue reaches batch size', async () => {
      const flushSpy = jest.spyOn(service, 'flush').mockResolvedValue(undefined);

      // Fill queue to batch size
      for (let i = 0; i < 100; i++) {
        await service.sendLog(mockAuditLog);
      }

      expect(flushSpy).toHaveBeenCalled();
      flushSpy.mockRestore();
    });
  });

  describe('sendLogs', () => {
    it('should queue multiple logs', async () => {
      const logs = [mockAuditLog, mockAuditLog, mockAuditLog];
      const queueSizeBefore = service.getQueueSize();

      await service.sendLogs(logs);

      expect(service.getQueueSize()).toBe(queueSizeBefore + logs.length);
    });
  });

  describe('flush', () => {
    it('should send logs to Axiom successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ingested: 1,
          failed: 0,
          processedBytes: 100,
          blocksCreated: 1,
          walLength: 1,
          timestamp: new Date().toISOString(),
          error: '',
        }),
      });

      await service.sendLog(mockAuditLog);
      await service.flush();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-dataset/ingest'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
            'X-Axiom-Org-Id': 'test-org-id',
          }),
        }),
      );
    });

    it('should not flush when queue is empty', async () => {
      mockFetch.mockClear();

      await service.flush();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API errors and re-queue logs', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Error message',
      });

      await service.sendLog(mockAuditLog);
      const queueSizeBefore = service.getQueueSize();

      await service.flush();

      // Logs should be re-queued
      expect(service.getQueueSize()).toBeGreaterThanOrEqual(queueSizeBefore);
    });
  });

  describe('transformLogForAxiom', () => {
    it('should transform log to Axiom format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ingested: 1,
          failed: 0,
        }),
      });

      await service.sendLog(mockAuditLog);
      await service.flush();

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const transformedLog = body[0];

      expect(transformedLog).toHaveProperty('_time');
      expect(transformedLog).toHaveProperty('id', 'log-123');
      expect(transformedLog).toHaveProperty('user_id', 'user-123');
      expect(transformedLog).toHaveProperty('username', 'test@example.com');
      expect(transformedLog).toHaveProperty('action', 'CREATE');
      expect(transformedLog).toHaveProperty('entity_type', 'Project');
      expect(transformedLog).toHaveProperty('entity_id', 'project-123');
      expect(transformedLog).toHaveProperty('environment', 'test');
      expect(transformedLog).toHaveProperty('service', 'shogun-api');
    });
  });

  describe('getStatus', () => {
    it('should return status information', () => {
      const status = service.getStatus();

      expect(status).toHaveProperty('enabled', true);
      expect(status).toHaveProperty('configured', true);
      expect(status).toHaveProperty('queueSize');
    });
  });

  describe('getQueueSize', () => {
    it('should return current queue size', async () => {
      const initialSize = service.getQueueSize();
      await service.sendLog(mockAuditLog);

      expect(service.getQueueSize()).toBe(initialSize + 1);
    });
  });

  describe('onModuleDestroy', () => {
    it('should flush remaining logs on destroy', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ingested: 1,
          failed: 0,
        }),
      });

      await service.sendLog(mockAuditLog);
      await service.onModuleDestroy();

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should disable when AXIOM_ENABLED is false', () => {
      configService.get.mockReturnValue(false);
      const newService = new AxiomService(configService);

      const status = newService.getStatus();
      expect(status.enabled).toBe(false);
    });

    it('should disable when API token is missing', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'AXIOM_ENABLED') return true;
        if (key === 'AXIOM_API_TOKEN') return '';
        if (key === 'AXIOM_ORG_ID') return 'test-org-id';
        return undefined;
      });
      const newService = new AxiomService(configService);

      const status = newService.getStatus();
      expect(status.configured).toBe(false);
    });

    it('should disable when org ID is missing', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'AXIOM_ENABLED') return true;
        if (key === 'AXIOM_API_TOKEN') return 'test-token';
        if (key === 'AXIOM_ORG_ID') return '';
        return undefined;
      });
      const newService = new AxiomService(configService);

      const status = newService.getStatus();
      expect(status.configured).toBe(false);
    });
  });
});
