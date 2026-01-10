import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import { MinioService } from './files/minio.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'JWT_SECRET') return 'test-secret';
              if (key === 'AUTH_ENABLED') return 'true';
              return defaultValue;
            }),
          },
        },
        {
          provide: MinioService,
          useValue: {
            updateAllFilesCacheHeaders: jest.fn().mockResolvedValue({
              total: 0,
              updated: 0,
              failed: 0,
            }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "API is running"', () => {
      expect(appController.getHello()).toBe('API is running');
    });
  });
});
