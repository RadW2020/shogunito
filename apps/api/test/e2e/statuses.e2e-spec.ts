import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import {
  createAdminUser,
  createTestStatusData,
  expectSuccessResponse,
  expectValidationError,
  expectNotFoundError,
  setupTestApp,
} from '../helpers/test-utils';

describe('Statuses E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupTestApp(app);
    await app.init();

    // Create admin user with all permissions for testing
    const { token } = await createAdminUser(app);
    authToken = token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /statuses', () => {
    it('should create status with valid data', async () => {
      const statusData = createTestStatusData();

      const response = await request(app.getHttpServer())
        .post('/statuses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusData)
        .expect(201);

      expectSuccessResponse(response, 201);
      expect(response.body.data.name).toBe(statusData.name);
      expect(response.body.data.code).toBe(statusData.code);
      expect(response.body.data.color).toBe(statusData.color);
      expect(response.body.data.applicableEntities).toEqual(
        expect.arrayContaining(statusData.applicableEntities),
      );
    });

    it('should support all applicable entity types', async () => {
      const applicableTargets = ['shot', 'asset', 'sequence', 'episode', 'project'];

      for (const entity of applicableTargets) {
        const statusData = createTestStatusData({
          applicableEntities: [entity],
        });

        try {
          const response = await request(app.getHttpServer())
            .post('/statuses')
            .set('Authorization', `Bearer ${authToken}`)
            .send(statusData)
            .expect(201);

          expect(response.body.data.applicableEntities).toContain(entity);
        } catch (error: any) {
          // Handle connection errors gracefully - retry once
          if (
            error.message &&
            (error.message.includes('socket hang up') || error.message.includes('ECONNRESET'))
          ) {
            // Wait a bit and retry
            await new Promise((resolve) => setTimeout(resolve, 500));
            const response = await request(app.getHttpServer())
              .post('/statuses')
              .set('Authorization', `Bearer ${authToken}`)
              .send(statusData)
              .expect(201);
            expect(response.body.data.applicableEntities).toContain(entity);
          } else {
            throw error;
          }
        }
      }
    });

    it('should fail without name', async () => {
      const statusData = createTestStatusData();
      const { name: _, ...statusDataWithoutName } = statusData;

      const response = await request(app.getHttpServer())
        .post('/statuses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusDataWithoutName);

      expectValidationError(response, 'name');
    });

    it('should fail without code', async () => {
      const statusData = createTestStatusData();
      const { code: _, ...statusDataWithoutCode } = statusData;

      const response = await request(app.getHttpServer())
        .post('/statuses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusDataWithoutCode);

      expectValidationError(response, 'code');
    });

    it('should fail without color', async () => {
      const statusData = createTestStatusData();
      const { color: _, ...statusDataWithoutColor } = statusData;

      const response = await request(app.getHttpServer())
        .post('/statuses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusDataWithoutColor);

      expectValidationError(response, 'color');
    });

    it('should fail with invalid color format', async () => {
      const statusData = createTestStatusData({ color: 'invalid' });

      const response = await request(app.getHttpServer())
        .post('/statuses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusData);

      expectValidationError(response, 'color');
    });
  });

  describe('GET /statuses', () => {
    it('should get all statuses', async () => {
      const response = await request(app.getHttpServer())
        .get('/statuses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/statuses')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expectSuccessResponse(response);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBeDefined();
      expect(response.body.pagination.limit).toBeDefined();
      expect(response.body.pagination.total).toBeDefined();
      expect(response.body.pagination.totalPages).toBeDefined();
    });

    it('should filter by applicable entity', async () => {
      const response = await request(app.getHttpServer())
        .get('/statuses')
        .query({ applicableEntities: 'shot' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach((status: any) => {
        expect(status.applicableEntities).toContain('shot');
      });
    });

    it('should filter by isActive', async () => {
      const response = await request(app.getHttpServer())
        .get('/statuses')
        .query({ isActive: true })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach((status: any) => {
        expect(status.isActive).toBe(true);
      });
    });
  });

  describe('GET /statuses/:id', () => {
    let statusId: string;

    beforeAll(async () => {
      const statusData = createTestStatusData();
      const response = await request(app.getHttpServer())
        .post('/statuses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusData)
        .expect(201);

      statusId = response.body.data.id;
    });

    it('should get status by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/statuses/${statusId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(statusId);
    });

    it('should return 404 for non-existent status', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .get(`/statuses/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expectNotFoundError(response);
    });
  });

  describe('PATCH /statuses/:id', () => {
    it('should update status', async () => {
      const statusData = createTestStatusData();
      const createResponse = await request(app.getHttpServer())
        .post('/statuses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusData)
        .expect(201);

      const statusId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .patch(`/statuses/${statusId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Status' })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Status');
    });

    it('should update status color', async () => {
      const statusData = createTestStatusData();
      const createResponse = await request(app.getHttpServer())
        .post('/statuses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusData)
        .expect(201);

      const statusId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .patch(`/statuses/${statusId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ color: '#00FF00' })
        .expect(200);

      expect(response.body.data.color).toBe('#00FF00');
    });

    it('should toggle isActive', async () => {
      const statusData = createTestStatusData();
      const createResponse = await request(app.getHttpServer())
        .post('/statuses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusData)
        .expect(201);

      const statusId = createResponse.body.data.id;

      const toggle = async () =>
        request(app.getHttpServer())
          .patch(`/statuses/${statusId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isActive: false })
          .expect(200);

      try {
        const response = await toggle();
        expect(response.body.data.isActive).toBe(false);
      } catch (error: any) {
        // Retry once on transient transport/parse errors
        if (error.message && error.message.includes('Parse Error')) {
          const response = await toggle();
          expect(response.body.data.isActive).toBe(false);
        } else {
          throw error;
        }
      }
    });
  });

  describe('DELETE /statuses/:id', () => {
    it('should delete status', async () => {
      const statusData = createTestStatusData();
      const createResponse = await request(app.getHttpServer())
        .post('/statuses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusData)
        .expect(201);

      const statusId = createResponse.body.data.id;

      await request(app.getHttpServer())
        .delete(`/statuses/${statusId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const getResponse = await request(app.getHttpServer())
        .get(`/statuses/${statusId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expectNotFoundError(getResponse);
    });
  });
});
