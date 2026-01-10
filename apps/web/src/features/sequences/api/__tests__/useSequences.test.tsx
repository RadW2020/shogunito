import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useSequences,
  useCreateSequence,
  useUpdateSequence,
  useDeleteSequence,
} from '../useSequences';
import * as apiServiceModule from '@shared/api/client';

// Mock apiService
vi.mock('@shared/api/client', () => ({
  apiService: {
    getSequences: vi.fn(),
    createSequence: vi.fn(),
    updateSequence: vi.fn(),
    deleteSequence: vi.fn(),
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

describe('useSequences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSequences', () => {
    it('should fetch sequences successfully', async () => {
      const mockSequences = [
        { id: 1, name: 'Sequence 1', code: 'SEQ1' },
        { id: 2, name: 'Sequence 2', code: 'SEQ2' },
      ];

      (apiServiceModule.apiService.getSequences as any).mockResolvedValue(mockSequences);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSequences(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSequences);
      expect(apiServiceModule.apiService.getSequences).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch sequences');
      (apiServiceModule.apiService.getSequences as any).mockRejectedValue(error);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSequences(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useCreateSequence', () => {
    it('should create sequence and invalidate/refetch queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.createSequence as any).mockResolvedValue({
        id: 1,
        name: 'New Sequence',
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const { result } = renderHook(() => useCreateSequence(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ name: 'New Sequence', code: 'SEQ1' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.createSequence).toHaveBeenCalledWith({
        name: 'New Sequence',
        code: 'SEQ1',
      });

      // Should invalidate first
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['sequences'],
      });

      // Then refetch
      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['sequences'],
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

      const error = new Error('Failed to create sequence');
      (apiServiceModule.apiService.createSequence as any).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateSequence(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ name: 'New Sequence' }).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useUpdateSequence', () => {
    it('should update sequence and invalidate/refetch queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.updateSequence as any).mockResolvedValue({
        id: 1,
        name: 'Updated Sequence',
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const { result } = renderHook(() => useUpdateSequence(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({
        id: 1,
        data: { name: 'Updated Sequence' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.updateSequence).toHaveBeenCalledWith(1, {
        name: 'Updated Sequence',
      });

      // Should invalidate first
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['sequences'],
      });

      // Then refetch
      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['sequences'],
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

      const error = new Error('Failed to update sequence');
      (apiServiceModule.apiService.updateSequence as any).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateSequence(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ id: 1, data: { name: 'Updated' } }).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useDeleteSequence', () => {
    it('should delete sequence and invalidate/refetch queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.deleteSequence as any).mockResolvedValue(undefined);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const { result } = renderHook(() => useDeleteSequence(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync(1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.deleteSequence).toHaveBeenCalledWith(1);

      // Should invalidate first
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['sequences'],
      });

      // Then refetch
      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['sequences'],
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

      const error = new Error('Failed to delete sequence');
      (apiServiceModule.apiService.deleteSequence as any).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteSequence(), {
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
