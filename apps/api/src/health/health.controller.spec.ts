import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let db: TypeOrmHealthIndicator;
  let memory: MemoryHealthIndicator;
  let disk: DiskHealthIndicator;

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  const mockDb = {
    pingCheck: jest.fn(),
  };

  const mockMemory = {
    checkHeap: jest.fn(),
    checkRSS: jest.fn(),
  };

  const mockDisk = {
    checkStorage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: HttpHealthIndicator,
          useValue: {},
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: mockDb,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemory,
        },
        {
          provide: DiskHealthIndicator,
          useValue: mockDisk,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    db = module.get<TypeOrmHealthIndicator>(TypeOrmHealthIndicator);
    memory = module.get<MemoryHealthIndicator>(MemoryHealthIndicator);
    disk = module.get<DiskHealthIndicator>(DiskHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health status', async () => {
      const healthResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          storage: { status: 'up' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(healthResult);

      const result = await controller.check();

      expect(healthCheckService.check).toHaveBeenCalled();
      expect(result).toEqual(healthResult);
    });

    it('should check database, memory, and disk', async () => {
      mockHealthCheckService.check.mockResolvedValue({ status: 'ok' });

      await controller.check();

      expect(healthCheckService.check).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(Function),
          expect.any(Function),
          expect.any(Function),
          expect.any(Function),
        ]),
      );
    });
  });

  describe('checkDatabase', () => {
    it('should return database health status', async () => {
      const healthResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(healthResult);

      const result = await controller.checkDatabase();

      expect(healthCheckService.check).toHaveBeenCalled();
      expect(result).toEqual(healthResult);
    });
  });

  describe('checkReadiness', () => {
    it('should return readiness status', async () => {
      const healthResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(healthResult);

      const result = await controller.checkReadiness();

      expect(healthCheckService.check).toHaveBeenCalled();
      expect(result).toEqual(healthResult);
    });
  });

  describe('checkLiveness', () => {
    it('should return liveness status', async () => {
      const healthResult = {
        status: 'ok',
        info: {
          memory_rss: { status: 'up' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(healthResult);

      const result = await controller.checkLiveness();

      expect(healthCheckService.check).toHaveBeenCalled();
      expect(result).toEqual(healthResult);
    });
  });
});
