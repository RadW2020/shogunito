import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TransformResponseInterceptor } from '../../src/common/interceptors/transform-response.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { SanitizationPipe } from '../../src/common/pipes/sanitization.pipe';
import type { ApiResponse } from '../../src/common/interfaces/api-response.interface';

type BaseStatus = string;

/**
 * Types for test utilities
 */
interface TestResponse<T = unknown> {
  status: number;
  body: ApiResponse<T>;
}

interface UserData {
  email: string;
  name: string;
  password: string;
  role?: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  tokens: {
    accessToken: string;
    refreshToken?: string;
  };
  accessToken?: string;
}

interface ProjectData {
  code: string;
  name: string;
  description?: string;
  status?: string;
  id: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EpisodeData {
  id: number;
  code: string;
  name: string;
  description?: string;
  projectId: number;
  projectCode?: string;
  status?: BaseStatus;
  duration?: number;
  epNumber?: number;
  cutOrder: number;
}

interface SequenceData {
  id: number;
  code: string;
  name: string;
  description?: string;
  episodeId: number;
  episodeCode?: string;
  cutOrder?: number;
}

interface ShotData {
  id: number;
  code: string;
  name: string;
  description?: string;
  sequenceId: number;
  sequenceCode?: string;
  sequenceNumber?: number;
}

interface AssetData {
  id: number;
  code: string;
  name: string;
  description?: string;
  assetType?: string;
  projectId: number;
  projectCode?: string;
}

interface VersionData {
  id: number;
  code: string;
  name: string;
  description?: string;
  entityCode?: string;
  entityId?: number;
  entityType: 'shot' | 'asset' | 'sequence' | 'playlist';
  latest?: boolean;
}

interface PlaylistData {
  id: number;
  code: string;
  name: string;
  description?: string;
  projectId: number;
  projectCode?: string;
  versionCodes?: string[];
}

type ProjectRequestData = Omit<ProjectData, 'id'>;
type EpisodeRequestData = Omit<EpisodeData, 'id'>;
type SequenceRequestData = Omit<SequenceData, 'id'>;
type ShotRequestData = Omit<ShotData, 'id'>;
type AssetRequestData = Omit<AssetData, 'id'>;
type VersionRequestData = Omit<VersionData, 'id'>;
type PlaylistRequestData = Omit<PlaylistData, 'id'>;

interface NoteData {
  id: string;
  subject: string;
  content: string;
  linkId: string;
  linkType: string;
}

/**
 * Setup test application with same configuration as main.ts
 * This ensures tests have the same interceptors and pipes as production
 */
export function setupTestApp(app: INestApplication) {
  // Configurar ValidationPipe para validar antes de sanitizar
  // Usamos el mismo ValidationPipe que en producción (main.ts)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      skipMissingProperties: false, // Validate missing required fields
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Configurar SanitizationPipe después de la validación
  app.useGlobalPipes(new SanitizationPipe());

  // Configurar interceptores globales
  app.useGlobalInterceptors(
    // TransformResponseInterceptor para formatear respuestas con ApiResponse
    // Nota: ClassSerializerInterceptor se omite en tests para evitar problemas de serialización
    // Los campos sensibles se excluyen manualmente en el servicio
    new TransformResponseInterceptor(),
  );

  // Configurar filtro de excepciones global
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable CORS for tests
  app.enableCors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}

/**
 * Test data factories
 */

export const createTestUserData = (overrides = {}) => ({
  email: `test_${Date.now()}@example.com`,
  name: `Test User ${Date.now()}`,
  password: 'Test123456!',
  ...overrides,
});

export const createTestProjectData = (overrides = {}): ProjectRequestData => ({
  code: `TEST_PRJ_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  name: `Test Project ${Date.now()}`,
  description: 'Test project description',
  ...overrides,
});

export const createTestEpisodeData = (
  projectId: number | string,
  overrides = {},
): EpisodeRequestData => ({
  code: `EP${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}_${Date.now()}`,
  name: `Test Episode ${Date.now()}`,
  description: 'Test episode description',
  projectId: typeof projectId === 'number' ? projectId : parseInt(projectId, 10),
  cutOrder: 1,
  ...overrides,
});

export const createTestSequenceData = (
  episodeId: number | string,
  overrides = {},
): SequenceRequestData => ({
  code: `SEQ${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}_${Date.now()}`,
  name: `Test Sequence ${Date.now()}`,
  description: 'Test sequence description',
  episodeId: typeof episodeId === 'number' ? episodeId : parseInt(episodeId, 10),
  cutOrder: 1,
  ...overrides,
});

export const createTestShotData = (
  sequenceId: number | string,
  overrides = {},
): ShotRequestData => ({
  code: `SH${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}_${Date.now()}`,
  name: `Test Shot ${Date.now()}`,
  description: 'Test shot description',
  sequenceId: typeof sequenceId === 'number' ? sequenceId : parseInt(sequenceId, 10),
  sequenceNumber: 1,
  ...overrides,
});

export const createTestAssetData = (
  projectId: number | string,
  overrides = {},
): AssetRequestData => ({
  code: `AST_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  name: `Test Asset ${Date.now()}`,
  description: 'Test asset description',
  assetType: 'character',
  projectId: typeof projectId === 'number' ? projectId : parseInt(projectId, 10),
  ...overrides,
});

export const createTestVersionData = (
  entityIdentifier: string | number,
  entityType: 'shot' | 'asset' | 'sequence' | 'playlist',
  overrides = {},
): VersionRequestData => {
  const isNumber = typeof entityIdentifier === 'number';
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return {
    code: `V${timestamp}_${random}`,
    name: `Test Version ${timestamp}`,
    description: 'Test version description',
    ...(isNumber ? { entityId: entityIdentifier } : { entityCode: entityIdentifier }),
    entityType,
    latest: true,
    ...overrides,
  };
};

export function createTestPlaylistData(
  app: INestApplication,
  token: string,
  projectIdentifier: string | number,
  overrides: Partial<PlaylistRequestData> = {},
): PlaylistRequestData {
  const identifierOverride = overrides.projectId ?? overrides.projectCode;
  const projectId = resolveProjectId(app, token, identifierOverride ?? projectIdentifier);

  const baseData: PlaylistRequestData = {
    code: `PL_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: `Test Playlist ${Date.now()}`,
    description: 'Test playlist description',
    projectId,
    versionCodes: [],
  };

  const sanitizedOverrides = { ...overrides };
  delete sanitizedOverrides.projectCode;

  if (sanitizedOverrides.projectId) {
    sanitizedOverrides.projectId = projectId;
  }

  return {
    ...baseData,
    projectId,
    ...sanitizedOverrides,
  };
}

export const createTestNoteData = (
  linkId: string | number,
  linkType:
    | 'project'
    | 'episode'
    | 'sequence'
    | 'shot'
    | 'asset'
    | 'version'
    | 'playlist'
    | 'Project'
    | 'Episode'
    | 'Sequence'
    | 'Shot'
    | 'Asset'
    | 'Version'
    | 'Playlist',
  overrides = {},
) => {
  const formattedLinkType = linkType.charAt(0).toUpperCase() + linkType.slice(1);
  const linkIdString = typeof linkId === 'number' ? linkId.toString() : linkId;

  return {
    subject: `Test Note ${Date.now()}`,
    content: `Test note content ${Date.now()}`,
    linkId: linkIdString,
    linkType: formattedLinkType,
    ...overrides,
  };
};

export const createTestStatusData = (overrides = {}) => ({
  name: `Test Status ${Date.now()}`,
  code: `TST_${Date.now()}`,
  color: '#FF5733',
  description: 'Test status description',
  applicableEntities: ['shot'],
  ...overrides,
});

/**
 * Authentication helpers
 */

export async function registerUser(app: INestApplication, userData?: Partial<UserData>) {
  const user = userData || createTestUserData();
  const response: TestResponse<AuthResponse> = await request(app.getHttpServer())
    .post('/auth/register')
    .send(user);

  if (response.status !== 201) {
    console.error('Registration failed:', {
      status: response.status,
      body: JSON.stringify(response.body, null, 2),
    });
    throw new Error(`Registration failed with status ${response.status}`);
  }

  // Handle both wrapped and unwrapped responses
  const data = response.body.data || (response.body as unknown as AuthResponse);

  if (!data || (!data.user && !data.tokens)) {
    console.error('Unexpected response structure:', {
      body: JSON.stringify(response.body, null, 2),
    });
    throw new Error('Invalid response structure from registration');
  }

  return {
    user: data.user || (data as unknown as AuthResponse['user']),
    token: data.tokens?.accessToken || data.accessToken || '',
    tokens: data.tokens || { accessToken: data.accessToken || '' },
    credentials: user,
  };
}

export async function loginUser(app: INestApplication, email: string, password: string) {
  const response: TestResponse<AuthResponse> = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  const data = response.body.data;
  if (!data || !data.user || !data.tokens) {
    throw new Error('Invalid login response structure');
  }

  return {
    user: data.user,
    token: data.tokens.accessToken,
    tokens: data.tokens,
  };
}

export async function createAuthenticatedUser(app: INestApplication) {
  return registerUser(app);
}

export async function createAdminUser(app: INestApplication) {
  const userData = createTestUserData({
    role: 'admin',
  });
  return registerUser(app, userData);
}

export function getAuthHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Entity creation helpers
 */

export async function createProject(
  app: INestApplication,
  token: string,
  projectData?: Partial<ProjectRequestData>,
): Promise<ProjectData> {
  const baseData = createTestProjectData();
  const data: ProjectRequestData = { ...baseData, ...(projectData || {}) };
  const response: TestResponse<ProjectData> = await request(app.getHttpServer())
    .post('/projects')
    .set('Authorization', `Bearer ${token}`)
    .send(data);

  if (response.status !== 201) {
    console.error('Project creation failed:', {
      status: response.status,
      body: response.body,
      sentData: data,
    });
  }

  expect(response.status).toBe(201);

  const project = response.body.data;
  if (!project) {
    throw new Error('Project creation failed');
  }
  project.id = typeof project.id === 'number' ? project.id : parseInt(String(project.id), 10);
  if (project.code && project.id) {
    // Cache maps code to integer ID
    projectIdCache.set(
      project.code,
      typeof project.id === 'number' ? project.id : parseInt(project.id, 10),
    );
  }
  return project;
}

export async function createEpisode(
  app: INestApplication,
  token: string,
  projectIdentifier: string | number,
  episodeData?: Partial<EpisodeRequestData>,
): Promise<EpisodeData> {
  // If projectIdentifier is already a number, use it directly
  // Otherwise, resolve it (for backward compatibility with codes)
  const projectId =
    typeof projectIdentifier === 'number'
      ? projectIdentifier
      : resolveProjectId(app, token, projectIdentifier);
  const baseData = createTestEpisodeData(projectId);
  const data: EpisodeRequestData = { ...baseData, ...(episodeData || {}) };

  if (data.projectCode) {
    const resolvedId = resolveProjectId(app, token, data.projectCode);
    data.projectId = typeof resolvedId === 'string' ? parseInt(resolvedId, 10) : resolvedId;
    delete data.projectCode;
  }

  if (!data.projectId) {
    data.projectId = typeof projectId === 'string' ? parseInt(projectId, 10) : projectId;
  }

  const response: TestResponse<EpisodeData> = await request(app.getHttpServer())
    .post('/episodes')
    .set('Authorization', `Bearer ${token}`)
    .send(data)
    .expect(201);

  const episode = response.body.data;
  if (!episode) {
    throw new Error('Episode creation failed');
  }
  episode.id = typeof episode.id === 'number' ? episode.id : parseInt(String(episode.id), 10);
  episode.projectId =
    typeof episode.projectId === 'number'
      ? episode.projectId
      : parseInt(String(episode.projectId), 10);
  return episode;
}

export async function createSequence(
  app: INestApplication,
  token: string,
  projectIdentifier: string | number,
  episodeIdentifier: string | number,
  sequenceData?: Partial<SequenceRequestData>,
): Promise<SequenceData> {
  // Resolve episode ID if needed
  let episodeId: number;
  if (typeof episodeIdentifier === 'number') {
    episodeId = episodeIdentifier;
  } else {
    // If it's a code, we need to find the episode by code first
    // For now, assume it's already an ID or we'll need to look it up
    // This is a simplified version - in practice you might want to resolve it
    throw new Error(
      'Episode identifier must be a number (ID). Use episode.id instead of episode.code',
    );
  }

  const baseData = createTestSequenceData(episodeId);
  const data: SequenceRequestData = { ...baseData, ...(sequenceData || {}) };

  // Ensure episodeId is set
  if (!data.episodeId) {
    data.episodeId = episodeId;
  }

  const response: TestResponse<SequenceData> = await request(app.getHttpServer())
    .post('/sequences')
    .set('Authorization', `Bearer ${token}`)
    .send(data)
    .expect(201);

  const sequence = response.body.data;
  if (!sequence) {
    throw new Error('Sequence creation failed');
  }
  sequence.id = typeof sequence.id === 'number' ? sequence.id : parseInt(String(sequence.id), 10);
  sequence.episodeId =
    typeof sequence.episodeId === 'number'
      ? sequence.episodeId
      : parseInt(String(sequence.episodeId), 10);
  return sequence;
}

export async function createShot(
  app: INestApplication,
  token: string,
  projectIdentifier: string | number,
  sequenceIdentifier: string | number,
  shotData?: Partial<ShotRequestData>,
): Promise<ShotData> {
  // Resolve sequence ID if needed
  let sequenceId: number;
  if (typeof sequenceIdentifier === 'number') {
    sequenceId = sequenceIdentifier;
  } else {
    // If it's a code, we need to find the sequence by code first
    // For now, assume it's already an ID or we'll need to look it up
    throw new Error(
      'Sequence identifier must be a number (ID). Use sequence.id instead of sequence.code',
    );
  }

  const baseData = createTestShotData(sequenceId);
  const data: ShotRequestData = { ...baseData, ...(shotData || {}) };

  // Ensure sequenceId is set
  if (!data.sequenceId) {
    data.sequenceId = sequenceId;
  }

  const response: TestResponse<ShotData> = await request(app.getHttpServer())
    .post('/shots')
    .set('Authorization', `Bearer ${token}`)
    .send(data)
    .expect(201);

  const shot = response.body.data;
  if (!shot) {
    throw new Error('Shot creation failed');
  }
  shot.id = typeof shot.id === 'number' ? shot.id : parseInt(String(shot.id), 10);
  shot.sequenceId =
    typeof shot.sequenceId === 'number' ? shot.sequenceId : parseInt(String(shot.sequenceId), 10);
  return shot;
}

export async function createAsset(
  app: INestApplication,
  token: string,
  projectIdentifier: string | number,
  assetData?: Partial<AssetRequestData>,
): Promise<AssetData> {
  // Resolve project ID if needed
  let projectId: number;
  if (typeof projectIdentifier === 'number') {
    projectId = projectIdentifier;
  } else {
    // If it's a code, we need to find the project by code first
    // For now, assume it's already an ID or we'll need to look it up
    throw new Error(
      'Project identifier must be a number (ID). Use project.id instead of project.code',
    );
  }

  const baseData = createTestAssetData(projectId);
  const data: AssetRequestData = { ...baseData, ...(assetData || {}) };

  // Ensure projectId is set
  if (!data.projectId) {
    data.projectId = projectId;
  }

  const response: TestResponse<AssetData> = await request(app.getHttpServer())
    .post('/assets')
    .set('Authorization', `Bearer ${token}`)
    .send(data)
    .expect(201);

  const asset = response.body.data;
  if (!asset) {
    throw new Error('Asset creation failed');
  }
  asset.id = typeof asset.id === 'number' ? asset.id : parseInt(String(asset.id), 10);
  asset.projectId =
    typeof asset.projectId === 'number' ? asset.projectId : parseInt(String(asset.projectId), 10);
  return asset;
}

export async function createVersion(
  app: INestApplication,
  token: string,
  entityIdentifier: string | number,
  entityType: 'shot' | 'asset' | 'sequence' | 'playlist',
  versionData?: Partial<VersionRequestData>,
): Promise<VersionData> {
  const baseData = createTestVersionData(entityIdentifier, entityType);
  const data: VersionRequestData = versionData ? { ...baseData, ...versionData } : baseData;
  const response: TestResponse<VersionData> = await request(app.getHttpServer())
    .post('/versions')
    .set('Authorization', `Bearer ${token}`)
    .send(data)
    .expect(201);

  const version = response.body.data;
  if (!version) {
    throw new Error('Version creation failed');
  }
  version.id = typeof version.id === 'number' ? version.id : parseInt(String(version.id), 10);
  if (version.entityId !== undefined) {
    version.entityId =
      typeof version.entityId === 'number'
        ? version.entityId
        : parseInt(String(version.entityId), 10);
  }
  return version;
}

export async function createPlaylist(
  app: INestApplication,
  token: string,
  projectIdentifier: string | number,
  playlistData?: Partial<PlaylistRequestData>,
): Promise<PlaylistData> {
  let data: PlaylistRequestData;

  if (!playlistData) {
    data = createTestPlaylistData(app, token, projectIdentifier);
  } else {
    const identifierOverride = playlistData.projectId ?? playlistData.projectCode;
    const projectId = resolveProjectId(app, token, identifierOverride ?? projectIdentifier);

    data = {
      code: playlistData.code || `PL_${Date.now()}`,
      name: playlistData.name || `Test Playlist ${Date.now()}`,
      description: playlistData.description,
      projectId,
      versionCodes: playlistData.versionCodes || [],
    };
  }

  if (!Array.isArray(data.versionCodes)) {
    data.versionCodes = [];
  }
  const response: TestResponse<PlaylistData> = await request(app.getHttpServer())
    .post('/playlists')
    .set('Authorization', `Bearer ${token}`)
    .send(data)
    .expect(201);

  const playlist = response.body.data;
  if (!playlist) {
    throw new Error('Playlist creation failed');
  }
  playlist.id = typeof playlist.id === 'number' ? playlist.id : parseInt(String(playlist.id), 10);
  playlist.projectId =
    typeof playlist.projectId === 'number'
      ? playlist.projectId
      : parseInt(String(playlist.projectId), 10);
  return playlist;
}

export async function createNote(
  app: INestApplication,
  token: string,
  entityId: string | number,
  entityType: 'project' | 'episode' | 'sequence' | 'shot' | 'asset' | 'version' | 'playlist',
  noteData?: Partial<NoteData>,
): Promise<NoteData> {
  const entityIdString = typeof entityId === 'number' ? entityId.toString() : entityId;
  const data = noteData || createTestNoteData(entityIdString, entityType);
  const response: TestResponse<NoteData> = await request(app.getHttpServer())
    .post('/notes')
    .set('Authorization', `Bearer ${token}`)
    .send(data)
    .expect(201);

  const note = response.body.data;
  if (!note) {
    throw new Error('Note creation failed');
  }
  return note;
}

/**
 * Complete workflow helper - creates a full hierarchy
 */
export async function createCompleteWorkflow(app: INestApplication, token: string) {
  // Create project
  const project = await createProject(app, token);

  // Create episode
  const episode = await createEpisode(app, token, project.id);

  // Create sequence
  const sequence = await createSequence(app, token, project.id, episode.id);

  // Create shot
  const shot = await createShot(app, token, project.id, sequence.id);

  // Create asset
  const asset = await createAsset(app, token, project.id);

  // Create shot version
  const shotVersion = await createVersion(app, token, shot.id, 'shot');

  // Create asset version
  const assetVersion = await createVersion(app, token, asset.id, 'asset');

  // Create playlist
  const playlist = await createPlaylist(app, token, project.id);

  return {
    project,
    episode,
    sequence,
    shot,
    asset,
    shotVersion,
    assetVersion,
    playlist,
  };
}

/**
 * Cleanup helpers
 */

export async function deleteProject(
  app: INestApplication,
  token: string,
  projectId: string,
): Promise<void> {
  await request(app.getHttpServer())
    .delete(`/projects/${projectId}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
}

export async function deleteShot(
  app: INestApplication,
  token: string,
  shotId: string,
): Promise<void> {
  await request(app.getHttpServer())
    .delete(`/shots/${shotId}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
}

export async function deleteVersion(
  app: INestApplication,
  token: string,
  versionCode: string,
): Promise<void> {
  await request(app.getHttpServer())
    .delete(`/versions/${versionCode}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
}

/**
 * Assertion helpers
 */

export function expectValidationError(response: TestResponse, field?: string): void {
  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.error).toBeDefined();
  if (field) {
    // Check in error message or details - messages can be in Spanish
    // Map English field names to Spanish equivalents for validation messages
    const fieldMap: Record<string, string[]> = {
      name: ['nombre', 'name'],
      password: ['contraseña', 'password'],
      email: ['email', 'correo'],
    };

    const searchTerms = fieldMap[field.toLowerCase()] || [field.toLowerCase()];
    const errorMessage = JSON.stringify(response.body.error || response.body);
    const messages = response.body.error?.details?.message || (response.body as any).message || [];
    const messageArray = Array.isArray(messages) ? messages : [messages];

    // Also check in the error object itself
    const errorObj = response.body.error || response.body;
    const errorString = typeof errorObj === 'string' ? errorObj : JSON.stringify(errorObj);

    const hasField =
      searchTerms.some((term) => errorMessage.toLowerCase().includes(term)) ||
      searchTerms.some((term) => errorString.toLowerCase().includes(term)) ||
      messageArray.some((msg: string) =>
        searchTerms.some((term) => String(msg).toLowerCase().includes(term)),
      );

    expect(hasField).toBe(true);
  }
}

export function expectBadRequestError(response: TestResponse): void {
  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.error).toBeDefined();
}

export function expectNotFoundError(response: TestResponse): void {
  expect(response.status).toBe(404);
  expect(response.body.success).toBe(false);
  expect(response.body.error).toBeDefined();
}

export function expectUnauthorizedError(response: TestResponse): void {
  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
}

export function expectForbiddenError(response: TestResponse): void {
  expect(response.status).toBe(403);
  expect(response.body.success).toBe(false);
}

export function expectConflictError(response: TestResponse): void {
  expect(response.status).toBe(409);
  expect(response.body.success).toBe(false);
}

export function expectSuccessResponse<T = unknown>(
  response: TestResponse<T>,
  statusCode = 200,
): void {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toBeDefined();
}

/**
 * Wait helpers for async operations
 */

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mock file upload helper
 */

export function createMockFile(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  filename: string = 'test.jpg',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mimetype: string = 'image/jpeg',
  size: number = 1024,
) {
  return Buffer.alloc(size);
}
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const projectIdCache = new Map<string, number>();

function resolveProjectId(
  app: INestApplication,
  token: string,
  identifier: string | number,
): number {
  // If identifier is already a number, return it
  if (typeof identifier === 'number') {
    return identifier;
  }

  // If it's a UUID (old format), try to parse it
  if (UUID_REGEX.test(identifier)) {
    // For backward compatibility, try to find project by UUID
    // But since Project now uses integer ID, this should not happen
    throw new Error(
      `Project identifier ${identifier} is in UUID format, but Project now uses integer IDs.`,
    );
  }

  // Check cache
  const cachedId = projectIdCache.get(identifier);
  if (cachedId !== undefined) {
    return cachedId;
  }

  // If it's a numeric string, parse it
  const numericId = parseInt(identifier, 10);
  if (!isNaN(numericId)) {
    return numericId;
  }

  throw new Error(
    `Project identifier ${identifier} not found. Ensure the project was created before referencing it.`,
  );
}
