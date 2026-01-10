import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import {
  createAdminUser,
  createProject,
  createEpisode,
  createSequence,
  createShot,
  createTestShotData,
  expectSuccessResponse,
  expectValidationError,
  expectNotFoundError,
  setupTestApp,
} from '../helpers/test-utils';

describe('Shots E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let projectId: number;
  let sequenceId: number;

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

    const project = await createProject(app, authToken);
    projectId = project.id!;

    const episode = await createEpisode(app, authToken, projectId);
    const sequence = await createSequence(app, authToken, projectId, episode.id);
    sequenceId = sequence.id!;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /shots', () => {
    it('should create shot with valid data', async () => {
      const shotData = createTestShotData(sequenceId);

      const response = await request(app.getHttpServer())
        .post('/shots')
        .set('Authorization', `Bearer ${authToken}`)
        .send(shotData)
        .expect(201);

      expectSuccessResponse(response, 201);
      expect(response.body.data.code).toBe(shotData.code);
      expect(response.body.data.id).toBeDefined();
      expect(typeof response.body.data.id).toBe('number');
      expect(response.body.data.sequenceId).toBe(sequenceId);
    });

    it('should fail without sequenceNumber', async () => {
      const shotData = createTestShotData(sequenceId);
      const { sequenceNumber: _, ...shotDataWithoutSequenceNumber } = shotData;

      const response = await request(app.getHttpServer())
        .post('/shots')
        .set('Authorization', `Bearer ${authToken}`)
        .send(shotDataWithoutSequenceNumber);

      expectValidationError(response, 'sequenceNumber');
    });

    it('should fail with invalid sequenceNumber', async () => {
      const shotData = createTestShotData(sequenceId, {
        sequenceNumber: 0,
      });

      const response = await request(app.getHttpServer())
        .post('/shots')
        .set('Authorization', `Bearer ${authToken}`)
        .send(shotData);

      expectValidationError(response);
    });
  });

  describe('GET /shots', () => {
    it('should get all shots', async () => {
      const response = await request(app.getHttpServer())
        .get('/shots')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by sequenceNumber', async () => {
      const response = await request(app.getHttpServer())
        .get('/shots')
        .query({ sequenceNumber: 1 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach((shot: any) => {
        expect(shot.sequenceNumber).toBe(1);
      });
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/shots')
        .query({ status: 'waiting' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /shots/:id', () => {
    it('should get shot by ID', async () => {
      const shot = await createShot(app, authToken, projectId, sequenceId);

      const response = await request(app.getHttpServer())
        .get(`/shots/${shot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(shot.id);
      expect(response.body.data.code).toBeDefined();
    });

    it('should return 404 for non-existent shot', async () => {
      const response = await request(app.getHttpServer())
        .get('/shots/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expectNotFoundError(response);
    });

    it('should return 400 for invalid ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/shots/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('PATCH /shots/:id', () => {
    it('should update shot', async () => {
      const shot = await createShot(app, authToken, projectId, sequenceId);

      const response = await request(app.getHttpServer())
        .patch(`/shots/${shot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Shot Name' })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Shot Name');
    });

    it('should update sequenceNumber', async () => {
      const shot = await createShot(app, authToken, projectId, sequenceId);

      const response = await request(app.getHttpServer())
        .patch(`/shots/${shot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sequenceNumber: 5 })
        .expect(200);

      expect(response.body.data.sequenceNumber).toBe(5);
    });
  });

  describe('DELETE /shots/:id', () => {
    it('should delete shot', async () => {
      const shot = await createShot(app, authToken, projectId, sequenceId);

      await request(app.getHttpServer())
        .delete(`/shots/${shot.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const getResponse = await request(app.getHttpServer())
        .get(`/shots/${shot.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expectNotFoundError(getResponse);
    });
  });
});
