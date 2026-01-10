import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useNotes,
  useNotesByEntity,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from '../useNotes';
import * as apiServiceModule from '@shared/api/client';

// Mock apiService
vi.mock('@shared/api/client', () => ({
  apiService: {
    getNotes: vi.fn(),
    getNotesByEntity: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
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

describe('useNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useNotes', () => {
    it('should fetch notes successfully', async () => {
      const mockNotes = [
        {
          id: 1,
          linkId: '1',
          linkType: 'Project',
          subject: 'Note 1',
          content: 'Content 1',
        },
        {
          id: 2,
          linkId: '2',
          linkType: 'Shot',
          subject: 'Note 2',
          content: 'Content 2',
        },
      ];

      (apiServiceModule.apiService.getNotes as any).mockResolvedValue(mockNotes);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockNotes);
      expect(apiServiceModule.apiService.getNotes).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch notes');
      (apiServiceModule.apiService.getNotes as any).mockRejectedValue(error);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useNotes(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useNotesByEntity', () => {
    it('should fetch notes by entity successfully', async () => {
      const mockNotes = [
        {
          id: 1,
          linkId: '1',
          linkType: 'Project',
          subject: 'Note 1',
          content: 'Content 1',
        },
      ];

      (apiServiceModule.apiService.getNotesByEntity as any).mockResolvedValue(mockNotes);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useNotesByEntity('1', 'Project'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockNotes);
      expect(apiServiceModule.apiService.getNotesByEntity).toHaveBeenCalledWith('1', 'Project');
    });

    it('should not fetch when linkId or linkType is missing', () => {
      const wrapper = createWrapper();
      renderHook(() => useNotesByEntity('', 'Project'), { wrapper });

      expect(apiServiceModule.apiService.getNotesByEntity).not.toHaveBeenCalled();
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

      const mockNotes = [{ id: 1, linkId: '1', linkType: 'Project' }];
      (apiServiceModule.apiService.getNotesByEntity as any).mockResolvedValue(mockNotes);

      renderHook(() => useNotesByEntity('1', 'Project'), { wrapper: Wrapper });

      expect(
        queryClient.getQueryCache().find({ queryKey: ['notes', '1', 'Project'] }),
      ).toBeDefined();
    });
  });

  describe('useCreateNote', () => {
    it('should create note and invalidate queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const newNote = {
        id: 1,
        linkId: '1',
        linkType: 'Project',
        subject: 'New Note',
        content: 'Content',
      };

      (apiServiceModule.apiService.createNote as any).mockResolvedValue(newNote);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateNote(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({
        linkId: '1',
        linkType: 'Project',
        subject: 'New Note',
        content: 'Content',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should invalidate all notes
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notes'] });

      // Should invalidate entity-specific notes
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['notes', '1', 'Project'],
      });
    });

    it('should only invalidate all notes if linkId/linkType missing', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const newNote = { id: 1, subject: 'New Note' };
      (apiServiceModule.apiService.createNote as any).mockResolvedValue(newNote);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateNote(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({
        subject: 'New Note',
        content: 'Content',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should only invalidate all notes
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notes'] });
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
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

      const error = new Error('Failed to create note');
      (apiServiceModule.apiService.createNote as any).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateNote(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ subject: 'New Note' }).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useUpdateNote', () => {
    it('should update note and invalidate queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const updatedNote = {
        id: 1,
        linkId: '1',
        linkType: 'Project',
        subject: 'Updated Note',
        content: 'Updated Content',
      };

      (apiServiceModule.apiService.updateNote as any).mockResolvedValue(updatedNote);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdateNote(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({
        id: 1,
        data: { subject: 'Updated Note' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should invalidate all notes
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notes'] });

      // Should invalidate entity-specific notes
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['notes', '1', 'Project'],
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

      const error = new Error('Failed to update note');
      (apiServiceModule.apiService.updateNote as any).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateNote(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ id: 1, data: { subject: 'Updated' } }).catch(() => {});

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useDeleteNote', () => {
    it('should delete note and invalidate queries', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const deletedNote = {
        id: 1,
        linkId: '1',
        linkType: 'Project',
      };

      (apiServiceModule.apiService.deleteNote as any).mockResolvedValue(deletedNote);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync(1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should invalidate all notes
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notes'] });

      // Should invalidate entity-specific notes
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['notes', '1', 'Project'],
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

      const error = new Error('Failed to delete note');
      (apiServiceModule.apiService.deleteNote as any).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteNote(), {
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
