import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  usePlaylists,
  useCreatePlaylist,
  useUpdatePlaylist,
  useDeletePlaylist,
  useCreatePlaylistFromVersions,
  useReorderPlaylistVersions,
} from '../usePlaylists';
import * as apiServiceModule from '@shared/api/client';

// Mock apiService
vi.mock('@shared/api/client', () => ({
  apiService: {
    getPlaylists: vi.fn(),
    createPlaylist: vi.fn(),
    updatePlaylist: vi.fn(),
    deletePlaylist: vi.fn(),
    createPlaylistFromVersions: vi.fn(),
    reorderPlaylistVersions: vi.fn(),
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

describe('usePlaylists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('usePlaylists', () => {
    it('should fetch playlists successfully', async () => {
      const mockPlaylists = [
        { id: 1, name: 'Playlist 1', code: 'PL1' },
        { id: 2, name: 'Playlist 2', code: 'PL2' },
      ];

      (apiServiceModule.apiService.getPlaylists as any).mockResolvedValue(mockPlaylists);

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePlaylists(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPlaylists);
      expect(apiServiceModule.apiService.getPlaylists).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch playlists');
      (apiServiceModule.apiService.getPlaylists as any).mockRejectedValue(error);

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePlaylists(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useCreatePlaylist', () => {
    it('should create playlist and invalidate queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.createPlaylist as any).mockResolvedValue({
        id: 1,
        name: 'New Playlist',
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreatePlaylist(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ name: 'New Playlist', code: 'PL1' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.createPlaylist).toHaveBeenCalledWith({
        name: 'New Playlist',
        code: 'PL1',
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playlists'] });
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

      const error = new Error('Failed to create playlist');
      (apiServiceModule.apiService.createPlaylist as any).mockRejectedValue(error);

      const { result } = renderHook(() => useCreatePlaylist(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ name: 'New Playlist' }).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useUpdatePlaylist', () => {
    it('should update playlist and invalidate queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.updatePlaylist as any).mockResolvedValue({
        id: 1,
        name: 'Updated Playlist',
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdatePlaylist(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({
        id: 1,
        data: { name: 'Updated Playlist' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.updatePlaylist).toHaveBeenCalledWith(1, {
        name: 'Updated Playlist',
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playlists'] });
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

      const error = new Error('Failed to update playlist');
      (apiServiceModule.apiService.updatePlaylist as any).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdatePlaylist(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ id: 1, data: { name: 'Updated' } }).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useDeletePlaylist', () => {
    it('should delete playlist and invalidate queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.deletePlaylist as any).mockResolvedValue(undefined);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeletePlaylist(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync(1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.deletePlaylist).toHaveBeenCalledWith(1);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playlists'] });
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

      const error = new Error('Failed to delete playlist');
      (apiServiceModule.apiService.deletePlaylist as any).mockRejectedValue(error);

      const { result } = renderHook(() => useDeletePlaylist(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync(1).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useCreatePlaylistFromVersions', () => {
    it('should create playlist from versions and invalidate queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.createPlaylistFromVersions as any).mockResolvedValue({
        id: 1,
        name: 'New Playlist',
        code: 'PL1',
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreatePlaylistFromVersions(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({
        code: 'PL1',
        name: 'New Playlist',
        projectId: 1,
        versionCodes: ['V001', 'V002'],
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.createPlaylistFromVersions).toHaveBeenCalledWith({
        code: 'PL1',
        name: 'New Playlist',
        projectId: 1,
        versionCodes: ['V001', 'V002'],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playlists'] });
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

      const error = new Error('Failed to create playlist from versions');
      (apiServiceModule.apiService.createPlaylistFromVersions as any).mockRejectedValue(error);

      const { result } = renderHook(() => useCreatePlaylistFromVersions(), {
        wrapper: Wrapper,
      });

      await result.current
        .mutateAsync({
          code: 'PL1',
          name: 'New Playlist',
          projectId: 1,
          versionCodes: ['V001'],
        })
        .catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useReorderPlaylistVersions', () => {
    it('should reorder playlist versions and invalidate queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.reorderPlaylistVersions as any).mockResolvedValue(undefined);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useReorderPlaylistVersions(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({
        playlistId: 1,
        versionCodes: ['V002', 'V001', 'V003'],
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.reorderPlaylistVersions).toHaveBeenCalledWith(1, [
        'V002',
        'V001',
        'V003',
      ]);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playlists'] });
    });

    it('should handle reorder error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const error = new Error('Failed to reorder playlist versions');
      (apiServiceModule.apiService.reorderPlaylistVersions as any).mockRejectedValue(error);

      const { result } = renderHook(() => useReorderPlaylistVersions(), {
        wrapper: Wrapper,
      });

      await result.current
        .mutateAsync({
          playlistId: 1,
          versionCodes: ['V002', 'V001'],
        })
        .catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });
});
