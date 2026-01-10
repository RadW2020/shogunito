import React, { useState, useEffect } from 'react';
import { apiService } from '@shared/api/client';
import { NoteCreator } from './NoteCreator';
import { NoteAttachmentUpload } from './NoteAttachmentUpload';
import type { Note } from '@shared/api/client';

export type LinkType =
  | 'Project'
  | 'Episode'
  | 'Asset'
  | 'Sequence'
  | 'Shot'
  | 'Playlist'
  | 'Version';

interface NotesPanelProps {
  linkId: string | number;
  linkType: LinkType;
  linkName: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({
  linkId,
  linkType,
  linkName,
  isOpen,
  onClose,
  className = '',
}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  // const [editingNote, setEditingNote] = useState<Note | null>(null); // Temporarily commented - not used yet
  const [uploadingNote, setUploadingNote] = useState<string | number | null>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      setLoading(true);
      try {
        const entityNotes = await apiService.getNotesByEntity(String(linkId), linkType);
        setNotes(entityNotes);
      } catch (error) {
        console.error('Error fetching notes:', error);
        setNotes([]);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchNotes();
    }
  }, [isOpen, linkId, linkType]);

  const handleNoteCreated = (newNote: Note) => {
    setNotes((prev) => [newNote, ...prev]);
    setShowCreator(false);
  };

  // const handleNoteUpdated = (updatedNote: Note) => { // Temporarily commented - not used yet
  //   setNotes(prev =>
  //     prev.map((note) => (note.id === updatedNote.id ? updatedNote : note)),
  //   );
  //   setEditingNote(null);
  // };

  const handleNoteDeleted = async (noteId: number) => {
    try {
      await apiService.deleteNote(noteId);
      setNotes((prev) => prev.filter((note) => Number(note.id) !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleUploadSuccess = (updatedNote: Note) => {
    setNotes((prev) => prev.map((note) => (note.id === updatedNote.id ? updatedNote : note)));
    setUploadingNote(null);
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

  const getNoteTypeIcon = (type: string) => {
    const icons = {
      note: '📝',
      approval: '✅',
      revision: '🔄',
      client_note: '👤',
    };
    return icons[type as keyof typeof icons] || '📝';
  };

  const getNoteTypeColor = (type: string) => {
    const colors = {
      note: 'var(--text-primary)',
      approval: 'var(--status-success)',
      revision: 'var(--status-warning)',
      client_note: 'var(--accent-primary)',
    };
    return colors[type as keyof typeof colors] || 'var(--text-primary)';
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative w-full max-w-2xl max-h-[80vh] rounded-lg shadow-xl flex flex-col"
        style={{
          backgroundColor: 'var(--bg-primary)',
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
            <span className="text-xl">{getEntityIcon(linkType)}</span>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Notes for {linkType}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {linkName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: 'var(--text-secondary)' }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Actions */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
            <button
              onClick={() => setShowCreator(true)}
              className="px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
              }}
            >
              + Add Note
            </button>
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div
                  className="animate-spin rounded-full h-8 w-8 border-b-2"
                  style={{ borderColor: 'var(--accent-primary)' }}
                />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                <p>No notes yet for this {linkType.toLowerCase()}.</p>
                <p className="text-sm mt-1">Click "Add Note" to create the first one.</p>
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-primary)',
                  }}
                >
                  {/* Note Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span style={{ color: getNoteTypeColor(note.noteType) }}>
                        {getNoteTypeIcon(note.noteType)}
                      </span>
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
                    <div className="flex items-center space-x-1">
                      {/* <button
                        onClick={() => setEditingNote(note)}
                        className="p-1 rounded transition-colors hover:bg-gray-100"
                        style={{ color: 'var(--text-secondary)' }}
                        title="Edit note"
                      >
                        ✏️
                      </button> */}
                      <button
                        onClick={() => setUploadingNote(note.id as string | number)}
                        className="p-1 rounded transition-colors hover:bg-gray-100"
                        style={{ color: 'var(--text-secondary)' }}
                        title="Add attachment"
                      >
                        📎
                      </button>
                      <button
                        onClick={() => handleNoteDeleted(Number(note.id))}
                        className="p-1 rounded transition-colors hover:bg-gray-100"
                        style={{ color: 'var(--status-error)' }}
                        title="Delete note"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Note Content */}
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {note.content}
                  </p>

                  {/* Note Meta */}
                  <div
                    className="flex items-center justify-between text-xs"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <div className="flex items-center space-x-4">
                      {note.createdBy && <span>By: {note.createdBy}</span>}
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      {note.attachments && note.attachments.length > 0 && (
                        <span>
                          📎 {note.attachments.length} attachment
                          {note.attachments.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Note Creator Modal */}
      {showCreator && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowCreator(false)}
          />
          <div className="relative w-full max-w-lg mx-4">
            <NoteCreator
              linkId={linkId}
              linkType={linkType}
              linkName={linkName}
              onNoteCreated={handleNoteCreated}
              onCancel={() => setShowCreator(false)}
            />
          </div>
        </div>
      )}

      {/* Attachment Upload */}
      {uploadingNote && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setUploadingNote(null)}
          />
          <div
            className="relative w-full max-w-md mx-4 p-4 rounded-lg"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
              Add Attachment
            </h3>
            <NoteAttachmentUpload
              note={notes.find((n) => String(n.id) === String(uploadingNote))!}
              onSuccess={handleUploadSuccess}
              onError={() => setUploadingNote(null)}
            />
            <button
              onClick={() => setUploadingNote(null)}
              className="mt-4 px-4 py-2 rounded transition-colors"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-primary)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
