import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useCreateProjectOptimistic,
  useUpdateProjectOptimistic,
  useDeleteProjectOptimistic,
} from '../useProjectsOptimistic';
import * as apiServiceModule from '@shared/api/client';
import toast from 'react-hot-toast';

// Mock apiService
vi.mock('@shared/api/client', () => ({
  apiService: {
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  },
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useProjectsOptimistic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCreateProjectOptimistic', () => {
    it('should create project with optimistic update', async () => {
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

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateProjectOptimistic(), {
        wrapper: Wrapper,
      });

      result.current.mutate({ name: 'New Project', code: 'PRJ2' });

      // Wait for mutation to complete successfully
      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: 1000, interval: 10 },
      );

      // Verify API was called with correct data
      expect(apiServiceModule.apiService.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        code: 'PRJ2',
      });

      // Check invalidations
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['projects', 'paginated'],
      });

      // Check toast
      expect(toast.success).toHaveBeenCalledWith('Project created successfully');
    });

    it('should rollback on error', async () => {
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

      const error = new Error('Failed to create project');
      (apiServiceModule.apiService.createProject as any).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateProjectOptimistic(), {
        wrapper: Wrapper,
      });

      result.current.mutate({ name: 'New Project', code: 'PRJ2' });

      // Wait for error
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 1000, interval: 10 },
      );

      // Verify data was rolled back to initial state
      const data = queryClient.getQueryData(['projects']) as any[];
      expect(data).toEqual(initialProjects);

      // Verify error toast was shown
      expect(toast.error).toHaveBeenCalledWith('Failed to create project');
    });
  });

  describe('useUpdateProjectOptimistic', () => {
    it('should update project with optimistic update', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialProjects = [
        { id: 1, name: 'Project 1', code: 'PRJ1' },
        { id: 2, name: 'Project 2', code: 'PRJ2' },
      ];
      queryClient.setQueryData(['projects'], initialProjects);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const updatedProject = { id: 1, name: 'Updated Project 1', code: 'PRJ1' };
      (apiServiceModule.apiService.updateProject as any).mockResolvedValue(updatedProject);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdateProjectOptimistic(), {
        wrapper: Wrapper,
      });

      result.current.mutate({
        id: 1,
        data: { name: 'Updated Project 1' },
      });

      // Check optimistic update
      await waitFor(() => {
        const data = queryClient.getQueryData(['projects']) as any[];
        expect(data[0].name).toBe('Updated Project 1');
        expect(data[1].name).toBe('Project 2'); // Unchanged
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check invalidations
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['projects', 'paginated'],
      });

      // Check toast with dynamic message
      expect(toast.success).toHaveBeenCalledWith(
        'Project "Updated Project 1" updated successfully',
      );
    });

    it('should rollback on error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialProjects = [
        { id: 1, name: 'Project 1', code: 'PRJ1' },
        { id: 2, name: 'Project 2', code: 'PRJ2' },
      ];
      queryClient.setQueryData(['projects'], initialProjects);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const error = new Error('Failed to update project');
      (apiServiceModule.apiService.updateProject as any).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateProjectOptimistic(), {
        wrapper: Wrapper,
      });

      result.current.mutate({
        id: 1,
        data: { name: 'Updated Project 1' },
      });

      // Wait for error
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 1000, interval: 10 },
      );

      // Verify data was rolled back
      const data = queryClient.getQueryData(['projects']) as any[];
      expect(data[0].name).toBe('Project 1');
      expect(data[1].name).toBe('Project 2');

      expect(toast.error).toHaveBeenCalledWith('Failed to update project');
    });
  });

  describe('useDeleteProjectOptimistic', () => {
    it('should delete project with optimistic update', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialProjects = [
        { id: 1, name: 'Project 1', code: 'PRJ1' },
        { id: 2, name: 'Project 2', code: 'PRJ2' },
      ];
      queryClient.setQueryData(['projects'], initialProjects);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.deleteProject as any).mockResolvedValue(undefined);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeleteProjectOptimistic(), {
        wrapper: Wrapper,
      });

      result.current.mutate(1);

      // Check optimistic update - item should be removed immediately
      await waitFor(() => {
        const data = queryClient.getQueryData(['projects']) as any[];
        expect(data).toHaveLength(1);
        expect(data[0].id).toBe(2);
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check invalidations
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['projects', 'paginated'],
      });

      // Check toast
      expect(toast.success).toHaveBeenCalledWith('Project deleted successfully');
    });

    it('should rollback on error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialProjects = [
        { id: 1, name: 'Project 1', code: 'PRJ1' },
        { id: 2, name: 'Project 2', code: 'PRJ2' },
      ];
      queryClient.setQueryData(['projects'], initialProjects);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const error = new Error('Failed to delete project');
      (apiServiceModule.apiService.deleteProject as any).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteProjectOptimistic(), {
        wrapper: Wrapper,
      });

      result.current.mutate(1);

      // Wait for error
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 1000, interval: 10 },
      );

      // Verify data was rolled back
      const data = queryClient.getQueryData(['projects']) as any[];
      expect(data).toEqual(initialProjects);

      expect(toast.error).toHaveBeenCalledWith('Failed to delete project');
    });
  });
});
