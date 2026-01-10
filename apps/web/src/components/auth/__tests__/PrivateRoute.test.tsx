import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { User } from '@shogun/shared';
import * as apiServiceModule from '../../../shared/api/client';
import { AuthProvider } from '../../../contexts/AuthContext';
import { PrivateRoute } from '../PrivateRoute';

// Mock apiService BEFORE importing anything
vi.mock('../../../shared/api/client', () => ({
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

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('PrivateRoute', () => {
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

  it('should render loading state when isLoading is true', async () => {
    // Mock getAuthStatus to return auth enabled
    (apiServiceModule.apiService.getAuthStatus as any).mockResolvedValue({
      authEnabled: true,
    });
    (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(null);
    (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(false);

    render(
      <TestWrapper>
        <PrivateRoute>
          <div>Protected Content</div>
        </PrivateRoute>
      </TestWrapper>,
    );

    // Should show loading initially
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', async () => {
    // Mock getAuthStatus to return auth enabled
    (apiServiceModule.apiService.getAuthStatus as any).mockResolvedValue({
      authEnabled: true,
    });
    (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(null);
    (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(false);

    render(
      <TestWrapper>
        <PrivateRoute>
          <div>Protected Content</div>
        </PrivateRoute>
      </TestWrapper>,
    );

    // Wait for loading to finish
    await waitFor(
      () => {
        expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // Navigate component should redirect - content should not be visible
    await waitFor(() => {
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  it('should render children when authenticated', async () => {
    const mockUser: User = { id: '1', name: 'Test User', role: 'admin' } as User;

    // Mock getAuthStatus to return auth enabled
    (apiServiceModule.apiService.getAuthStatus as any).mockResolvedValue({
      authEnabled: true,
    });
    (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(mockUser);
    (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(true);
    (apiServiceModule.apiService.getProfile as any).mockResolvedValue(mockUser);

    render(
      <TestWrapper>
        <PrivateRoute>
          <div>Protected Content</div>
        </PrivateRoute>
      </TestWrapper>,
    );

    // Wait for loading to finish and user to be set
    await waitFor(
      () => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('should show unauthorized message when user does not have required role', async () => {
    const mockUser: User = { id: '1', name: 'Test User', role: 'artist' } as User;

    // Mock getAuthStatus to return auth enabled
    (apiServiceModule.apiService.getAuthStatus as any).mockResolvedValue({
      authEnabled: true,
    });
    (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(mockUser);
    (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(true);
    (apiServiceModule.apiService.getProfile as any).mockResolvedValue(mockUser);

    render(
      <TestWrapper>
        <PrivateRoute requiredRole="admin">
          <div>Protected Content</div>
        </PrivateRoute>
      </TestWrapper>,
    );

    await waitFor(
      () => {
        expect(screen.getByText('Acceso no autorizado')).toBeInTheDocument();
        expect(
          screen.getByText('No tienes permisos para acceder a esta página.'),
        ).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('should render children when user has required role', async () => {
    const mockUser: User = { id: '1', name: 'Test User', role: 'admin' } as User;

    // Mock getAuthStatus to return auth enabled
    (apiServiceModule.apiService.getAuthStatus as any).mockResolvedValue({
      authEnabled: true,
    });
    (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(mockUser);
    (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(true);
    (apiServiceModule.apiService.getProfile as any).mockResolvedValue(mockUser);

    render(
      <TestWrapper>
        <PrivateRoute requiredRole="admin">
          <div>Protected Content</div>
        </PrivateRoute>
      </TestWrapper>,
    );

    await waitFor(
      () => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('should render children when no role is required', async () => {
    const mockUser: User = { id: '1', name: 'Test User', role: 'artist' } as User;

    // Mock getAuthStatus to return auth enabled
    (apiServiceModule.apiService.getAuthStatus as any).mockResolvedValue({
      authEnabled: true,
    });
    (apiServiceModule.apiService.getCurrentUser as any).mockReturnValue(mockUser);
    (apiServiceModule.apiService.isAuthenticated as any).mockReturnValue(true);
    (apiServiceModule.apiService.getProfile as any).mockResolvedValue(mockUser);

    render(
      <TestWrapper>
        <PrivateRoute>
          <div>Protected Content</div>
        </PrivateRoute>
      </TestWrapper>,
    );

    await waitFor(
      () => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('should render children when auth is disabled (mock user)', async () => {
    const mockUser: User = { id: '1', name: 'Mock User', role: 'admin' } as User;

    // Mock getAuthStatus to return auth disabled with mock user
    (apiServiceModule.apiService.getAuthStatus as any).mockResolvedValue({
      authEnabled: false,
      mockUser: mockUser,
    });

    render(
      <TestWrapper>
        <PrivateRoute>
          <div>Protected Content</div>
        </PrivateRoute>
      </TestWrapper>,
    );

    await waitFor(
      () => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});
