import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider } from '../AuthContext';
import { useAuth } from '../../hooks/useAuth';
import * as apiServiceModule from '../../shared/api/client';

// Mock apiService
vi.mock('../../shared/api/client', () => ({
  apiService: {
    getCurrentUser: vi.fn(),
    isAuthenticated: vi.fn(),
    getProfile: vi.fn(),
    getAuthStatus: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    clearTokens: vi.fn(),
  },
}));

// Mock fetch for checkAuthStatus
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Test wrapper with AuthProvider
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    (global.fetch as any).mockClear();

    // Reset environment
    delete (import.meta as any).env.VITE_API_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('should start with loading state', () => {
      // Mock getAuthStatus to return auth enabled
      (apiServiceModule.apiService.getAuthStatus as any).mockResolvedValue({
        authEnabled: true,
      });
      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(null);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(false);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should check auth status on mount', async () => {
      (apiServiceModule.apiService.getAuthStatus as any).mockResolvedValue({
        authEnabled: true,
      });
      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(null);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(false);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 2000 },
      );

      expect(apiServiceModule.apiService.getAuthStatus).toHaveBeenCalled();
    });
  });

  describe('Authentication disabled (mock user)', () => {
    it('should use mock user when auth is disabled', async () => {
      const mockUser = {
        id: 1,
        name: 'Mock User',
        email: 'mock@example.com',
        role: 'admin',
      };

      (apiServiceModule.apiService.getAuthStatus as any).mockResolvedValue({
        authEnabled: false,
        mockUser,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 2000 },
      );

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('checkAuth', () => {
    it('should set user when authenticated with valid token', async () => {
      const currentUser = {
        id: 1,
        name: 'Current User',
        email: 'current@example.com',
      };
      const profileUser = {
        id: 1,
        name: 'Profile User',
        email: 'profile@example.com',
      };

      (apiServiceModule.apiService.getAuthStatus as any).mockResolvedValue({
        authEnabled: true,
      });
      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(currentUser);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(true);
      (apiServiceModule.apiService.getProfile as any).mockResolvedValue(profileUser);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 2000 },
      );

      // Should use profile user (more up-to-date)
      expect(result.current.user).toEqual(profileUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should clear user when token is invalid', async () => {
      const currentUser = {
        id: 1,
        name: 'Current User',
        email: 'current@example.com',
      };

      (apiServiceModule.apiService.getAuthStatus as any).mockResolvedValue({
        authEnabled: true,
      });
      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(currentUser);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(true);
      (apiServiceModule.apiService.getProfile as any).mockRejectedValue(new Error('Invalid token'));
      const clearTokensSpy = vi.spyOn(apiServiceModule.apiService, 'clearTokens');

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 2000 },
      );

      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(clearTokensSpy).toHaveBeenCalled();
    });

    it('should set user to null when not authenticated', async () => {
      (apiServiceModule.apiService.getAuthStatus as any).mockResolvedValue({
        authEnabled: true,
      });
      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(null);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(false);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 2000 },
      );

      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (apiServiceModule.apiService.getAuthStatus as any).mockResolvedValue({
        authEnabled: true,
      });
      (apiServiceModule.apiService.getCurrentUser as any).mockImplementation(() => {
        throw new Error('Storage error');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 2000 },
      );

      expect(result.current.user).toBe(null);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('checkAuthStatus', () => {
    it('should fallback to checkAuth when status check fails', async () => {
      (apiServiceModule.apiService.getAuthStatus as any).mockRejectedValue(
        new Error('Network error'),
      );
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(null);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(false);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 2000 },
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.current.user).toBe(null);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('login', () => {
    it('should login successfully and set user', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };
      const authResponse = {
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
        },
        accessToken: 'token123',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authEnabled: true }),
      });

      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(null);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(false);
      (apiServiceModule.apiService.login as any).mockResolvedValue(authResponse);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(apiServiceModule.apiService.login).toHaveBeenCalledWith(credentials);
      expect(result.current.user).toEqual(authResponse.user);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle login errors', async () => {
      const credentials = { email: 'test@example.com', password: 'wrong' };
      const error = new Error('Invalid credentials');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authEnabled: true }),
      });

      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(null);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(false);
      (apiServiceModule.apiService.login as any).mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.login(credentials)).rejects.toThrow('Invalid credentials');
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error en login:', error);
      expect(result.current.user).toBe(null);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('register', () => {
    it('should register successfully and set user', async () => {
      const registerData = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };
      const authResponse = {
        user: {
          id: 2,
          name: 'New User',
          email: 'new@example.com',
        },
        accessToken: 'token456',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authEnabled: true }),
      });

      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(null);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(false);
      (apiServiceModule.apiService.register as any).mockResolvedValue(authResponse);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.register(registerData);
      });

      expect(apiServiceModule.apiService.register).toHaveBeenCalledWith(registerData);
      expect(result.current.user).toEqual(authResponse.user);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle register errors', async () => {
      const registerData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      };
      const error = new Error('Email already exists');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authEnabled: true }),
      });

      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(null);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(false);
      (apiServiceModule.apiService.register as any).mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.register(registerData)).rejects.toThrow('Email already exists');
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error en registro:', error);
      expect(result.current.user).toBe(null);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('logout', () => {
    it('should logout successfully and clear user', async () => {
      const currentUser = {
        id: 1,
        name: 'Current User',
        email: 'current@example.com',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authEnabled: true }),
      });

      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(currentUser);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(true);
      (apiServiceModule.apiService.getProfile as any).mockResolvedValue(currentUser);
      (apiServiceModule.apiService.logout as any).mockResolvedValue(undefined);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(apiServiceModule.apiService.logout).toHaveBeenCalled();
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should clear user even if logout fails', async () => {
      const currentUser = {
        id: 1,
        name: 'Current User',
        email: 'current@example.com',
      };
      const error = new Error('Logout failed');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authEnabled: true }),
      });

      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(currentUser);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(true);
      (apiServiceModule.apiService.getProfile as any).mockResolvedValue(currentUser);
      (apiServiceModule.apiService.logout as any).mockRejectedValue(error);
      const clearTokensSpy = vi.spyOn(apiServiceModule.apiService, 'clearTokens');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error en logout:', error);
      expect(clearTokensSpy).toHaveBeenCalled();
      expect(result.current.user).toBe(null);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateUser', () => {
    it('should update user and persist to localStorage', async () => {
      const initialUser = {
        id: '1',
        name: 'Initial User',
        email: 'initial@example.com',
        role: 'member',
      };
      const updatedUser = {
        id: '1',
        name: 'Updated User',
        email: 'updated@example.com',
        role: 'member',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authEnabled: true }),
      });

      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(initialUser);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(true);
      (apiServiceModule.apiService.getProfile as any).mockResolvedValue(initialUser);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateUser(updatedUser);
      });

      expect(result.current.user).toEqual(updatedUser);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(updatedUser));
    });
  });

  describe('Storage events (cross-tab sync)', () => {
    it('should sync auth state when token is set in another tab', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authEnabled: true }),
      });

      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(null);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(false);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate storage event from another tab
      const newUser = {
        id: 1,
        name: 'New User',
        email: 'new@example.com',
      };
      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(newUser);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(true);
      (apiServiceModule.apiService.getProfile as any).mockResolvedValue(newUser);

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'accessToken',
          newValue: 'new-token',
        });
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(newUser);
      });
    });

    it('should clear user when token is removed in another tab', async () => {
      const currentUser = {
        id: 1,
        name: 'Current User',
        email: 'current@example.com',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authEnabled: true }),
      });

      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(currentUser);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(true);
      (apiServiceModule.apiService.getProfile as any).mockResolvedValue(currentUser);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate token removal in another tab
      act(() => {
        const event = new StorageEvent('storage', {
          key: 'accessToken',
          newValue: null,
        });
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(result.current.user).toBe(null);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle custom auth-storage-change event', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authEnabled: true }),
      });

      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(null);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(false);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newUser = {
        id: 1,
        name: 'New User',
        email: 'new@example.com',
      };
      (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(newUser);
      (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(true);
      (apiServiceModule.apiService.getProfile as any).mockResolvedValue(newUser);

      act(() => {
        const event = new Event('auth-storage-change');
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(newUser);
      });
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth debe ser usado dentro de un AuthProvider');

      consoleErrorSpy.mockRestore();
    });
  });
});
