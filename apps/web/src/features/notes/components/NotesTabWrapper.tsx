import React from 'react';
import { NotesTab } from '@features/shotgrid/components/shotgrid/tabs/NotesTab';
import { useNotes } from '../api/useNotes';
import { useUiStore } from '@app/stores/uiStore';
import { LoadingSpinner, EmptyState } from '@shared/ui';
import type { StatusMeta, TabType } from '@shogun/shared';
import type { Note } from '@shared/api/client';

interface NotesTabWrapperProps {
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  searchTerm?: string;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Note[], checked: boolean) => void;
  onItemClick: (type: TabType, item: Note) => void;
  onRefresh?: () => Promise<void>;
  onClearSearch?: () => void;
}

export const NotesTabWrapper: React.FC<NotesTabWrapperProps> = (props) => {
  const { filters } = useUiStore();

  const { data: notes = [], isLoading: notesLoading, error: notesError } = useNotes();

  const isLoading = notesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading notes...
        </span>
      </div>
    );
  }

  if (notesError) {
    return (
      <EmptyState
        icon="⚠️"
        title="Error loading notes"
        description={notesError.message}
        action={
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm rounded border"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          >
            Try again
          </button>
        }
      />
    );
  }

  // Apply filters based on available data
  let filteredNotes: Note[] = Array.isArray(notes) ? notes : [];

  // Filter by entity type
  if (filters.selectedEntityType !== 'all') {
    filteredNotes = filteredNotes.filter((note) => {
      return note.linkType === filters.selectedEntityType;
    });
  }

  // Filter by project (if note has project data)
  if (filters.selectedProjectId !== 'all') {
    filteredNotes = filteredNotes.filter((note) => {
      return String(note.project?.id) === filters.selectedProjectId;
    });
  }

  // Apply search filter
  if (props.searchTerm) {
    const searchLower = props.searchTerm.toLowerCase();
    filteredNotes = filteredNotes.filter((note) => {
      const matchesSearch =
        note.subject?.toLowerCase().includes(searchLower) ||
        note.content?.toLowerCase().includes(searchLower) ||
        note.linkId?.toLowerCase().includes(searchLower) ||
        note.linkType?.toLowerCase().includes(searchLower);
      return matchesSearch;
    });
  }

  if (filteredNotes.length === 0) {
    const hasFilters =
      filters.selectedProjectId !== 'all' ||
      filters.selectedEntityType !== 'all' ||
      !!props.searchTerm;

    return (
      <EmptyState
        icon="📝"
        title="No notes found"
        description={
          hasFilters ? 'No notes match your current filters' : 'No notes available in the system'
        }
        action={
          hasFilters ? (
            <button
              onClick={() => {
                const store = useUiStore.getState();
                store.setFilter('selectedProjectId', 'all');
                store.setFilter('selectedEntityType', 'all');
                // Clear search term
                props.onClearSearch?.();
              }}
              className="px-4 py-2 text-sm rounded border"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            >
              Clear filters
            </button>
          ) : undefined
        }
      />
    );
  }

  return <NotesTab {...props} notes={filteredNotes} />;
};
