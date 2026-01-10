import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import {
  createAdminUser,
  createProject,
  createPlaylist,
  createVersion,
  createShot,
  createEpisode,
  createSequence,
  createTestPlaylistData,
  expectSuccessResponse,
  expectValidationError,
  expectNotFoundError,
  setupTestApp,
} from '../helpers/test-utils';

describe('Playlists E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let projectCode: string;
  let projectId: number;
  let versionCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupTestApp(app);
    await app.init();

    const { token } = await createAdminUser(app);
    authToken = token;

    const project = await createProject(app, authToken);
    projectCode = project.code;
    projectId = project.id!;

    const episode = await createEpisode(app, authToken, projectId);
    const sequence = await createSequence(app, authToken, projectId, episode.id);
    const shot = await createShot(app, authToken, projectId, sequence.id);
    const version = await createVersion(app, authToken, shot.code, 'shot');
    versionCode = version.code;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /playlists', () => {
    it('should create playlist', async () => {
      const playlistData = await createTestPlaylistData(app, authToken, projectId);

      const response = await request(app.getHttpServer())
        .post('/playlists')
        .set('Authorization', `Bearer ${authToken}`)
        .send(playlistData)
        .expect(201);

      expectSuccessResponse(response, 201);
      expect(response.body.data.code).toBe(playlistData.code);
      expect(response.body.data.id).toBeDefined();
      expect(typeof response.body.data.id).toBe('number');
    });

    it('should fail without projectId', async () => {
      const playlistData = await createTestPlaylistData(app, authToken, projectId);
      const { projectId: _, ...playlistDataWithoutProjectId } = playlistData;

      const response = await request(app.getHttpServer())
        .post('/playlists')
        .set('Authorization', `Bearer ${authToken}`)
        .send(playlistDataWithoutProjectId);

      expectValidationError(response, 'projectId');
    });
  });

  describe('POST /playlists/from-versions', () => {
    it('should create playlist from selected versions', async () => {
      const playlistData = {
        code: `PL_FROM_V_${Date.now()}`,
        name: 'Playlist from Versions',
        projectId,
        versionCodes: [versionCode],
      };

      const response = await request(app.getHttpServer())
        .post('/playlists/from-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(playlistData)
        .expect(201);

      expectSuccessResponse(response, 201);
      expect(response.body.data.code).toBe(playlistData.code);
    });

    it('should fail without versionCodes', async () => {
      const playlistData = {
        code: `PL_EMPTY_${Date.now()}`,
        name: 'Empty Playlist',
        projectId,
      };

      const response = await request(app.getHttpServer())
        .post('/playlists/from-versions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(playlistData);

      expectValidationError(response, 'versionCodes');
    });
  });

  describe('GET /playlists', () => {
    it('should get all playlists', async () => {
      const response = await request(app.getHttpServer())
        .get('/playlists')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expectSuccessResponse(response);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by projectId', async () => {
      const response = await request(app.getHttpServer())
        .get('/playlists')
        .query({ projectId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach((playlist: any) => {
        expect(playlist.projectId).toBe(projectId);
      });
    });
  });

  describe('GET /playlists/:id', () => {
    it('should get playlist by ID', async () => {
      const playlist = await createPlaylist(app, authToken, projectId);

      const response = await request(app.getHttpServer())
        .get(`/playlists/${playlist.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(playlist.id);
      expect(response.body.data.code).toBeDefined();
    });

    it('should return 404 for non-existent playlist', async () => {
      const response = await request(app.getHttpServer())
        .get('/playlists/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expectNotFoundError(response);
    });

    it('should return 400 for invalid ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/playlists/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('PATCH /playlists/:id', () => {
    it('should update playlist', async () => {
      const playlist = await createPlaylist(app, authToken, projectId);

      const response = await request(app.getHttpServer())
        .patch(`/playlists/${playlist.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Playlist' })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Playlist');
    });
  });

  describe('DELETE /playlists/:id', () => {
    it('should delete playlist', async () => {
      const playlist = await createPlaylist(app, authToken, projectId);

      const deleteResponse = await request(app.getHttpServer())
        .delete(`/playlists/${playlist.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 204, 404]).toContain(deleteResponse.status);

      if (deleteResponse.status === 200) {
        const getResponse = await request(app.getHttpServer())
          .get(`/playlists/${playlist.id}`)
          .set('Authorization', `Bearer ${authToken}`);
        expectNotFoundError(getResponse);
      }
    });
  });

  describe('POST /playlists/:id/versions', () => {
    it('should add version to playlist', async () => {
      const playlist = await createPlaylist(app, authToken, projectId);

      const response = await request(app.getHttpServer())
        .post(`/playlists/${playlist.id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          versionCode,
          position: 0,
        })
        .expect(201);

      expectSuccessResponse(response, 201);
    });
  });

  describe('DELETE /playlists/:id/versions/:versionCode', () => {
    it('should remove version from playlist', async () => {
      const playlist = await createPlaylist(app, authToken, projectId);

      await request(app.getHttpServer())
        .post(`/playlists/${playlist.id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ versionCode, position: 0 })
        .expect(201);

      const response = await request(app.getHttpServer())
        .delete(`/playlists/${playlist.id}/versions/${versionCode}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expectSuccessResponse(response);
    });
  });

  describe('PUT /playlists/:id/versions/reorder', () => {
    it('should reorder versions in playlist', async () => {
      const playlist = await createPlaylist(app, authToken, projectId);

      await request(app.getHttpServer())
        .post(`/playlists/${playlist.id}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ versionCode, position: 0 })
        .expect(201);

      const response = await request(app.getHttpServer())
        .put(`/playlists/${playlist.id}/versions/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          versionCodes: [versionCode],
        })
        .expect(200);

      expectSuccessResponse(response);
    });
  });
});
