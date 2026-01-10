import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { setupTestApp } from './helpers/test-utils';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupTestApp(app);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Root endpoints', () => {
    it('GET / should return Hello World', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      // The response is wrapped in ApiResponse format by TransformResponseInterceptor
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data', 'API is running');
    });

    it('GET /health should return health status', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await request(app.getHttpServer()).get('/non-existent-route').expect(404);

      expect(response.body).toBeDefined();
    });
  });
});
