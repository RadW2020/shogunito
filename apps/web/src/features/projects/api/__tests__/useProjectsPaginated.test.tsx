import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useProjectsPaginated, useIsProjectsInitialLoading } from '../useProjectsPaginated';
import * as apiServiceModule from '@shared/api/client';

// Mock apiService
vi.mock('@shared/api/client', () => ({
  apiService: {
    getProjects: vi.fn(),
  },
}));

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useProjectsPaginated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useProjectsPaginated', () => {
    it('should fetch and paginate projects', async () => {
      const mockProjects = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Project ${i + 1}`,
        code: `PRJ${i + 1}`,
      }));

      (apiServiceModule.apiService.getProjects as any).mockResolvedValue(mockProjects);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useProjectsPaginated({ limit: 50 }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have first page of 50 items
      expect(result.current.flatData).toHaveLength(50);
      expect(result.current.flatData[0].id).toBe(1);
      expect(result.current.flatData[49].id).toBe(50);
      expect(result.current.hasMore).toBe(true);
    });

    it('should load more pages', async () => {
      const mockProjects = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Project ${i + 1}`,
        code: `PRJ${i + 1}`,
      }));

      (apiServiceModule.apiService.getProjects as any).mockResolvedValue(mockProjects);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useProjectsPaginated({ limit: 50 }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flatData).toHaveLength(50);

      // Load more
      result.current.loadMore();

      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(false);
      });

      // Should have 100 items now
      expect(result.current.flatData).toHaveLength(100);
      expect(result.current.hasMore).toBe(false);
    });

    it('should respect custom limit', async () => {
      const mockProjects = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Project ${i + 1}`,
        code: `PRJ${i + 1}`,
      }));

      (apiServiceModule.apiService.getProjects as any).mockResolvedValue(mockProjects);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useProjectsPaginated({ limit: 25 }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have first page of 25 items
      expect(result.current.flatData).toHaveLength(25);
      expect(result.current.hasMore).toBe(true);
    });

    it('should handle enabled option', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useProjectsPaginated({ enabled: false }), { wrapper });

      // Query should not run when disabled
      expect(apiServiceModule.apiService.getProjects).not.toHaveBeenCalled();
      expect(result.current.flatData).toHaveLength(0);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch projects');
      (apiServiceModule.apiService.getProjects as any).mockRejectedValue(error);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useProjectsPaginated(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.error).toBeDefined();
          expect(result.current.error).toBeInstanceOf(Error);
          expect(result.current.error?.message).toBe('Failed to fetch projects');
        },
        { timeout: 3000 },
      );
    });

    it('should use correct query key', () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const mockProjects = [{ id: 1, name: 'Project 1' }];
      (apiServiceModule.apiService.getProjects as any).mockResolvedValue(mockProjects);

      renderHook(() => useProjectsPaginated(), { wrapper: Wrapper });

      expect(
        queryClient.getQueryCache().find({ queryKey: ['projects', 'paginated'] }),
      ).toBeDefined();
    });
  });

  describe('useIsProjectsInitialLoading', () => {
    it('should return true when loading and no data', () => {
      const query = {
        isLoading: true,
        flatData: [],
      } as any;

      const result = useIsProjectsInitialLoading(query);
      expect(result).toBe(true);
    });

    it('should return false when loading but has data', () => {
      const query = {
        isLoading: true,
        flatData: [{ id: 1, name: 'Project 1' }],
      } as any;

      const result = useIsProjectsInitialLoading(query);
      expect(result).toBe(false);
    });

    it('should return false when not loading', () => {
      const query = {
        isLoading: false,
        flatData: [],
      } as any;

      const result = useIsProjectsInitialLoading(query);
      expect(result).toBe(false);
    });
  });
});
