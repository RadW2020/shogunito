import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useAssets,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useUploadAssetThumbnail,
} from '../useAssets';
import * as apiServiceModule from '@shared/api/client';

// Mock apiService
vi.mock('@shared/api/client', () => ({
  apiService: {
    getAssets: vi.fn(),
    createAsset: vi.fn(),
    updateAsset: vi.fn(),
    deleteAsset: vi.fn(),
    uploadAssetThumbnail: vi.fn(),
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

describe('useAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAssets', () => {
    it('should fetch assets successfully', async () => {
      const mockAssets = [
        { id: 1, name: 'Asset 1', code: 'AST1' },
        { id: 2, name: 'Asset 2', code: 'AST2' },
      ];

      (apiServiceModule.apiService.getAssets as any).mockResolvedValue(mockAssets);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAssets(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockAssets);
      expect(apiServiceModule.apiService.getAssets).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch assets');
      (apiServiceModule.apiService.getAssets as any).mockRejectedValue(error);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAssets(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useCreateAsset', () => {
    it('should create asset and refetch queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.createAsset as any).mockResolvedValue({
        id: 1,
        name: 'New Asset',
      });

      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const { result } = renderHook(() => useCreateAsset(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ name: 'New Asset', code: 'AST1' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.createAsset).toHaveBeenCalledWith({
        name: 'New Asset',
        code: 'AST1',
      });
      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['assets'],
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

      const error = new Error('Failed to create asset');
      (apiServiceModule.apiService.createAsset as any).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateAsset(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ name: 'New Asset' }).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useUpdateAsset', () => {
    it('should update asset and refetch queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.updateAsset as any).mockResolvedValue({
        id: 1,
        name: 'Updated Asset',
      });

      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const { result } = renderHook(() => useUpdateAsset(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({
        id: 1,
        data: { name: 'Updated Asset' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.updateAsset).toHaveBeenCalledWith(1, {
        name: 'Updated Asset',
      });
      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['assets'],
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

      const error = new Error('Failed to update asset');
      (apiServiceModule.apiService.updateAsset as any).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateAsset(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ id: 1, data: { name: 'Updated' } }).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useDeleteAsset', () => {
    it('should delete asset and refetch queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.deleteAsset as any).mockResolvedValue(undefined);

      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const { result } = renderHook(() => useDeleteAsset(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync(1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.deleteAsset).toHaveBeenCalledWith(1);
      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['assets'],
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

      const error = new Error('Failed to delete asset');
      (apiServiceModule.apiService.deleteAsset as any).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteAsset(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync(1).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useUploadAssetThumbnail', () => {
    it('should upload thumbnail and refetch queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const file = new File(['content'], 'thumbnail.jpg', {
        type: 'image/jpeg',
      });
      (apiServiceModule.apiService.uploadAssetThumbnail as any).mockResolvedValue({
        id: 1,
        thumbnailUrl: 'http://example.com/thumb.jpg',
      });

      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const { result } = renderHook(() => useUploadAssetThumbnail(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ assetId: 1, file });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.uploadAssetThumbnail).toHaveBeenCalledWith(1, file);
      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['assets'],
        type: 'active',
      });
    });

    it('should handle upload error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const error = new Error('Failed to upload thumbnail');
      (apiServiceModule.apiService.uploadAssetThumbnail as any).mockRejectedValue(error);

      const { result } = renderHook(() => useUploadAssetThumbnail(), {
        wrapper: Wrapper,
      });

      const file = new File(['content'], 'thumbnail.jpg', {
        type: 'image/jpeg',
      });
      await result.current.mutateAsync({ assetId: 1, file }).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });
});
