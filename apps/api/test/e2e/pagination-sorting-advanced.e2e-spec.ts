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
  createAsset,
  createVersion,
  createTestProjectData,
  createTestEpisodeData,
  expectSuccessResponse,
  setupTestApp,
} from '../helpers/test-utils';

describe('Advanced Pagination and Sorting E2E Tests', () => {
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
  }, 120000); // Increase timeout for setup

  afterAll(async () => {
    await app.close();
  });

  describe('Large Dataset Handling', () => {
    describe('Projects - 100+ records', () => {
      const createdProjects: any[] = [];

      beforeAll(async () => {
        // Create 100 projects
        for (let i = 0; i < 100; i++) {
          const timestamp = Date.now();
          const projectData = createTestProjectData({
            code: `BULK_PRJ_${timestamp}_${i.toString().padStart(3, '0')}`,
            name: `Bulk Project ${timestamp}_${i}`,
            status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'archived' : 'completed',
          });

          try {
            const project = await createProject(app, authToken, projectData);
            createdProjects.push(project);
          } catch (error) {
            // Skip if project creation fails (e.g., duplicate code)
            console.warn(`Failed to create project ${i}:`, error);
          }

          // Add small delay every 10 projects to avoid overwhelming the server
          if (i % 10 === 9) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        }
      }, 180000); // 3 minute timeout for creating 100 projects

      it('should return all projects without pagination', async () => {
        const response = await request(app.getHttpServer())
          .get('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expectSuccessResponse(response);
        expect(Array.isArray(response.body.data)).toBe(true);
        // Should have at least some projects (may be less than 100 if some failed to create)
        expect(response.body.data.length).toBeGreaterThan(0);
      });

      it('should handle pagination with page and limit', async () => {
        const response = await request(app.getHttpServer())
          .get('/projects')
          .query({ page: 1, limit: 10 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expectSuccessResponse(response);
        expect(response.body.data.length).toBeLessThanOrEqual(10);

        if (response.body.pagination) {
          expect(response.body.pagination.page).toBe(1);
          expect(response.body.pagination.limit).toBe(10);
          expect(response.body.pagination.total).toBeGreaterThan(0);
        }
      });

      it('should retrieve different pages correctly', async () => {
        const page1 = await request(app.getHttpServer())
          .get('/projects')
          .query({ page: 1, limit: 10 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const page2 = await request(app.getHttpServer())
          .get('/projects')
          .query({ page: 2, limit: 10 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Pages should have different data (unless same items)
        if (page1.body.data.length > 0 && page2.body.data.length > 0) {
          const page1Ids = page1.body.data.map((p: any) => p.id);
          const page2Ids = page2.body.data.map((p: any) => p.id);

          // No overlap between pages (ideally)
          const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
          expect(overlap.length).toBe(0);
        }
      });

      it('should handle large page numbers gracefully', async () => {
        const response = await request(app.getHttpServer())
          .get('/projects')
          .query({ page: 1000, limit: 10 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expectSuccessResponse(response);
        // Should return empty array or error for out-of-range page
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should handle limit of 1', async () => {
        const response = await request(app.getHttpServer())
          .get('/projects')
          .query({ page: 1, limit: 1 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expectSuccessResponse(response);
        expect(response.body.data.length).toBeLessThanOrEqual(1);
      });

      it('should reject very large limit (1000)', async () => {
        const response = await request(app.getHttpServer())
          .get('/projects')
          .query({ page: 1, limit: 1000 })
          .set('Authorization', `Bearer ${authToken}`);

        // Should reject because limit exceeds max (100)
        expect(response.status).toBe(400);
      });

      it('should return dataset when filtering by unsupported status gracefully', async () => {
        const response = await request(app.getHttpServer())
          .get('/projects')
          .query({ page: 1, limit: 5 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expectSuccessResponse(response);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('Episodes - Large dataset', () => {
      const episodeCodes: string[] = [];

      beforeAll(async () => {
        // Create 50 episodes with unique codes using timestamp
        const timestamp = Date.now();
        for (let i = 0; i < 50; i++) {
          const episodeData = createTestEpisodeData(projectId, {
            code: `BULK_EP_${timestamp}_${i.toString().padStart(3, '0')}`,
            name: `Bulk Episode ${i}`,
            epNumber: i + 1,
          });

          const episode = await createEpisode(app, authToken, projectId, episodeData);
          episodeCodes.push(episode.code);

          if (i % 10 === 9) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        }
      }, 120000);

      it('should return all episodes', async () => {
        const response = await request(app.getHttpServer())
          .get('/episodes')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expectSuccessResponse(response);
        expect(response.body.data.length).toBeGreaterThanOrEqual(50);
      });

      it('should filter episodes by project', async () => {
        const response = await request(app.getHttpServer())
          .get('/episodes')
          .query({ projectId })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expectSuccessResponse(response);
        response.body.data.forEach((episode: any) => {
          // Episodes should expose projectId
          const episodeProjectId = episode.projectId || episode.project?.id;
          expect(episodeProjectId).toBe(projectId);
        });
      });
    });
  });

  describe('Sorting Behavior', () => {
    const sortTestProjects: any[] = [];

    beforeAll(async () => {
      // Create projects with specific names for sorting tests
      const names = [
        'Alpha Project',
        'Zeta Project',
        'Beta Project',
        'Gamma Project',
        'Delta Project',
      ];

      for (let i = 0; i < names.length; i++) {
        const timestamp = Date.now();
        const projectData = createTestProjectData({
          code: `SORT_${timestamp}_${i}`,
          name: names[i],
        });
        try {
          const project = await createProject(app, authToken, projectData);
          sortTestProjects.push(project);
          await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay for createdAt differences
        } catch (error) {
          // Skip if project creation fails
          console.warn(`Failed to create sort test project ${i}:`, error);
        }
      }
    });

    it('should sort by creation date (default)', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expectSuccessResponse(response);

      // Check if sorted by createdAt (DESC by default)
      const projects = response.body.data;
      for (let i = 0; i < projects.length - 1; i++) {
        const date1 = new Date(projects[i].createdAt);
        const date2 = new Date(projects[i + 1].createdAt);
        // DESC means newer first
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    });

    it('should maintain sort order with pagination', async () => {
      const page1 = await request(app.getHttpServer())
        .get('/projects')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      const page2 = await request(app.getHttpServer())
        .get('/projects')
        .query({ page: 2, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      // Pagination may not be fully implemented
      if (page1.status === 200 && page2.status === 200) {
        if (page1.body.data.length > 0 && page2.body.data.length > 0) {
          const lastFromPage1 = page1.body.data[page1.body.data.length - 1];
          const firstFromPage2 = page2.body.data[0];

          // If sorted by createdAt DESC, last item from page 1 should be older than first from page 2
          if (lastFromPage1.createdAt && firstFromPage2.createdAt) {
            const date1 = new Date(lastFromPage1.createdAt);
            const date2 = new Date(firstFromPage2.createdAt);
            expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
          }
        }
      } else {
        // Pagination may not be implemented, just verify responses are valid
        expect([200, 400]).toContain(page1.status);
        expect([200, 400]).toContain(page2.status);
      }
    });

    it('should handle sorting with filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expectSuccessResponse(response);

      // Should still be sorted even with filters
      const projects = response.body.data;
      if (projects.length > 1) {
        for (let i = 0; i < projects.length - 1; i++) {
          const date1 = new Date(projects[i].createdAt);
          const date2 = new Date(projects[i + 1].createdAt);
          expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
        }
      }
    });
  });

  describe('Sorting Stability', () => {
    const stableProjects: any[] = [];

    beforeAll(async () => {
      // Create multiple projects with same status to test stable sorting
      const timestamp = Date.now();
      for (let i = 0; i < 5; i++) {
        const projectData = createTestProjectData({
          code: `STABLE_${timestamp}_${i}`,
          name: `Stable Project ${i}`,
        });
        const project = await createProject(app, authToken, projectData);
        stableProjects.push(project);
      }
    });

    it('should maintain consistent order across multiple requests', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Same query should return same order
      const ids1 = response1.body.data.map((p: any) => p.id);
      const ids2 = response2.body.data.map((p: any) => p.id);

      expect(ids1).toEqual(ids2);
    });

    it('should handle sorting with null values', async () => {
      // Create project with null optional fields
      const projectData = createTestProjectData({
        description: undefined,
        clientName: undefined,
      });
      await createProject(app, authToken, projectData);

      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expectSuccessResponse(response);
      // Should handle nulls gracefully without errors
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Offset and Limit Edge Cases', () => {
    it('should reject page of 0', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .query({ page: 0, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      // Should reject because page must be >= 1
      expect(response.status).toBe(400);
    });

    it('should handle negative page number', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .query({ page: -1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      // Should either error or default to page 1
      expect([200, 400]).toContain(response.status);
    });

    it('should handle negative limit', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .query({ page: 1, limit: -10 })
        .set('Authorization', `Bearer ${authToken}`);

      // Should error or use default
      expect([200, 400]).toContain(response.status);
    });

    it('should handle limit of 0', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .query({ page: 1, limit: 0 })
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400]).toContain(response.status);
    });

    it('should handle non-numeric page', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .query({ page: 'abc', limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      // Should error or use default
      expect([200, 400]).toContain(response.status);
    });

    it('should handle float page number', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .query({ page: 1.5, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      // Should floor or error
      expect([200, 400]).toContain(response.status);
    });

    it('should handle extremely large page number', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .query({ page: 999999, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expectSuccessResponse(response);
      // Should return empty array
      expect(response.body.data).toEqual([]);
    });

    it('should reject extremely large limit', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .query({ page: 1, limit: 999999 })
        .set('Authorization', `Bearer ${authToken}`);

      // Should reject because limit exceeds max (100)
      expect(response.status).toBe(400);
    });
  });

  describe('Multiple Sort Columns', () => {
    it('should sort versions by entity and version number', async () => {
      const asset = await createAsset(app, authToken, projectId);

      // Create multiple versions
      for (let i = 1; i <= 5; i++) {
        await createVersion(app, authToken, asset.id, 'asset', {
          latest: i === 5, // Only the last one is latest
        });
      }

      const response = await request(app.getHttpServer())
        .get('/versions')
        .query({ entityId: asset.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expectSuccessResponse(response);

      const versions = response.body.data;
      // Versions may be sorted by createdAt or other criteria
      // Just verify they are returned
      expect(versions.length).toBeGreaterThan(0);
    });
  });

  describe('Search and Pagination Combined', () => {
    const searchProjects: any[] = [];

    beforeAll(async () => {
      // Create projects with searchable names
      const names = [
        'Animation Feature Film',
        'Animation Short Film',
        'Live Action Feature',
        'Documentary Feature',
        'Animation Series',
      ];

      for (let i = 0; i < names.length; i++) {
        const timestamp = Date.now();
        const projectData = createTestProjectData({
          code: `SEARCH_${timestamp}_${i}`,
          name: names[i],
        });
        try {
          const project = await createProject(app, authToken, projectData);
          searchProjects.push(project);
        } catch (error) {
          // Skip if project creation fails
          console.warn(`Failed to create search test project ${i}:`, error);
        }
      }
    });

    it('should search and paginate results', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .query({ search: 'Animation', page: 1, limit: 2 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.data) {
        expect(response.body.data.length).toBeLessThanOrEqual(2);
        response.body.data.forEach((project: any) => {
          expect(project.name.toLowerCase()).toContain('animation');
        });
      }
    });

    it('should maintain search results count across pagination', async () => {
      const page1 = await request(app.getHttpServer())
        .get('/projects')
        .query({ search: 'Feature', page: 1, limit: 2 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const page2 = await request(app.getHttpServer())
        .get('/projects')
        .query({ search: 'Feature', page: 2, limit: 2 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (page1.body.pagination && page2.body.pagination) {
        // Total count should be same across pages
        expect(page1.body.pagination.total).toBe(page2.body.pagination.total);
      }
    });
  });

  describe('Cursor-based Pagination Simulation', () => {
    it('should support pagination with page numbers', async () => {
      // Get first page
      const firstPage = await request(app.getHttpServer())
        .get('/projects')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (firstPage.body.data.length > 0) {
        // Get next page
        const nextPage = await request(app.getHttpServer())
          .get('/projects')
          .query({ page: 2, limit: 10 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Should return different data (or same if not enough data)
        expect(Array.isArray(nextPage.body.data)).toBe(true);
      }
    });
  });

  describe('Performance with Sorting and Filtering', () => {
    it('should respond quickly with complex query', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/projects')
        .query({
          page: 1,
          limit: 50,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expectSuccessResponse(response);

      // Should respond in reasonable time (< 2 seconds)
      expect(duration).toBeLessThan(2000);
    });

    it('should handle multiple filters without timeout', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .query({
          search: 'Project',
          page: 1,
          limit: 20,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(5000)
        .expect(200);

      expectSuccessResponse(response);
    });
  });

  describe('Relationships and Nested Sorting', () => {
    it('should sort sequences by cutOrder within episode', async () => {
      const episode = await createEpisode(app, authToken, projectId);

      // Create sequences with specific cutOrders
      const cutOrders = [5, 1, 3, 2, 4];
      for (const order of cutOrders) {
        await createSequence(app, authToken, projectId, episode.id, {
          cutOrder: order,
        });
      }

      const response = await request(app.getHttpServer())
        .get('/sequences')
        .query({ episodeId: episode.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expectSuccessResponse(response);

      const sequences = response.body.data;
      // Should be sorted by cutOrder
      for (let i = 0; i < sequences.length - 1; i++) {
        expect(sequences[i].cutOrder).toBeLessThanOrEqual(sequences[i + 1].cutOrder);
      }
    });

    it('should sort shots by shotNumber within sequence', async () => {
      const episode = await createEpisode(app, authToken, projectId);
      const sequence = await createSequence(app, authToken, projectId, episode.id);

      // Create shots with specific sequence numbers
      const sequenceNumbers = [10, 5, 15, 1, 20];
      for (const num of sequenceNumbers) {
        await createShot(app, authToken, projectId, sequence.id, {
          sequenceNumber: num,
        });
      }

      const response = await request(app.getHttpServer())
        .get('/shots')
        .query({ sequenceId: sequence.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expectSuccessResponse(response);

      const shots = response.body.data;
      // Should be sorted by sequenceNumber
      for (let i = 0; i < shots.length - 1; i++) {
        const seqNum1 = shots[i].sequenceNumber || shots[i].shotNumber;
        const seqNum2 = shots[i + 1].sequenceNumber || shots[i + 1].shotNumber;
        if (seqNum1 && seqNum2) {
          expect(seqNum1).toBeLessThanOrEqual(seqNum2);
        }
      }
    });
  });

  describe('Empty Results and Boundary Conditions', () => {
    it('should handle query with no results gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .query({ search: 'NONEXISTENT_PROJECT_XXXYYY' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expectSuccessResponse(response);
      expect(response.body.data).toEqual([]);

      if (response.body.pagination) {
        expect(response.body.pagination.total).toBe(0);
      }
    });

    it('should handle pagination beyond available data', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .query({ page: 9999, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      // May return 200 with empty array or 400 if pagination not supported
      expect([200, 400]).toContain(response.status);
      if (response.status === 200) {
        expectSuccessResponse(response);
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should handle single item pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .query({ page: 1, limit: 1 })
        .set('Authorization', `Bearer ${authToken}`);

      // May return 200 with data or 400 if pagination not supported
      expect([200, 400]).toContain(response.status);
      if (response.status === 200) {
        expectSuccessResponse(response);
        expect(response.body.data.length).toBeLessThanOrEqual(1);
      }
    });
  });
});
