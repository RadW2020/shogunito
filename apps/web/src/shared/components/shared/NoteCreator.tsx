import { useState } from 'react';
import type { Note } from '@shared/api/client';
import { useCreateNote } from '@features/notes/api/useNotes';

export type LinkType =
  | 'Project'
  | 'Episode'
  | 'Asset'
  | 'Sequence'
  | 'Version';

interface NoteCreatorProps {
  linkId: string | number;
  linkType: LinkType;
  linkName: string; // Nombre de la entidad para mostrar en el UI
  onNoteCreated?: (note: Note) => void;
  onCancel?: () => void;
  className?: string;
}

export const NoteCreator: React.FC<NoteCreatorProps> = ({
  linkId,
  linkType,
  linkName,
  onNoteCreated,
  onCancel,
  className = '',
}) => {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  // noteType removed as it is not supported by the backend


  const createNoteMutation = useCreateNote();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) return;

    // Validate linkId exists
    if (!linkId) {
      console.error('Invalid linkId:', linkId);
      alert('Error: Invalid entity ID. Please try again.');
      return;
    }

    try {
      const newNote = await createNoteMutation.mutateAsync({
        linkId: String(linkId),
        linkType,
        subject: subject.trim(),
        content: content.trim(),
        isRead: false,
      });

      // Reset form
      setSubject('');
      setContent('');
      setSubject('');
      setContent('');

      onNoteCreated?.(newNote);
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const getEntityIcon = (type: LinkType) => {
    const icons = {
      Project: '📁',
      Episode: '🎬',
      Asset: '🎨',
      Sequence: '🎞️',
      Version: '🔄',
    };
    return icons[type] || '📝';
  };

  return (
    <div
      className={`p-4 rounded-lg border ${className}`}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-primary)',
      }}
    >
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-lg">{getEntityIcon(linkType)}</span>
        <div>
          <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
            Add Note to {linkType}
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {linkName}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Subject */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Subject *
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter note subject..."
            className="w-full px-3 py-2 rounded border transition-colors"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
            required
          />
        </div>



        {/* Content */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Content *
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter note content..."
            rows={4}
            className="w-full px-3 py-2 rounded border transition-colors resize-none"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
            required
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded transition-colors"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-primary)',
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={createNoteMutation.isPending || !subject.trim() || !content.trim()}
            className="px-4 py-2 rounded transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'white',
            }}
          >
            {createNoteMutation.isPending ? 'Creating...' : 'Create Note'}
          </button>
        </div>
      </form>
    </div>
  );
};
