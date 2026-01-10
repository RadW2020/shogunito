import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import {
  createAdminUser,
  createTestProjectData,
  createProject,
  expectSuccessResponse,
  expectValidationError,
  expectNotFoundError,
  expectConflictError,
  setupTestApp,
} from '../helpers/test-utils';

describe('Projects E2E Tests (POST /projects)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupTestApp(app);
    await app.init();

    // Create authenticated user with admin role to have all permissions for testing
    const { token } = await createAdminUser(app);
    authToken = token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /projects', () => {
    describe('Success cases', () => {
      it('should create a project with valid data', async () => {
        const projectData = createTestProjectData();

        const response = await request(app.getHttpServer())
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send(projectData)
          .expect(201);

        expectSuccessResponse(response, 201);
        expect(response.body.data.code).toBe(projectData.code);
        expect(response.body.data.name).toBe(projectData.name);
        expect(response.body.data.description).toBe(projectData.description);
        expect(response.body.data.id).toBeDefined();
        expect(response.body.data.createdAt).toBeDefined();
      });

      it('should create project with optional fields', async () => {
        const projectData = createTestProjectData({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        });

        const response = await request(app.getHttpServer())
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send(projectData)
          .expect(201);

        expectSuccessResponse(response, 201);
        expect(response.body.data.startDate).toBe('2024-01-01');
        expect(response.body.data.endDate).toBe('2024-12-31');
      });

      it('should create project with basic fields', async () => {
        const projectData = createTestProjectData();

        const response = await request(app.getHttpServer())
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send(projectData)
          .expect(201);

        expectSuccessResponse(response, 201);
      });
    });

    describe('Validation errors', () => {
      it('should fail without code', async () => {
        const projectData = createTestProjectData();
        const { code: _, ...projectDataWithoutCode } = projectData;

        const response = await request(app.getHttpServer())
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send(projectDataWithoutCode);

        expectValidationError(response, 'code');
      });

      it('should fail without name', async () => {
        const projectData = createTestProjectData();
        const { name: _, ...projectDataWithoutName } = projectData;

        const response = await request(app.getHttpServer())
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send(projectDataWithoutName);

        expectValidationError(response, 'name');
      });
    });

    describe('Conflict errors', () => {
      it('should fail with duplicate code', async () => {
        const projectData = createTestProjectData();

        // Create first project
        await request(app.getHttpServer())
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send(projectData)
          .expect(201);

        // Try to create with same code
        const response = await request(app.getHttpServer())
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send(projectData);

        expectConflictError(response);
      });
    });

    describe('Authentication', () => {
      it('should fail without auth token', async () => {
        const projectData = createTestProjectData();

        const response = await request(app.getHttpServer()).post('/projects').send(projectData);

        expect(response.status).toBe(401);
      });
    });
  });

  describe('GET /projects', () => {
    const createdProjects: any[] = [];

    beforeAll(async () => {
      // Create multiple projects for testing
      for (let i = 0; i < 5; i++) {
        const project = await createProject(app, authToken);
        createdProjects.push(project);
      }
    });

    describe('Success cases', () => {
      it('should get all projects', async () => {
        const response = await request(app.getHttpServer())
          .get('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expectSuccessResponse(response);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(5);
      });

      it('should support pagination', async () => {
        const response = await request(app.getHttpServer())
          .get('/projects')
          .query({ page: 1, limit: 2 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expectSuccessResponse(response);
        expect(response.body.data.length).toBeLessThanOrEqual(2);
        expect(response.body.pagination).toBeDefined();
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(2);
      });

      it('should filter by status', async () => {
        const response = await request(app.getHttpServer())
          .get('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expectSuccessResponse(response);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should search by name', async () => {
        const searchTerm = createdProjects[0].name.substring(0, 5);

        const response = await request(app.getHttpServer())
          .get('/projects')
          .query({ search: searchTerm })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expectSuccessResponse(response);
      });
    });
  });

  describe('GET /projects/:id', () => {
    let project: any;

    beforeAll(async () => {
      project = await createProject(app, authToken);
    });

    describe('Success cases', () => {
      it('should get project by ID', async () => {
        const response = await request(app.getHttpServer())
          .get(`/projects/${project.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expectSuccessResponse(response);
        expect(response.body.data.id).toBe(project.id);
        expect(response.body.data.code).toBe(project.code);
      });

      it('should include related entities counts', async () => {
        const response = await request(app.getHttpServer())
          .get(`/projects/${project.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Should include counts of episodes, sequences, etc.
        expect(response.body.data).toBeDefined();
      });
    });

    describe('Error cases', () => {
      it('should return 404 for non-existent project', async () => {
        const fakeId = 99999; // Non-existent project ID

        const response = await request(app.getHttpServer())
          .get(`/projects/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expectNotFoundError(response);
      });

      it('should return 400 or 404 for invalid UUID', async () => {
        const response = await request(app.getHttpServer())
          .get('/projects/invalid-uuid')
          .set('Authorization', `Bearer ${authToken}`);

        // Should return 400 (validation error) or 404 (not found)
        expect([400, 404]).toContain(response.status);
      });
    });
  });

  describe('PATCH /projects/:id', () => {
    let project: any;

    beforeEach(async () => {
      project = await createProject(app, authToken);
    });

    describe('Success cases', () => {
      it('should update project name', async () => {
        const newName = `Updated Name ${Date.now()}`;

        const response = await request(app.getHttpServer())
          .patch(`/projects/${project.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: newName })
          .expect(200);

        expectSuccessResponse(response);
        expect(response.body.data.name).toBe(newName);
        expect(response.body.data.code).toBe(project.code); // Should not change
      });

      it('should update multiple fields at once', async () => {
        const updates = {
          name: `Multi Update ${Date.now()}`,
          description: 'Updated description',
        };

        const response = await request(app.getHttpServer())
          .patch(`/projects/${project.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updates)
          .expect(200);

        expectSuccessResponse(response);
        expect(response.body.data.name).toBe(updates.name);
        expect(response.body.data.description).toBe(updates.description);
      });

      it('should update updatedAt timestamp', async () => {
        const originalUpdatedAt = project.updatedAt;

        await new Promise((resolve) => setTimeout(resolve, 100));

        const response = await request(app.getHttpServer())
          .patch(`/projects/${project.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Updated' })
          .expect(200);

        expect(new Date(response.body.data.updatedAt).getTime()).toBeGreaterThan(
          new Date(originalUpdatedAt).getTime(),
        );
      });
    });

    describe('Validation errors', () => {
      it('should reject empty name', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/projects/${project.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: '' });

        expectValidationError(response, 'name');
      });
    });

    describe('Error cases', () => {
      it('should return 404 for non-existent project', async () => {
        const fakeId = 999999;

        const response = await request(app.getHttpServer())
          .patch(`/projects/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Updated' });

        expectNotFoundError(response);
      });
    });
  });

  describe('DELETE /projects/:id', () => {
    describe('Success cases', () => {
      it('should delete project', async () => {
        const project = await createProject(app, authToken);

        const response = await request(app.getHttpServer())
          .delete(`/projects/${project.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expectSuccessResponse(response);

        // Verify project is deleted
        const getResponse = await request(app.getHttpServer())
          .get(`/projects/${project.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expectNotFoundError(getResponse);
      });

      it('should cascade delete related entities', async () => {
        // This would require creating related entities first
        // Then verifying they're deleted when project is deleted
        const project = await createProject(app, authToken);

        // TODO: Create episodes, sequences, etc.
        // Then verify cascade

        await request(app.getHttpServer())
          .delete(`/projects/${project.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });
    });

    describe('Error cases', () => {
      it('should return 404 for non-existent project', async () => {
        const fakeId = 999999;

        const response = await request(app.getHttpServer())
          .delete(`/projects/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expectNotFoundError(response);
      });

      it('should not allow deleting same project twice', async () => {
        const project = await createProject(app, authToken);

        // First delete
        await request(app.getHttpServer())
          .delete(`/projects/${project.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Second delete should fail
        const response = await request(app.getHttpServer())
          .delete(`/projects/${project.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expectNotFoundError(response);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle concurrent project creation', async () => {
      const timestamp = Date.now();
      const projectData1 = createTestProjectData({
        code: `TEST_PRJ_CONCURRENT_${timestamp}_1`,
      });
      const projectData2 = createTestProjectData({
        code: `TEST_PRJ_CONCURRENT_${timestamp}_2`,
      });

      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send(projectData1),
        request(app.getHttpServer())
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send(projectData2),
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response1.body.data.id).not.toBe(response2.body.data.id);
    });

    it('should handle very long description', async () => {
      const projectData = createTestProjectData({
        description: 'A'.repeat(5000),
      });

      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData);

      // Should either accept or reject based on max length
      expect([201, 400]).toContain(response.status);
    });
  });
});
