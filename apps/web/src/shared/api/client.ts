// API service for communicating with the NestJS backend
import type {
  Project,
  Episode,
  Sequence,
  Version,
  Asset,
  User,
  Status,
} from '@shogun/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const AUTH_DISABLED = import.meta.env.VITE_AUTH_ENABLED === 'false';
const API_VERSION = '/api/v1';

// Auth interfaces
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'producer' | 'reviewer' | 'artist' | 'member';
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  };
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface MessageResponse {
  message: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  message?: string;
}

// Extended Version interface for API-specific fields
export interface ApiVersion extends Omit<Version, 'publishedAt' | 'lineage' | 'status'> {
  statusId?: string; // Status entity relation
  latest: boolean;
  publishedAt?: string;
  statusUpdatedAt?: string;
  // Entity relationship fields
  entityCode?: string;
  entityType: 'asset' | 'sequence' | 'episode';
  // Legacy fields for compatibility
  lineage: {
    prompt: string;
    seed: number;
    model_name: string;
  };
  assets: Array<{
    role: string;
    asset: Asset;
  }>;
}

// Additional interfaces for entities not in shared package
export interface Note {
  id: string;
  linkId: string;
  linkType: 'Project' | 'Episode' | 'Asset' | 'Sequence' | 'Version';
  subject: string;
  content: string;
  noteType: 'note' | 'approval' | 'revision' | 'client_note';
  isRead: boolean;
  attachments?: string[];
  createdBy?: number;
  assignedTo?: number;
  createdAt: Date;
  updatedAt: Date;
  project?: Project;
}


