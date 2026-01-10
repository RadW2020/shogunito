import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useCreateNoteOptimistic,
  useUpdateNoteOptimistic,
  useDeleteNoteOptimistic,
  useToggleNoteRead,
} from '../useNotesOptimistic';
import * as apiServiceModule from '@shared/api/client';
import toast from 'react-hot-toast';

// Mock apiService
vi.mock('@shared/api/client', () => ({
  apiService: {
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
  },
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useNotesOptimistic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCreateNoteOptimistic', () => {
    it('should create note with optimistic update', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialNotes = [
        {
          id: 1,
          linkId: '1',
          linkType: 'Project',
          subject: 'Note 1',
          content: 'Content 1',
        },
      ];
      queryClient.setQueryData(['notes'], initialNotes);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const newNote = {
        id: 2,
        linkId: '1',
        linkType: 'Project',
        subject: 'New Note',
        content: 'New Content',
      };
      (apiServiceModule.apiService.createNote as any).mockResolvedValue(newNote);

      const { result } = renderHook(() => useCreateNoteOptimistic(), {
        wrapper: Wrapper,
      });

      result.current.mutate({
        linkId: '1',
        linkType: 'Project',
        subject: 'New Note',
        content: 'New Content',
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check toast
      expect(toast.success).toHaveBeenCalledWith('Note added successfully');
    });

    it('should rollback on error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialNotes = [
        {
          id: 1,
          linkId: '1',
          linkType: 'Project',
          subject: 'Note 1',
        },
      ];
      queryClient.setQueryData(['notes'], initialNotes);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const error = new Error('Failed to create note');
      (apiServiceModule.apiService.createNote as any).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateNoteOptimistic(), {
        wrapper: Wrapper,
      });

      result.current.mutate({
        linkId: '1',
        linkType: 'Project',
        subject: 'New Note',
      });

      // Wait for error
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 1000, interval: 10 },
      );

      // Verify rollback
      const data = queryClient.getQueryData(['notes']) as any[];
      expect(data).toEqual(initialNotes);

      expect(toast.error).toHaveBeenCalledWith('Failed to add note');
    });
  });

  describe('useUpdateNoteOptimistic', () => {
    it('should update note with optimistic update', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialNotes = [
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
      queryClient.setQueryData(['notes'], initialNotes);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const updatedNote = {
        id: 1,
        linkId: '1',
        linkType: 'Project',
        subject: 'Updated Note 1',
        content: 'Updated Content 1',
      };
      (apiServiceModule.apiService.updateNote as any).mockResolvedValue(updatedNote);

      const { result } = renderHook(() => useUpdateNoteOptimistic(), {
        wrapper: Wrapper,
      });

      result.current.mutate({
        id: 1,
        data: { subject: 'Updated Note 1' },
      });

      // Check optimistic update
      await waitFor(() => {
        const data = queryClient.getQueryData(['notes']) as any[];
        expect(data[0].subject).toBe('Updated Note 1');
        expect(data[1].subject).toBe('Note 2'); // Unchanged
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check toast
      expect(toast.success).toHaveBeenCalledWith('Note updated successfully');
    });

    it('should rollback on error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialNotes = [
        {
          id: 1,
          linkId: '1',
          linkType: 'Project',
          subject: 'Note 1',
        },
      ];
      queryClient.setQueryData(['notes'], initialNotes);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const error = new Error('Failed to update note');
      (apiServiceModule.apiService.updateNote as any).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateNoteOptimistic(), {
        wrapper: Wrapper,
      });

      result.current.mutate({
        id: 1,
        data: { subject: 'Updated Note 1' },
      });

      // Wait for error
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 1000, interval: 10 },
      );

      // Verify rollback
      const data = queryClient.getQueryData(['notes']) as any[];
      expect(data[0].subject).toBe('Note 1');

      expect(toast.error).toHaveBeenCalledWith('Failed to update note');
    });
  });

  describe('useDeleteNoteOptimistic', () => {
    it('should delete note with optimistic update', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialNotes = [
        {
          id: 1,
          linkId: '1',
          linkType: 'Project',
          subject: 'Note 1',
        },
        {
          id: 2,
          linkId: '2',
          linkType: 'Shot',
          subject: 'Note 2',
        },
      ];
      queryClient.setQueryData(['notes'], initialNotes);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      (apiServiceModule.apiService.deleteNote as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteNoteOptimistic(), {
        wrapper: Wrapper,
      });

      result.current.mutate(1);

      // Check optimistic update - item should be removed immediately
      await waitFor(() => {
        const data = queryClient.getQueryData(['notes']) as any[];
        expect(data).toHaveLength(1);
        expect(data[0].id).toBe(2);
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check toast
      expect(toast.success).toHaveBeenCalledWith('Note deleted successfully');
    });

    it('should rollback on error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialNotes = [
        {
          id: 1,
          linkId: '1',
          linkType: 'Project',
          subject: 'Note 1',
        },
        {
          id: 2,
          linkId: '2',
          linkType: 'Shot',
          subject: 'Note 2',
        },
      ];
      queryClient.setQueryData(['notes'], initialNotes);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const error = new Error('Failed to delete note');
      (apiServiceModule.apiService.deleteNote as any).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteNoteOptimistic(), {
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

      // Verify rollback
      const data = queryClient.getQueryData(['notes']) as any[];
      expect(data).toEqual(initialNotes);

      expect(toast.error).toHaveBeenCalledWith('Failed to delete note');
    });
  });

  describe('useToggleNoteRead', () => {
    it('should toggle read status with optimistic update', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialNotes = [
        {
          id: 1,
          linkId: '1',
          linkType: 'Project',
          subject: 'Note 1',
          isRead: false,
        },
      ];
      queryClient.setQueryData(['notes'], initialNotes);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const updatedNote = {
        id: 1,
        linkId: '1',
        linkType: 'Project',
        subject: 'Note 1',
        isRead: true,
      };
      (apiServiceModule.apiService.updateNote as any).mockResolvedValue(updatedNote);

      const { result } = renderHook(() => useToggleNoteRead(), {
        wrapper: Wrapper,
      });

      result.current.mutate({ id: 1, isRead: true });

      // Check optimistic update
      await waitFor(() => {
        const data = queryClient.getQueryData(['notes']) as any[];
        expect(data[0].isRead).toBe(true);
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should not show toast (showToast: false)
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should handle toggle error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const initialNotes = [
        {
          id: 1,
          linkId: '1',
          linkType: 'Project',
          subject: 'Note 1',
          isRead: false,
        },
      ];
      queryClient.setQueryData(['notes'], initialNotes);

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const error = new Error('Failed to update note status');
      (apiServiceModule.apiService.updateNote as any).mockRejectedValue(error);

      const { result } = renderHook(() => useToggleNoteRead(), {
        wrapper: Wrapper,
      });

      result.current.mutate({ id: 1, isRead: true });

      // Wait for error
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 1000, interval: 10 },
      );

      // Verify rollback
      const data = queryClient.getQueryData(['notes']) as any[];
      expect(data[0].isRead).toBe(false);
    });
  });
});
