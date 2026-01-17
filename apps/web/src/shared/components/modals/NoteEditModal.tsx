import React, { useState } from 'react';
import { NoteAttachmentUpload } from '../shared/NoteAttachmentUpload';
import { apiService } from '@shared/api/client';
import type { Note } from '@shared/api/client';

interface NoteEditModalProps {
  note: Note;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedNote: Note) => void;
}

export const NoteEditModal: React.FC<NoteEditModalProps> = ({ note, isOpen, onClose, onSave }) => {
  const [editedNote, setEditedNote] = useState<Note>(note);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Call the API to update the note
      const updatedNote = await apiService.updateNote(editedNote.id, {
        subject: editedNote.subject,
        content: editedNote.content,
        isRead: editedNote.isRead,
        assignedTo: editedNote.assignedTo,
        attachments: editedNote.attachments,
      } as any);

      onSave(updatedNote as any);
      onClose();
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAttachmentUpdate = (updatedNote: Note) => {
    setEditedNote(updatedNote);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div
        className="rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Edit Note: {note.subject}
          </h2>
          <button
            onClick={onClose}
            className="hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Subject
              </label>
              <input
                type="text"
                value={editedNote.subject}
                onChange={(e) => setEditedNote({ ...editedNote, subject: e.target.value })}
                className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
              />
            </div>

          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              Content
            </label>
            <textarea
              value={editedNote.content}
              onChange={(e) => setEditedNote({ ...editedNote, content: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
              }}
            />
          </div>

          {/* Current Attachments */}
          {editedNote.attachments && editedNote.attachments.length > 0 && (
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Current Attachments ({editedNote.attachments.length})
              </label>
              <div className="space-y-2">
                {editedNote.attachments.map((attachment: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-primary)',
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <svg
                        className="h-5 w-5"
                        style={{ color: 'var(--text-secondary)' }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {attachment.includes('http') ? 'MinIO File' : attachment.split('/').pop()}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {attachment.includes('http') ? 'Stored in MinIO' : 'Local file'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {attachment.includes('http') && (
                        <a
                          href={attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachment Upload */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Add New Attachments
            </label>
            <NoteAttachmentUpload
              note={editedNote}
              onSuccess={handleAttachmentUpdate}
              onError={(error) => console.error('Upload error:', error)}
              className="max-w-lg"
            />
          </div>

          {/* Assigned To */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              Assigned To
            </label>
            <input
              type="text"
              value={editedNote.assignedTo ?? ''}
              onChange={(e) =>
                setEditedNote({
                  ...editedNote,
                  assignedTo: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
              }}
            />
          </div>

          {/* Read Status */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isRead"
              checked={editedNote.isRead}
              onChange={(e) => setEditedNote({ ...editedNote, isRead: e.target.checked })}
              className="rounded focus:ring-blue-500"
              style={{
                borderColor: 'var(--border-primary)',
                accentColor: 'var(--accent-primary)',
              }}
            />
            <label
              htmlFor="isRead"
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Mark as read
            </label>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex justify-end space-x-3 mt-6 pt-6"
          style={{ borderTop: '1px solid var(--border-primary)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md transition-colors"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-primary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-md disabled:opacity-50 transition-colors"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) =>
              !isSaving && (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')
            }
            onMouseLeave={(e) =>
              !isSaving && (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')
            }
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