// API service class
class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null; // Prevent concurrent refresh attempts

  constructor() {
    // Recuperar tokens del localStorage al inicializar
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');

    // Mantener tokens sincronizados cuando cambien en otras pestañas o tras eventos manuales
    window.addEventListener('storage', this.syncTokensFromStorage);
    window.addEventListener('auth-storage-change', this.syncTokensFromStorage);

    // Start proactive token refresh mechanism
    this.startProactiveRefresh();
  }

  private syncTokensFromStorage = () => {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  };

  // Métodos para manejar tokens
  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('auth-storage-change'));
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('auth-storage-change'));
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Decode JWT token to get expiration time
   * Returns null if token is invalid or doesn't have expiration
   */
  private getTokenExpiration(token: string | null): number | null {
    if (!token) return null;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
    } catch {
      return null;
    }
  }

  /**
   * Check if access token is expired or will expire soon (within 5 minutes)
   */
  private isAccessTokenExpiredOrExpiringSoon(): boolean {
    if (!this.accessToken) return true;

    const expiration = this.getTokenExpiration(this.accessToken);
    if (!expiration) return true;

    const now = Date.now();
    const fiveMinutesInMs = 5 * 60 * 1000;

    // Token is expired or will expire within 5 minutes
    return expiration <= now + fiveMinutesInMs;
  }

  /**
   * Proactively refresh token before it expires
   */
  private async ensureValidAccessToken(): Promise<boolean> {
    // If token is still valid, no need to refresh
    if (!this.isAccessTokenExpiredOrExpiringSoon()) {
      return true;
    }

    // If no refresh token, can't refresh
    if (!this.refreshToken) {
      return false;
    }

    // If already refreshing, wait for that promise
    if (this.refreshPromise) {
      return await this.refreshPromise;
    }

    // Start refresh
    this.refreshPromise = this.refreshAccessToken();
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Start proactive token refresh mechanism
   * Checks token expiration periodically and refreshes before it expires
   */
  private startProactiveRefresh(): void {
    // Check every 5 minutes if token needs refresh
    setInterval(
      async () => {
        if (this.refreshToken && this.isAccessTokenExpiredOrExpiringSoon()) {
          await this.ensureValidAccessToken();
        }
      },
      5 * 60 * 1000,
    ); // Check every 5 minutes

    // Also check when page becomes visible (user returns to tab)
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden && this.refreshToken && this.isAccessTokenExpiredOrExpiringSoon()) {
        await this.ensureValidAccessToken();
      }
    });

    // Check when window gains focus
    window.addEventListener('focus', async () => {
      if (this.refreshToken && this.isAccessTokenExpiredOrExpiringSoon()) {
        await this.ensureValidAccessToken();
      }
    });
  }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    // Proactively refresh token if needed before making request
    // Skip for refresh endpoint to avoid infinite loop
    if (url !== '/auth/refresh' && url !== '/auth/login' && url !== '/auth/register') {
      await this.ensureValidAccessToken();
    }

    const headers: HeadersInit = {};

    // Only set Content-Type for non-FormData requests
    if (!(options?.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Merge with any provided headers
    Object.assign(headers, options?.headers);

    // Añadir token de autorización si existe y auth no está deshabilitado
    if (!AUTH_DISABLED && this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(`${API_BASE_URL}${API_VERSION}${url}`, {
      ...options,
      headers,
    });

    // Si recibimos un 401, intentar refrescar el token (fallback mechanism)
    if (response.status === 401 && this.refreshToken && url !== '/auth/refresh') {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Reintentar la petición con el nuevo token
        (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(`${API_BASE_URL}${API_VERSION}${url}`, {
          ...options,
          headers,
        });
      }
    }

    if (!response.ok) {
      // Si es un 401 después de intentar refrescar, limpiar tokens y redirigir al login
      // Pero no redirigir si ya estamos en la página de login
      if (response.status === 401 && !window.location.pathname.includes('/login')) {
        this.clearTokens();
        window.location.href = '/login';
      }

      // Si es un 403 en el endpoint de refresh, es un replay attack
      if (response.status === 403 && url === '/auth/refresh') {
        this.clearTokens();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        throw new Error(
          'Sesión invalidada por razones de seguridad. Por favor, inicia sesión nuevamente.',
        );
      }

      const errorText = await response.text();
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`;

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // Si no es JSON válido, usar el texto tal cual
        if (errorText) {
          errorMessage = errorText;
        }
      }

      throw new Error(errorMessage);
    }

    const jsonResponse = await response.json();

    // Extract data from ApiResponse wrapper if present
    // ApiResponse format: { success: true, data: T, metadata: {...} }
    if (
      jsonResponse &&
      typeof jsonResponse === 'object' &&
      'success' in jsonResponse &&
      'data' in jsonResponse
    ) {
      return jsonResponse.data;
    }

    return jsonResponse;
  }

  private async requestNoContent(url: string, options?: RequestInit): Promise<void> {
    // Proactively refresh token if needed before making request
    // Skip for refresh endpoint to avoid infinite loop
    if (url !== '/auth/refresh' && url !== '/auth/login' && url !== '/auth/register') {
      await this.ensureValidAccessToken();
    }

    const headers: HeadersInit = {};

    // Only set Content-Type for non-FormData requests
    if (!(options?.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Merge with any provided headers
    Object.assign(headers, options?.headers);

    // Añadir token de autorización si existe y auth no está deshabilitado
    if (!AUTH_DISABLED && this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(`${API_BASE_URL}${API_VERSION}${url}`, {
      ...options,
      headers,
    });

    // Si recibimos un 401, intentar refrescar el token (fallback mechanism)
    if (response.status === 401 && this.refreshToken && url !== '/auth/refresh') {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Reintentar la petición con el nuevo token
        (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(`${API_BASE_URL}${API_VERSION}${url}`, {
          ...options,
          headers,
        });
      }
    }

    if (!response.ok) {
      // Si es un 401 después de intentar refrescar, limpiar tokens y redirigir al login
      // Pero no redirigir si ya estamos en la página de login
      if (response.status === 401 && !window.location.pathname.includes('/login')) {
        this.clearTokens();
        window.location.href = '/login';
      }

      // Si es un 403 en el endpoint de refresh, es un replay attack
      if (response.status === 403 && url === '/auth/refresh') {
        this.clearTokens();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        throw new Error(
          'Sesión invalidada por razones de seguridad. Por favor, inicia sesión nuevamente.',
        );
      }

      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    // No intentar parsear JSON para respuestas sin contenido
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (AUTH_DISABLED) return false;
    if (!this.refreshToken) return false;

    // Check if refresh token itself is expired
    const refreshTokenExpiration = this.getTokenExpiration(this.refreshToken);
    if (refreshTokenExpiration && refreshTokenExpiration <= Date.now()) {
      console.warn('Refresh token has expired');
      this.clearTokens();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${API_VERSION}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.refreshToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Token rotation: server returns new access and refresh tokens
        // Handle both direct TokenResponse and wrapped ApiResponse formats
        const accessToken = data.accessToken || data.data?.accessToken;
        const refreshToken = data.refreshToken || data.data?.refreshToken;

        if (accessToken && refreshToken) {
          this.setTokens(accessToken, refreshToken);
          return true;
        } else {
          console.error('Invalid refresh response format:', data);
          this.clearTokens();
          return false;
        }
      }

      // Handle replay attack detection (403 Forbidden)
      // When a replay attack is detected, the entire token family is revoked
      if (response.status === 403) {
        console.warn('Replay attack detected - all tokens revoked');
        this.clearTokens();
        // Force re-login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return false;
      }

      // Handle 401 (refresh token invalid/expired)
      if (response.status === 401) {
        console.warn('Refresh token is invalid or expired');
        this.clearTokens();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return false;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
    }

    this.clearTokens();
    return false;
  }

  // Auth API methods
  async login(credentials: LoginDto): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Guardar tokens y usuario
    this.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.user));

    return response;
  }

  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Guardar tokens y usuario
    this.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.user));

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Limpiar tokens independientemente del resultado
      this.clearTokens();
      window.location.href = '/login';
    }
  }

  async getProfile(): Promise<User> {
    return this.request<User>('/auth/profile');
  }

  /**
   * Solicitar recuperación de contraseña
   */
  async requestPasswordReset(email: string): Promise<MessageResponse> {
    return this.request<MessageResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Validar token de recuperación
   */
  async validateResetToken(token: string): Promise<ValidateTokenResponse> {
    return this.request<ValidateTokenResponse>('/auth/validate-reset-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  /**
   * Resetear contraseña con token
   */
  async resetPassword(token: string, newPassword: string): Promise<MessageResponse> {
    return this.request<MessageResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Get authentication status (whether auth is enabled and mock user if disabled)
   */
  async getAuthStatus(): Promise<{
    authEnabled: boolean;
    mockUser: User | null;
  }> {
    return this.request<{ authEnabled: boolean; mockUser: User | null }>('/auth/status');
  }

  // Project API methods
  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>('/projects');
  }

  async getProject(id: number): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  async createProject(project: Partial<Project>): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(project),
    });
  }

  async deleteProject(id: number): Promise<void> {
    await this.requestNoContent(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Episodes API methods
  async getEpisodes(): Promise<Episode[]> {
    return this.request<Episode[]>('/episodes');
  }

  async getEpisode(id: number): Promise<Episode> {
    return this.request<Episode>(`/episodes/${id}`);
  }

  async createEpisode(episode: Partial<Episode>): Promise<Episode> {
    return this.request<Episode>('/episodes', {
      method: 'POST',
      body: JSON.stringify(episode),
    });
  }

  async updateEpisode(id: number, episode: Partial<Episode>): Promise<Episode> {
    return this.request<Episode>(`/episodes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(episode),
    });
  }

  async deleteEpisode(id: number): Promise<void> {
    await this.request(`/episodes/${id}`, {
      method: 'DELETE',
    });
  }

  // Versions API methods
  async getVersions(entityId?: number, entityType?: string): Promise<ApiVersion[]> {
    try {
      const params = new URLSearchParams();
      if (entityId) params.append('entityId', entityId.toString());
      if (entityType) params.append('entityType', entityType);
      
      const queryString = params.toString();
      const url = queryString ? `/versions?${queryString}` : '/versions';
      
      return await this.request<ApiVersion[]>(url);
    } catch (error) {
      console.warn('Versions endpoint failed, returning empty array:', error);
      // Return empty array instead of throwing to prevent blocking other requests
      return [];
    }
  }

  async getVersion(id: number): Promise<ApiVersion> {
    return this.request<ApiVersion>(`/versions/${id}`);
  }

  async createVersion(version: Partial<ApiVersion>): Promise<ApiVersion> {
    return this.request<ApiVersion>('/versions', {
      method: 'POST',
      body: JSON.stringify(version),
    });
  }

  async updateVersion(id: number, version: Partial<ApiVersion>): Promise<ApiVersion> {
    return this.request<ApiVersion>(`/versions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(version),
    });
  }

  async deleteVersion(id: number): Promise<void> {
    return this.requestNoContent(`/versions/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadThumbnail(versionId: number, file: File): Promise<ApiVersion> {
    const formData = new FormData();
    formData.append('thumbnail', file);

    return this.request<ApiVersion>(`/versions/${versionId}/thumbnail`, {
      method: 'POST',
      body: formData,
      headers: {}, // No establecer Content-Type para FormData
    });
  }

  async uploadVersionFile(versionId: number, file: File): Promise<ApiVersion> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<ApiVersion>(`/versions/${versionId}/file`, {
      method: 'POST',
      body: formData,
      headers: {}, // No establecer Content-Type para FormData
    });
  }

  // Assets API methods
  async uploadAssetThumbnail(assetIdOrCode: number | string, file: File): Promise<Asset> {
    const formData = new FormData();
    formData.append('thumbnail', file);

    // The endpoint accepts both numeric IDs and string codes
    return this.request<Asset>(`/assets/${assetIdOrCode}/thumbnail`, {
      method: 'POST',
      body: formData,
      headers: {}, // No establecer Content-Type para FormData
    });
  }

  // Notes API methods
  async getNotes(): Promise<Note[]> {
    try {
      return await this.request<Note[]>('/notes');
    } catch (error) {
      console.warn('Notes endpoint not available, returning empty array:', error);
      return [];
    }
  }

  async getNotesByEntity(linkId: string, linkType: string): Promise<Note[]> {
    try {
      return await this.request<Note[]>(`/notes?linkId=${linkId}&linkType=${linkType}`);
    } catch (error) {
      console.warn('Notes by entity endpoint not available, returning empty array:', error);
      return [];
    }
  }

  async createNote(note: Partial<Note>): Promise<Note> {
    return this.request<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify(note),
    });
  }

  async updateNote(id: number, note: Partial<Note>): Promise<Note> {
    return this.request<Note>(`/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(note),
    });
  }

  async deleteNote(id: number): Promise<void> {
    return this.requestNoContent(`/notes/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadNoteAttachment(noteId: number, file: File): Promise<Note> {
    const formData = new FormData();
    formData.append('attachment', file);

    return this.request<Note>(`/notes/${noteId}/attachments`, {
      method: 'POST',
      body: formData,
      headers: {}, // No establecer Content-Type para FormData
    });
  }

  async removeNoteAttachment(noteId: number, attachmentId: string): Promise<Note> {
    return this.request<Note>(`/notes/${noteId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  }

  // Users API methods
  async getUsers(): Promise<User[]> {
    try {
      return await this.request<User[]>('/users');
    } catch (error) {
      console.warn('Users endpoint not available, returning empty array:', error);
      return [];
    }
  }

  // Statuses API methods
  async getStatuses(): Promise<Status[]> {
    try {
      return await this.request<Status[]>('/statuses');
    } catch (error) {
      console.warn('Statuses endpoint not available, returning empty array:', error);
      return [];
    }
  }

  async createStatus(status: Partial<Status>) {
    return this.request<Status>('/statuses', {
      method: 'POST',
      body: JSON.stringify(status),
    });
  }

  async updateStatus(id: number, status: Partial<Status>) {
    return this.request<Status>(`/statuses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(status),
    });
  }

  async deleteStatus(id: number): Promise<void> {
    return this.requestNoContent(`/statuses/${id}`, {
      method: 'DELETE',
    });
  }

  // Sequences API methods
  async getSequences(): Promise<Sequence[]> {
    try {
      return await this.request<Sequence[]>('/sequences');
    } catch (error) {
      console.warn('Sequences endpoint not available, returning empty array:', error);
      return [];
    }
  }

  async createSequence(sequence: Partial<Sequence>): Promise<Sequence> {
    return this.request<Sequence>('/sequences', {
      method: 'POST',
      body: JSON.stringify(sequence),
    });
  }

  async updateSequence(id: number, sequence: Partial<Sequence>): Promise<Sequence> {
    return this.request<Sequence>(`/sequences/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(sequence),
    });
  }

  async deleteSequence(id: number): Promise<void> {
    return this.requestNoContent(`/sequences/${id}`, {
      method: 'DELETE',
    });
  }

  // Assets API methods
  async getAssets(): Promise<Asset[]> {
    try {
      return await this.request<Asset[]>('/assets');
    } catch (error) {
      console.warn('Assets endpoint not available, returning empty array:', error);
      return [];
    }
  }

  async createAsset(asset: Partial<Asset>): Promise<Asset> {
    return this.request<Asset>('/assets', {
      method: 'POST',
      body: JSON.stringify(asset),
    });
  }

  async updateAsset(id: number, asset: Partial<Asset>): Promise<Asset> {
    return this.request<Asset>(`/assets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(asset),
    });
  }

  async deleteAsset(id: number): Promise<void> {
    // Backend expects asset id as identifier in the path
    return this.requestNoContent(`/assets/${id}`, {
      method: 'DELETE',
    });
  }

}

export const apiService = new ApiService();
