import { apiService, type Note } from '@shared/api/client';
import {
  useOptimisticCreate,
  useOptimisticUpdate,
  useOptimisticDelete,
} from '@shared/hooks/useOptimisticMutation';

/**
 * Optimistic create note hook
 *
 * @example
 * ```tsx
 * const createNote = useCreateNoteOptimistic();
 *
 * <button onClick={() => createNote.mutate({
 *   linkId: shot.id,
 *   linkType: 'Shot',
 *   subject: 'Review',
 *   content: 'Looks great!',
 *   noteType: 'note'
 * })}>
 *   Add Note
 * </button>
 * ```
 */
export function useCreateNoteOptimistic() {
  return useOptimisticCreate<Note, Partial<Note>>({
    mutationFn: (noteData) => apiService.createNote(noteData),
    queryKey: ['notes'],
    successMessage: 'Note added successfully',
    errorMessage: 'Failed to add note',
  });
}

/**
 * Optimistic update note hook
 *
 * @example
 * ```tsx
 * const updateNote = useUpdateNoteOptimistic();
 *
 * <button onClick={() => updateNote.mutate({
 *   id: note.id,
 *   data: { subject: 'Updated Subject' }
 * })}>
 *   Update Note
 * </button>
 * ```
 */
export function useUpdateNoteOptimistic() {
  return useOptimisticUpdate<Note, { id: number; data: Partial<Note> }>({
    mutationFn: ({ id, data }) => apiService.updateNote(id, data),
    queryKey: ['notes'],
    getId: (vars) => vars.id,
    successMessage: 'Note updated successfully',
    errorMessage: 'Failed to update note',
  });
}

/**
 * Optimistic delete note hook
 *
 * @example
 * ```tsx
 * const deleteNote = useDeleteNoteOptimistic();
 *
 * <button onClick={() => deleteNote.mutate(note.id)}>
 *   Delete Note
 * </button>
 * ```
 */
export function useDeleteNoteOptimistic() {
  return useOptimisticDelete<Note>({
    mutationFn: (id) => apiService.deleteNote(id),
    queryKey: ['notes'],
    successMessage: 'Note deleted successfully',
    errorMessage: 'Failed to delete note',
  });
}

/**
 * Optimistic toggle note read status
 *
 * @example
 * ```tsx
 * const toggleRead = useToggleNoteRead();
 *
 * <button onClick={() => toggleRead.mutate({ id: note.id, isRead: !note.isRead })}>
 *   {note.isRead ? 'Mark Unread' : 'Mark Read'}
 * </button>
 * ```
 */
export function useToggleNoteRead() {
  return useOptimisticUpdate<Note, { id: number; isRead: boolean }>({
    mutationFn: ({ id, isRead }) => apiService.updateNote(id, { isRead }),
    queryKey: ['notes'],
    getId: (vars) => vars.id,
    successMessage: (data) => (data.isRead ? 'Marked as read' : 'Marked as unread'),
    errorMessage: 'Failed to update note status',
    showToast: false, // Don't show toast for toggle actions
  });
}
