import React, { useState } from 'react';
import { DataTable, type TableColumn } from '../DataTable';
import { NoteAttachmentUpload } from '../../../../../shared/components/shared/NoteAttachmentUpload';
import { NoteEditModal } from '../../../../../shared/components/modals/NoteEditModal';
import type { StatusMeta, TabType } from '@shogun/shared';
import type { Note } from '@shared/api/client';

interface NotesTabProps {
  notes: Note[];
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Note[], checked: boolean) => void;
  onItemClick: (type: TabType, item: Note) => void;
  onRefresh?: () => Promise<void>;
}

export const NotesTab: React.FC<NotesTabProps> = ({
  notes,
  selectedItems,
  onItemSelect,
  onSelectAll,
  onItemClick,
  onRefresh,
}) => {
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadingNote, setUploadingNote] = useState<string | null>(null);

  const handleNoteUpdate = async (updatedNote: Note) => {
    console.log('Note updated:', updatedNote);
    setShowEditModal(false);
    setEditingNote(null);
    // Refresh the notes list to show updated data
    if (onRefresh) {
      await onRefresh();
    }
  };

  const handleUploadSuccess = async (updatedNote: Note) => {
    console.log('Upload successful:', updatedNote);
    setUploadingNote(null);
    // Refresh the notes list to show updated data
    if (onRefresh) {
      await onRefresh();
    }
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    setUploadingNote(null);
  };

  const columns: TableColumn[] = [
    { label: 'Subject', field: 'subject' },
    { label: 'Type', field: 'noteType' },
    {
      label: 'Entity',
      field: 'linkType',
      render: (item: Note) => (
        <div className="flex items-center space-x-2">
          <span className="text-sm">
            {item.linkType === 'Project' && '📁'}
            {item.linkType === 'Episode' && '🎬'}
            {item.linkType === 'Asset' && '🎨'}
            {item.linkType === 'Sequence' && '🎞️'}
            {item.linkType === 'Playlist' && '📋'}
            {item.linkType === 'Version' && '🔄'}
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {item.linkType}
          </span>
        </div>
      ),
    },
    {
      label: 'Read',
      field: 'isRead',
      render: (item: Note) => (
        <span
          style={{
            color: item.isRead ? 'var(--status-success)' : 'var(--status-error)',
          }}
        >
          {item.isRead ? '✓' : '✗'}
        </span>
      ),
    },
    {
      label: 'Attachments',
      field: 'attachments',
      render: (item: Note) => (
        <div className="flex items-center space-x-1">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {item.attachments?.length || 0}
          </span>
          {item.attachments && item.attachments.length > 0 && (
            <svg
              className="w-4 h-4"
              style={{ color: 'var(--accent-primary)' }}
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
          )}
        </div>
      ),
    },
    { label: 'Content', field: 'content' },
    { label: 'Created By', field: 'createdBy' },
    { label: 'Created At', field: 'createdAt' },
    {
      label: 'Actions',
      field: 'actions',
      render: (item: Note) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setEditingNote(item);
              setShowEditModal(true);
            }}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
            title="Edit Note"
          >
            Edit
          </button>
          <button
            onClick={() => setUploadingNote(item.id)}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{
              backgroundColor: 'var(--status-success)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            title="Add Attachment"
          >
            Attach
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={notes}
        entityType="notes"
        selectedItems={selectedItems}
        onItemSelect={onItemSelect}
        onSelectAll={onSelectAll}
        onItemClick={onItemClick}
      />

      {/* Upload Component */}
      {uploadingNote && (
        <div
          className="mt-4 p-4 rounded-lg"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
          }}
        >
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Add Attachment to {notes.find((n) => n.id === uploadingNote)?.subject}
          </h3>
          <NoteAttachmentUpload
            note={notes.find((n) => n.id === uploadingNote)! as any}
            onSuccess={handleUploadSuccess as any}
            onError={handleUploadError}
            className="max-w-md"
          />
          <button
            onClick={() => setUploadingNote(null)}
            className="mt-2 px-3 py-1 text-xs rounded transition-colors"
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
        </div>
      )}

      {/* Edit Modal */}
      {editingNote && (
        <NoteEditModal
          note={editingNote as any}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingNote(null);
          }}
          onSave={handleNoteUpdate as any}
        />
      )}
    </div>
  );
};
