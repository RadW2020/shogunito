import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../useProjects';
import * as apiServiceModule from '@shared/api/client';

// Mock apiService
vi.mock('@shared/api/client', () => ({
  apiService: {
    getProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
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

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useProjects', () => {
    it('should fetch projects successfully', async () => {
      const mockProjects = [
        { id: 1, name: 'Project 1', code: 'PRJ1' },
        { id: 2, name: 'Project 2', code: 'PRJ2' },
      ];

      (apiServiceModule.apiService.getProjects as any).mockResolvedValue(mockProjects);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useProjects(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProjects);
      expect(apiServiceModule.apiService.getProjects).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch projects');
      (apiServiceModule.apiService.getProjects as any).mockRejectedValue(error);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useProjects(), { wrapper });

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

      const mockProjects = [{ id: 1, name: 'Project 1' }];
      (apiServiceModule.apiService.getProjects as any).mockResolvedValue(mockProjects);

      renderHook(() => useProjects(), { wrapper: Wrapper });

      expect(queryClient.getQueryCache().find({ queryKey: ['projects'] })).toBeDefined();
    });
  });

  describe('useCreateProject', () => {
    it('should create project and update cache optimistically', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialProjects = [{ id: 1, name: 'Project 1', code: 'PRJ1' }];
      queryClient.setQueryData(['projects'], initialProjects);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const newProject = { id: 2, name: 'New Project', code: 'PRJ2' };
      (apiServiceModule.apiService.createProject as any).mockResolvedValue(newProject);

      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ name: 'New Project', code: 'PRJ2' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check that cache was updated
      const cachedData = queryClient.getQueryData(['projects']) as any[];
      expect(cachedData).toHaveLength(2);
      expect(cachedData[1]).toEqual(newProject);

      // Check that refetch was called
      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['projects'],
        type: 'active',
      });
    });

    it('should not add duplicate projects', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const existingProject = { id: 1, name: 'Project 1', code: 'PRJ1' };
      queryClient.setQueryData(['projects'], [existingProject]);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.createProject as any).mockResolvedValue(existingProject);

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ name: 'Project 1', code: 'PRJ1' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should not add duplicate
      const cachedData = queryClient.getQueryData(['projects']) as any[];
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

      const error = new Error('Failed to create project');
      (apiServiceModule.apiService.createProject as any).mockRejectedValue(error);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ name: 'New Project' }).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should invalidate queries on error
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create project:', error);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('useUpdateProject', () => {
    it('should update project and refetch queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.updateProject as any).mockResolvedValue({
        id: 1,
        name: 'Updated Project',
      });

      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({
        id: 1,
        projectData: { name: 'Updated Project' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.updateProject).toHaveBeenCalledWith(1, {
        name: 'Updated Project',
      });
      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['projects'],
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

      const error = new Error('Failed to update project');
      (apiServiceModule.apiService.updateProject as any).mockRejectedValue(error);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ id: 1, projectData: { name: 'Updated' } }).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update project:', error);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('useDeleteProject', () => {
    it('should delete project and refetch queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.deleteProject as any).mockResolvedValue(undefined);

      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync(1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiServiceModule.apiService.deleteProject).toHaveBeenCalledWith(1);
      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['projects'],
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

      const error = new Error('Failed to delete project');
      (apiServiceModule.apiService.deleteProject as any).mockRejectedValue(error);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync(1).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to delete project:', error);

      consoleErrorSpy.mockRestore();
    });
  });
});
