import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@shared/api/client';

export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: () => apiService.getNotes(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useNotesByEntity(linkId: string | number, linkType: string) {
  return useQuery({
    queryKey: ['notes', String(linkId), linkType],
    queryFn: () => apiService.getNotesByEntity(String(linkId), linkType),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!linkId && !!linkType,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (note: any) => apiService.createNote(note),
    onSuccess: (_newNote, variables) => {
      // Invalidate all notes queries
      queryClient.invalidateQueries({ queryKey: ['notes'] });

      // Invalidate the specific entity's notes query
      if (variables.linkId && variables.linkType) {
        queryClient.invalidateQueries({
          queryKey: ['notes', variables.linkId, variables.linkType],
        });
      }
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiService.updateNote(id, data),
    onSuccess: (updatedNote) => {
      // Invalidate all notes queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['notes'] });

      // Invalidate the specific entity's notes query
      if (updatedNote.linkId && updatedNote.linkType) {
        queryClient.invalidateQueries({
          queryKey: ['notes', updatedNote.linkId, updatedNote.linkType],
        });
      }
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiService.deleteNote(id),
    onSuccess: (deletedNote: any) => {
      // Invalidate all notes queries
      queryClient.invalidateQueries({ queryKey: ['notes'] });

      // Invalidate the specific entity's notes query
      if (deletedNote && deletedNote.linkId && deletedNote.linkType) {
        queryClient.invalidateQueries({
          queryKey: ['notes', deletedNote.linkId, deletedNote.linkType],
        });
      }
    },
  });
}
