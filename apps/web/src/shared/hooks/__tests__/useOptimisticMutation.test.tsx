import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useOptimisticMutation,
  useOptimisticCreate,
  useOptimisticUpdate,
  useOptimisticDelete,
  useManualOptimisticUpdate,
} from '../useOptimisticMutation';
import toast from 'react-hot-toast';

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
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

describe('useOptimisticMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should execute mutation without optimistic update', async () => {
      const wrapper = createWrapper();
      const mockMutationFn = vi.fn().mockResolvedValue({ id: 1, name: 'Test' });

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn: mockMutationFn,
          }),
        { wrapper },
      );

      await result.current.mutateAsync({ name: 'Test' });

      expect(mockMutationFn).toHaveBeenCalledWith({ name: 'Test' });

      // Wait for success state to be set
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle mutation errors', async () => {
      const wrapper = createWrapper();
      const mockMutationFn = vi.fn().mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn: mockMutationFn,
          }),
        { wrapper },
      );

      await expect(result.current.mutateAsync({})).rejects.toThrow('API Error');

      // Wait for error state to be set
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Optimistic updates', () => {
    it('should update query data optimistically', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Set initial data
      queryClient.setQueryData(['items'], [{ id: 1, name: 'Item 1' }]);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const mockMutationFn = vi.fn().mockResolvedValue({ id: 2, name: 'Item 2' });

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn: mockMutationFn,
            optimistic: {
              queryKey: ['items'],
              updateFn: (oldData, variables: any) => [
                ...(oldData || []),
                { id: 2, name: variables.name },
              ],
            },
          }),
        { wrapper: Wrapper },
      );

      // Check initial data
      expect(queryClient.getQueryData(['items'])).toEqual([{ id: 1, name: 'Item 1' }]);

      // Trigger mutation
      result.current.mutate({ name: 'Item 2' });

      // Wait for optimistic update - need to wait a bit for the async update
      await waitFor(
        () => {
          const data = queryClient.getQueryData(['items']);
          expect(data).toHaveLength(2);
          expect((data as any[])[1]).toMatchObject({ id: 2, name: 'Item 2' });
        },
        { timeout: 2000 },
      );

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should rollback on error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialData = [{ id: 1, name: 'Item 1' }];
      queryClient.setQueryData(['items'], initialData);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // Use a promise that we can control to ensure optimistic update happens first
      let rejectMutation: (error: Error) => void;
      const mutationPromise = new Promise((_, reject) => {
        rejectMutation = reject;
      });

      const mockMutationFn = vi.fn(() => mutationPromise);

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn: mockMutationFn,
            optimistic: {
              queryKey: ['items'],
              updateFn: (oldData, variables: any) => [
                ...(oldData || []),
                { id: 2, name: variables.name },
              ],
              errorMessage: 'Failed to create item',
            },
          }),
        { wrapper: Wrapper },
      );

      // Trigger mutation
      result.current.mutate({ name: 'Item 2' });

      // Wait for optimistic update to be applied
      await waitFor(
        () => {
          const data = queryClient.getQueryData(['items']);
          expect(data).toHaveLength(2);
        },
        { timeout: 2000 },
      );

      // Now reject the mutation to trigger rollback
      rejectMutation!(new Error('API Error'));

      // Wait for error and rollback
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
          const data = queryClient.getQueryData(['items']);
          expect(data).toEqual(initialData); // Should be rolled back
        },
        { timeout: 2000 },
      );

      expect(toast.error).toHaveBeenCalledWith('Failed to create item');
    });

    it('should show success toast', async () => {
      const wrapper = createWrapper();
      const mockMutationFn = vi.fn().mockResolvedValue({ id: 1, name: 'Test' });

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn: mockMutationFn,
            optimistic: {
              queryKey: ['items'],
              updateFn: (oldData) => oldData || [],
              successMessage: 'Item created successfully',
            },
          }),
        { wrapper },
      );

      await result.current.mutateAsync({ name: 'Test' });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Item created successfully');
      });
    });

    it('should not show toast when showToast is false', async () => {
      const wrapper = createWrapper();
      const mockMutationFn = vi.fn().mockResolvedValue({ id: 1, name: 'Test' });

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn: mockMutationFn,
            optimistic: {
              queryKey: ['items'],
              updateFn: (oldData) => oldData || [],
              successMessage: 'Item created',
              showToast: false,
            },
          }),
        { wrapper },
      );

      await result.current.mutateAsync({ name: 'Test' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).not.toHaveBeenCalled();
    });

    it('should invalidate additional query keys', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const mockMutationFn = vi.fn().mockResolvedValue({ id: 1 });

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn: mockMutationFn,
            optimistic: {
              queryKey: ['items'],
              updateFn: (oldData) => oldData || [],
              invalidateKeys: [['projects'], ['episodes']],
            },
          }),
        { wrapper: Wrapper },
      );

      await result.current.mutateAsync({});

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['items'] });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['episodes'] });
      });
    });
  });

  describe('useOptimisticCreate', () => {
    it('should create item with temporary ID', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialData = [{ id: 1, name: 'Item 1' }];
      queryClient.setQueryData(['items'], initialData);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const mockMutationFn = vi.fn().mockResolvedValue({ id: 2, name: 'Item 2' });

      const { result } = renderHook(
        () =>
          useOptimisticCreate({
            mutationFn: mockMutationFn,
            queryKey: ['items'],
            successMessage: 'Item created',
          }),
        { wrapper: Wrapper },
      );

      result.current.mutate({ name: 'Item 2' });

      // Check optimistic update with temp ID
      await waitFor(() => {
        const data = queryClient.getQueryData(['items']) as any[];
        expect(data).toHaveLength(2);
        expect(data[1].id).toBeLessThan(0); // Temp ID should be negative
        expect(data[1].name).toBe('Item 2');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useOptimisticUpdate', () => {
    it('should update existing item', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];
      queryClient.setQueryData(['items'], initialData);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const mockMutationFn = vi.fn().mockResolvedValue({ id: 1, name: 'Updated Item 1' });

      const { result } = renderHook(
        () =>
          useOptimisticUpdate({
            mutationFn: mockMutationFn,
            queryKey: ['items'],
            successMessage: 'Item updated',
          }),
        { wrapper: Wrapper },
      );

      result.current.mutate({ id: 1, data: { name: 'Updated Item 1' } });

      // Check optimistic update
      await waitFor(() => {
        const data = queryClient.getQueryData(['items']) as any[];
        expect(data[0].name).toBe('Updated Item 1');
        expect(data[1].name).toBe('Item 2'); // Unchanged
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useOptimisticDelete', () => {
    it('should delete item from list', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];
      queryClient.setQueryData(['items'], initialData);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const mockMutationFn = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(
        () =>
          useOptimisticDelete({
            mutationFn: mockMutationFn,
            queryKey: ['items'],
            successMessage: 'Item deleted',
          }),
        { wrapper: Wrapper },
      );

      result.current.mutate(1);

      // Check optimistic update
      await waitFor(() => {
        const data = queryClient.getQueryData(['items']) as any[];
        expect(data).toHaveLength(1);
        expect(data[0].id).toBe(2);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useManualOptimisticUpdate', () => {
    it('should allow manual optimistic updates', () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      queryClient.setQueryData(['items'], [{ id: 1, name: 'Item 1' }]);

      const { result } = renderHook(() => useManualOptimisticUpdate(), {
        wrapper: Wrapper,
      });

      const rollback = result.current.setOptimisticData(['items'], (old: any) => [
        ...old,
        { id: 2, name: 'Item 2' },
      ]);

      // Check update
      const data = queryClient.getQueryData(['items']) as any[];
      expect(data).toHaveLength(2);

      // Rollback
      rollback();
      const rolledBackData = queryClient.getQueryData(['items']) as any[];
      expect(rolledBackData).toHaveLength(1);
    });

    it('should invalidate queries', () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useManualOptimisticUpdate(), {
        wrapper: Wrapper,
      });

      result.current.invalidateQueries(['items']);

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['items'] });
    });
  });

  describe('Custom callbacks', () => {
    it('should call original onMutate', async () => {
      const wrapper = createWrapper();
      const mockMutationFn = vi.fn().mockResolvedValue({ id: 1 });
      const onMutate = vi.fn().mockResolvedValue({ custom: 'context' });

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn: mockMutationFn,
            onMutate,
            optimistic: {
              queryKey: ['items'],
              updateFn: (oldData) => oldData || [],
            },
          }),
        { wrapper },
      );

      await result.current.mutateAsync({});

      expect(onMutate).toHaveBeenCalled();
    });

    it('should call original onSuccess', async () => {
      const wrapper = createWrapper();
      const mockMutationFn = vi.fn().mockResolvedValue({ id: 1 });
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn: mockMutationFn,
            onSuccess,
            optimistic: {
              queryKey: ['items'],
              updateFn: (oldData) => oldData || [],
            },
          }),
        { wrapper },
      );

      await result.current.mutateAsync({});

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should call original onError', async () => {
      const mockMutationFn = vi.fn().mockRejectedValue(new Error('API Error'));
      const onError = vi.fn();
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(
        () =>
          useOptimisticMutation({
            mutationFn: mockMutationFn,
            onError,
            optimistic: {
              queryKey: ['items'],
              updateFn: (oldData) => oldData || [],
              errorMessage: 'Failed',
            },
          }),
        { wrapper: Wrapper },
      );

      result.current.mutate({});

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });
});
