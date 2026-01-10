import React, { useState } from 'react';
import {
  useNotesByEntity,
  useUpdateNote,
  useDeleteNote,
} from '../../../features/notes/api/useNotes';
import type { Note } from '@shared/api/client';
import { NoteEditModal } from '../modals/NoteEditModal';
import { NoteCreator } from '../shared/NoteCreator';

export type LinkType =
  | 'Project'
  | 'Episode'
  | 'Asset'
  | 'Sequence'
  | 'Shot'
  | 'Playlist'
  | 'Version';

interface NotesViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkId: string;
  linkType: LinkType;
  linkName: string;
  onRefresh?: () => void;
}

export const NotesViewerModal: React.FC<NotesViewerModalProps> = ({
  isOpen,
  onClose,
  linkId,
  linkType,
  linkName,
  onRefresh,
}) => {
  const { data: notes = [], isLoading: loading, refetch } = useNotesByEntity(linkId, linkType);
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleNoteCreated = () => {
    setShowCreateNote(false);
    refetch(); // Refresh the list
    onRefresh?.();
  };

  const handleNoteUpdated = () => {
    setShowEditModal(false);
    setEditingNote(null);
    refetch(); // Refresh the list
    onRefresh?.();
  };

  const handleMarkAsRead = async (noteId: string) => {
    try {
      await updateNoteMutation.mutateAsync({
        id: Number(noteId),
        data: { isRead: true },
      });
      // React Query will automatically update the cache and refresh the UI
    } catch (error) {
      console.error('Error marking note as read:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNoteMutation.mutateAsync(Number(noteId));
        onRefresh?.();
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  const getEntityIcon = (type: LinkType) => {
    const icons = {
      Project: '📁',
      Episode: '🎬',
      Asset: '🎨',
      Sequence: '🎞️',
      Shot: '📸',
      Playlist: '📋',
      Version: '🔄',
    };
    return icons[type] || '📝';
  };

  const getNoteTypeIcon = (noteType: string) => {
    const icons = {
      note: '📝',
      approval: '✅',
      revision: '🔄',
      client_note: '👤',
    };
    return icons[noteType as keyof typeof icons] || '📝';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-4xl max-h-[80vh] rounded-lg shadow-xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getEntityIcon(linkType)}</span>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Notes for {linkType}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {linkName}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCreateNote(true)}
              className="px-3 py-1 text-sm rounded transition-colors"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
              }}
            >
              + Add Note
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-gray-100"
              style={{ color: 'var(--text-secondary)' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {showCreateNote ? (
            <NoteCreator
              linkId={linkId}
              linkType={linkType}
              linkName={linkName}
              onNoteCreated={handleNoteCreated}
              onCancel={() => setShowCreateNote(false)}
            />
          ) : (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div
                    className="w-6 h-6 rounded-full animate-pulse"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  />
                  <span className="ml-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Loading notes...
                  </span>
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📝</div>
                  <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    No notes yet
                  </p>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Be the first to add a note for this {linkType.toLowerCase()}
                  </p>
                  <button
                    onClick={() => setShowCreateNote(true)}
                    className="px-4 py-2 rounded transition-colors"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'white',
                    }}
                  >
                    Add First Note
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-4 rounded-lg border transition-colors ${!note.isRead ? 'border-l-4' : ''}`}
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: note.isRead
                          ? 'var(--border-primary)'
                          : 'var(--accent-primary)',
                        borderLeftColor: !note.isRead
                          ? 'var(--accent-primary)'
                          : 'var(--border-primary)',
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm">{getNoteTypeIcon(note.noteType)}</span>
                            <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {note.subject}
                            </h3>
                            {!note.isRead && (
                              <span
                                className="px-2 py-0.5 text-xs rounded-full"
                                style={{
                                  backgroundColor: 'var(--status-error)',
                                  color: 'white',
                                }}
                              >
                                Unread
                              </span>
                            )}
                          </div>
                          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                            {note.content}
                          </p>
                          <div className="flex items-center space-x-4 text-xs">
                            <span style={{ color: 'var(--text-secondary)' }}>
                              By: {note.createdBy || 'Unknown'}
                            </span>
                            {note.assignedTo && (
                              <span style={{ color: 'var(--text-secondary)' }}>
                                Assigned to: {note.assignedTo}
                              </span>
                            )}
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {new Date(note.createdAt).toLocaleDateString()}
                            </span>
                            {note.attachments && note.attachments.length > 0 && (
                              <span
                                className="flex items-center space-x-1"
                                style={{ color: 'var(--accent-primary)' }}
                              >
                                📎 {note.attachments.length} attachment(s)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {!note.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(note.id)}
                              className="px-2 py-1 text-xs rounded transition-colors"
                              style={{
                                backgroundColor: 'var(--status-success)',
                                color: 'white',
                              }}
                              title="Mark as read"
                            >
                              ✓
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingNote(note);
                              setShowEditModal(true);
                            }}
                            className="px-2 py-1 text-xs rounded transition-colors"
                            style={{
                              backgroundColor: 'var(--accent-primary)',
                              color: 'white',
                            }}
                            title="Edit note"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="px-2 py-1 text-xs rounded transition-colors"
                            style={{
                              backgroundColor: 'var(--status-error)',
                              color: 'white',
                            }}
                            title="Delete note"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingNote && (
        <NoteEditModal
          note={editingNote as any}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingNote(null);
          }}
          onSave={handleNoteUpdated as any}
        />
      )}
    </div>
  );
};
