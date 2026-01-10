import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useVersions,
  useVersion,
  useCreateVersion,
  useUpdateVersion,
  useDeleteVersion,
  useUploadThumbnail,
  useUploadVersionFile,
} from '../useVersions';
import * as apiServiceModule from '@shared/api/client';

// Mock apiService
vi.mock('@shared/api/client', () => ({
  apiService: {
    getVersions: vi.fn(),
    getVersion: vi.fn(),
    createVersion: vi.fn(),
    updateVersion: vi.fn(),
    deleteVersion: vi.fn(),
    uploadThumbnail: vi.fn(),
    uploadVersionFile: vi.fn(),
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

describe('useVersions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useVersions', () => {
    it('should fetch versions successfully', async () => {
      const mockVersions = [
        { id: 1, code: 'V001', shotId: 1 },
        { id: 2, code: 'V002', shotId: 1 },
      ];

      (apiServiceModule.apiService.getVersions as any).mockResolvedValue(mockVersions);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useVersions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockVersions);
      expect(apiServiceModule.apiService.getVersions).toHaveBeenCalledWith(undefined);
    });

    it('should fetch versions with shotId filter', async () => {
      const mockVersions = [{ id: 1, code: 'V001', shotId: 1 }];

      (apiServiceModule.apiService.getVersions as any).mockResolvedValue(mockVersions);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useVersions(1), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.getVersions).toHaveBeenCalledWith(1);
    });

    it('should use correct query key with shotId', () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const mockVersions = [{ id: 1, code: 'V001' }];
      (apiServiceModule.apiService.getVersions as any).mockResolvedValue(mockVersions);

      renderHook(() => useVersions(1), { wrapper: Wrapper });

      expect(
        queryClient.getQueryCache().find({ queryKey: ['versions', { shotId: 1 }] }),
      ).toBeDefined();
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch versions');
      (apiServiceModule.apiService.getVersions as any).mockRejectedValue(error);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useVersions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useVersion', () => {
    it('should fetch single version successfully', async () => {
      const mockVersion = { id: 1, code: 'V001', shotId: 1 };

      (apiServiceModule.apiService.getVersion as any).mockResolvedValue(mockVersion);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useVersion(1), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockVersion);
      expect(apiServiceModule.apiService.getVersion).toHaveBeenCalledWith(1);
    });

    it('should not fetch when id is falsy', () => {
      const wrapper = createWrapper();
      renderHook(() => useVersion(0), { wrapper });

      expect(apiServiceModule.apiService.getVersion).not.toHaveBeenCalled();
    });
  });

  describe('useCreateVersion', () => {
    it('should create version and invalidate queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.createVersion as any).mockResolvedValue({
        id: 1,
        code: 'V001',
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateVersion(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ code: 'V001', shotId: 1 });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.createVersion).toHaveBeenCalledWith({
        code: 'V001',
        shotId: 1,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['versions'] });
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

      const error = new Error('Failed to create version');
      (apiServiceModule.apiService.createVersion as any).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateVersion(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ code: 'V001' }).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useUpdateVersion', () => {
    it('should update version and invalidate queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.updateVersion as any).mockResolvedValue({
        id: 1,
        code: 'V001',
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdateVersion(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({
        id: 1,
        data: { code: 'V001_UPDATED' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.updateVersion).toHaveBeenCalledWith(1, {
        code: 'V001_UPDATED',
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['versions'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['versions', 1] });
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

      const error = new Error('Failed to update version');
      (apiServiceModule.apiService.updateVersion as any).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateVersion(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ id: 1, data: { code: 'V001_UPDATED' } }).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useDeleteVersion', () => {
    it('should delete version and invalidate queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.deleteVersion as any).mockResolvedValue(undefined);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeleteVersion(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync(1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.deleteVersion).toHaveBeenCalledWith(1);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['versions'] });
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

      const error = new Error('Failed to delete version');
      (apiServiceModule.apiService.deleteVersion as any).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteVersion(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync(1).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useUploadThumbnail', () => {
    it('should upload thumbnail and invalidate queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const file = new File(['content'], 'thumb.jpg', { type: 'image/jpeg' });
      (apiServiceModule.apiService.uploadThumbnail as any).mockResolvedValue({
        id: 1,
        thumbnailUrl: 'http://example.com/thumb.jpg',
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUploadThumbnail(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ versionId: 1, file });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.uploadThumbnail).toHaveBeenCalledWith(1, file);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['versions'] });
    });
  });

  describe('useUploadVersionFile', () => {
    it('should upload version file and invalidate queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const file = new File(['content'], 'version.mov', {
        type: 'video/quicktime',
      });
      (apiServiceModule.apiService.uploadVersionFile as any).mockResolvedValue({
        id: 1,
        fileUrl: 'http://example.com/version.mov',
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUploadVersionFile(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ versionId: 1, file });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.uploadVersionFile).toHaveBeenCalledWith(1, file);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['versions'] });
    });
  });
});
