import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useShots, useCreateShot, useUpdateShot, useDeleteShot } from '../useShots';
import * as apiServiceModule from '@shared/api/client';

// Mock apiService
vi.mock('@shared/api/client', () => ({
  apiService: {
    getShots: vi.fn(),
    createShot: vi.fn(),
    updateShot: vi.fn(),
    deleteShot: vi.fn(),
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

describe('useShots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useShots', () => {
    it('should fetch shots successfully', async () => {
      const mockShots = [
        { id: 1, name: 'Shot 1', code: 'SH1' },
        { id: 2, name: 'Shot 2', code: 'SH2' },
      ];

      (apiServiceModule.apiService.getShots as any).mockResolvedValue(mockShots);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useShots(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockShots);
      expect(apiServiceModule.apiService.getShots).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch shots');
      (apiServiceModule.apiService.getShots as any).mockRejectedValue(error);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useShots(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should have staleTime of 0 for fresh data', () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const mockShots = [{ id: 1, name: 'Shot 1' }];
      (apiServiceModule.apiService.getShots as any).mockResolvedValue(mockShots);

      renderHook(() => useShots(), { wrapper: Wrapper });

      const query = queryClient.getQueryCache().find({ queryKey: ['shots'] });
      expect(query).toBeDefined();
    });
  });

  describe('useCreateShot', () => {
    it('should create shot and update cache optimistically', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialShots = [{ id: 1, name: 'Shot 1', code: 'SH1' }];
      queryClient.setQueryData(['shots'], initialShots);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const newShot = { id: 2, name: 'New Shot', code: 'SH2' };
      (apiServiceModule.apiService.createShot as any).mockResolvedValue(newShot);

      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const { result } = renderHook(() => useCreateShot(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ name: 'New Shot', code: 'SH2' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check that cache was updated
      const cachedData = queryClient.getQueryData(['shots']) as any[];
      expect(cachedData).toHaveLength(2);
      expect(cachedData[1]).toEqual(newShot);

      // Check that refetch was called
      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['shots'],
        type: 'active',
      });
    });

    it('should not add duplicate shots', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const existingShot = { id: 1, name: 'Shot 1', code: 'SH1' };
      queryClient.setQueryData(['shots'], [existingShot]);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.createShot as any).mockResolvedValue(existingShot);

      const { result } = renderHook(() => useCreateShot(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ name: 'Shot 1', code: 'SH1' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should not add duplicate
      const cachedData = queryClient.getQueryData(['shots']) as any[];
      expect(cachedData).toHaveLength(1);
    });

    it('should invalidate queries on error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const error = new Error('Failed to create shot');
      (apiServiceModule.apiService.createShot as any).mockRejectedValue(error);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useCreateShot(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ name: 'New Shot' }).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should invalidate queries on error
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['shots'] });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create shot:', error);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('useUpdateShot', () => {
    it('should update shot and refetch queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.updateShot as any).mockResolvedValue({
        id: 1,
        name: 'Updated Shot',
      });

      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const { result } = renderHook(() => useUpdateShot(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({
        id: 1,
        data: { name: 'Updated Shot' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.updateShot).toHaveBeenCalledWith(1, {
        name: 'Updated Shot',
      });
      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['shots'],
        type: 'active',
      });
    });

    it('should handle update error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const error = new Error('Failed to update shot');
      (apiServiceModule.apiService.updateShot as any).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateShot(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ id: 1, data: { name: 'Updated' } }).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useDeleteShot', () => {
    it('should delete shot and refetch queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.deleteShot as any).mockResolvedValue(undefined);

      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const { result } = renderHook(() => useDeleteShot(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync(1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.deleteShot).toHaveBeenCalledWith(1);
      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['shots'],
        type: 'active',
      });
    });

    it('should handle delete error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const error = new Error('Failed to delete shot');
      (apiServiceModule.apiService.deleteShot as any).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteShot(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync(1).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });
});
