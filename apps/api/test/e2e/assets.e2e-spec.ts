import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import {
  createAdminUser,
  createProject,
  createAsset,
  createTestAssetData,
  expectSuccessResponse,
  expectValidationError,
  expectNotFoundError,
  createMockFile,
  setupTestApp,
} from '../helpers/test-utils';

describe('Assets E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let projectId: number;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /assets', () => {
    it('should create asset with valid data', async () => {
      const assetData = createTestAssetData(projectId);

      const response = await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(assetData)
        .expect(201);

      expectSuccessResponse(response, 201);
      expect(response.body.data.code).toBe(assetData.code);
      expect(response.body.data.assetType).toBe(assetData.assetType);
      expect(response.body.data.id).toBeDefined();
      expect(typeof response.body.data.id).toBe('number');
      expect(response.body.data.projectId).toBe(projectId);
    });

    it('should support all asset types', async () => {
      const types = ['character', 'subtitles', 'imagen', 'audio', 'script', 'text', 'video'];

      for (const assetType of types) {
        const assetData = createTestAssetData(projectId, { assetType });

        const response = await request(app.getHttpServer())
          .post('/assets')
          .set('Authorization', `Bearer ${authToken}`)
          .send(assetData)
          .expect(201);

        expect(response.body.data.assetType).toBe(assetType);
      }
    });

    it('should fail with invalid asset type', async () => {
      const assetData = createTestAssetData(projectId, {
        assetType: 'invalid-type',
      });

      const response = await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(assetData);

      expectValidationError(response, 'assetType');
    });
  });

  describe('GET /assets', () => {
    it('should get all assets', async () => {
      const response = await request(app.getHttpServer())
        .get('/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by projectId', async () => {
      const response = await request(app.getHttpServer())
        .get('/assets')
        .query({ projectId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach((asset: any) => {
        expect(asset.projectId).toBe(projectId);
      });
    });

    it('should filter by assetType', async () => {
      const response = await request(app.getHttpServer())
        .get('/assets')
        .query({ assetType: 'character' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach((asset: any) => {
        expect(asset.assetType).toBe('character');
      });
    });
  });

  describe('GET /assets/:id', () => {
    it('should get asset by id', async () => {
      const asset = await createAsset(app, authToken, projectId);

      const response = await request(app.getHttpServer())
        .get(`/assets/${asset.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(asset.id);
      expect(response.body.data.code).toBeDefined();
    });

    it('should return 404 for non-existent asset', async () => {
      const response = await request(app.getHttpServer())
        .get('/assets/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expectNotFoundError(response);
    });

    it('should return 400 for invalid ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/assets/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('PATCH /assets/:id', () => {
    it('should update asset', async () => {
      const asset = await createAsset(app, authToken, projectId);

      const response = await request(app.getHttpServer())
        .patch(`/assets/${asset.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Asset' })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Asset');
    });

    it('should update asset type', async () => {
      const asset = await createAsset(app, authToken, projectId);

      const response = await request(app.getHttpServer())
        .patch(`/assets/${asset.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ assetType: 'script' })
        .expect(200);

      expect(response.body.data.assetType).toBe('script');
    });
  });

  describe('DELETE /assets/:id', () => {
    it('should delete asset', async () => {
      const asset = await createAsset(app, authToken, projectId);

      await request(app.getHttpServer())
        .delete(`/assets/${asset.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const getResponse = await request(app.getHttpServer())
        .get(`/assets/${asset.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expectNotFoundError(getResponse);
    });
  });

  describe('POST /assets/:id/thumbnail', () => {
    it('should upload thumbnail', async () => {
      const asset = await createAsset(app, authToken, projectId);
      const mockFile = createMockFile('thumbnail.jpg', 'image/jpeg', 2048);

      const response = await request(app.getHttpServer())
        .post(`/assets/${asset.id}/thumbnail`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', mockFile, 'thumbnail.jpg')
        .expect(200);

      expectSuccessResponse(response);
    });
  });
});
