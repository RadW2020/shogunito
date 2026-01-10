import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useEpisodes,
  useEpisode,
  useCreateEpisode,
  useUpdateEpisode,
  useDeleteEpisode,
} from '../useEpisodes';
import * as apiServiceModule from '@shared/api/client';

// Mock apiService
vi.mock('@shared/api/client', () => ({
  apiService: {
    getEpisodes: vi.fn(),
    getEpisode: vi.fn(),
    createEpisode: vi.fn(),
    updateEpisode: vi.fn(),
    deleteEpisode: vi.fn(),
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

describe('useEpisodes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useEpisodes', () => {
    it('should fetch episodes successfully', async () => {
      const mockEpisodes = [
        { id: 1, name: 'Episode 1', code: 'EP1' },
        { id: 2, name: 'Episode 2', code: 'EP2' },
      ];

      (apiServiceModule.apiService.getEpisodes as any).mockResolvedValue(mockEpisodes);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useEpisodes(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEpisodes);
      expect(apiServiceModule.apiService.getEpisodes).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch episodes');
      (apiServiceModule.apiService.getEpisodes as any).mockRejectedValue(error);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useEpisodes(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
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

      const mockEpisodes = [{ id: 1, name: 'Episode 1' }];
      (apiServiceModule.apiService.getEpisodes as any).mockResolvedValue(mockEpisodes);

      renderHook(() => useEpisodes(), { wrapper: Wrapper });

      expect(queryClient.getQueryCache().find({ queryKey: ['episodes'] })).toBeDefined();
    });
  });

  describe('useEpisode', () => {
    it('should fetch single episode successfully', async () => {
      const mockEpisode = { id: 1, name: 'Episode 1', code: 'EP1' };

      (apiServiceModule.apiService.getEpisode as any).mockResolvedValue(mockEpisode);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useEpisode(1), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEpisode);
      expect(apiServiceModule.apiService.getEpisode).toHaveBeenCalledWith(1);
    });

    it('should not fetch when id is falsy', () => {
      const wrapper = createWrapper();
      renderHook(() => useEpisode(0), { wrapper });

      expect(apiServiceModule.apiService.getEpisode).not.toHaveBeenCalled();
    });

    it('should use correct query key with id', () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const mockEpisode = { id: 1, name: 'Episode 1' };
      (apiServiceModule.apiService.getEpisode as any).mockResolvedValue(mockEpisode);

      renderHook(() => useEpisode(1), { wrapper: Wrapper });

      expect(queryClient.getQueryCache().find({ queryKey: ['episodes', 1] })).toBeDefined();
    });
  });

  describe('useCreateEpisode', () => {
    it('should create episode and refetch queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.createEpisode as any).mockResolvedValue({
        id: 1,
        name: 'New Episode',
      });

      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const { result } = renderHook(() => useCreateEpisode(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ name: 'New Episode', code: 'EP1' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.createEpisode).toHaveBeenCalledWith({
        name: 'New Episode',
        code: 'EP1',
      });
      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['episodes'],
        type: 'active',
      });
    });

    it('should handle create error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const error = new Error('Failed to create episode');
      (apiServiceModule.apiService.createEpisode as any).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateEpisode(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ name: 'New Episode' }).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useUpdateEpisode', () => {
    it('should update episode and refetch queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.updateEpisode as any).mockResolvedValue({
        id: 1,
        name: 'Updated Episode',
      });

      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const { result } = renderHook(() => useUpdateEpisode(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({
        id: 1,
        data: { name: 'Updated Episode' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.updateEpisode).toHaveBeenCalledWith(1, {
        name: 'Updated Episode',
      });
      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['episodes'],
        type: 'active',
      });
      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['episodes', 1],
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

      const error = new Error('Failed to update episode');
      (apiServiceModule.apiService.updateEpisode as any).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateEpisode(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ id: 1, data: { name: 'Updated' } }).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useDeleteEpisode', () => {
    it('should delete episode and refetch queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.deleteEpisode as any).mockResolvedValue(undefined);

      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const { result } = renderHook(() => useDeleteEpisode(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync(1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.deleteEpisode).toHaveBeenCalledWith(1);
      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['episodes'],
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

      const error = new Error('Failed to delete episode');
      (apiServiceModule.apiService.deleteEpisode as any).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteEpisode(), {
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
