import React from 'react';
import { SequencesTab } from '@features/shotgrid/components/shotgrid/tabs/SequencesTab';
import { useSequences } from '../api/useSequences';
import { useEpisodes } from '@features/episodes/api/useEpisodes';
import { useUiStore } from '@app/stores/uiStore';
import { LoadingSpinner, EmptyState } from '@shared/ui';
import type { StatusMeta, TabType, Sequence } from '@shogunito/shared';

interface SequencesTabWrapperProps {
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  searchTerm?: string;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: { id: string | number; name?: string; code?: string }) => void;
  onEditSequence?: (sequence: Sequence) => void;
  onAddNoteToSequence?: (sequence: Sequence) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

export const SequencesTabWrapper: React.FC<SequencesTabWrapperProps> = (props) => {
  const {
    data: sequences = [],
    isLoading: sequencesLoading,
    error: sequencesError,
  } = useSequences();
  const { data: episodes = [], isLoading: episodesLoading } = useEpisodes();
  const { filters } = useUiStore();

  const isLoading = sequencesLoading || episodesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading sequences...
        </span>
      </div>
    );
  }

  if (sequencesError) {
    return (
      <EmptyState
        icon="⚠️"
        title="Error loading sequences"
        description={sequencesError.message}
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

  // Apply filters
  const filteredSequences = sequences.filter((sequence) => {
    // Filter by selected project
    if (filters.selectedProjectId !== 'all') {
      if (!sequence.episodeId) {
        // If sequence has no episode, it can't match project filter
        return false;
      }
      // Find episode by id (which is now stored in episodeId)
      const episode = episodes.find((ep) => ep.id === sequence.episodeId);
      if (!episode || String(episode.projectId) !== filters.selectedProjectId) {
        return false;
      }
    }

    // Filter by selected episode
    if (filters.selectedEpisodeId !== 'all') {
      if (!sequence.episodeId) {
        // If sequence has no episode, it can't match episode filter
        return false;
      }
      // Now episodeId is the episode id, so we can compare directly
      if (String(sequence.episodeId) !== filters.selectedEpisodeId) {
        return false;
      }
    }

    // Filter by selected sequence
    if (filters.selectedSequenceId !== 'all' && filters.selectedSequenceId !== sequence.code) {
      return false;
    }

    // Apply search filter
    if (props.searchTerm) {
      const searchLower = props.searchTerm.toLowerCase();
      const matchesSearch =
        sequence.name?.toLowerCase().includes(searchLower) ||
        sequence.description?.toLowerCase().includes(searchLower) ||
        sequence.code?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    return true;
  });

  if (filteredSequences.length === 0) {
    const hasFilters =
      filters.selectedProjectId !== 'all' ||
      filters.selectedEpisodeId !== 'all' ||
      filters.selectedSequenceId !== 'all';

    return (
      <EmptyState
        icon="🎬"
        title="No sequences found"
        description="No sequences match your current filters"
        action={
          hasFilters ? (
            <button
              onClick={() => {
                const store = useUiStore.getState();
                store.setFilter('selectedProjectId', 'all');
                store.setFilter('selectedEpisodeId', 'all');
                store.setFilter('selectedSequenceId', 'all');
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

  return (
    <div data-testid="sequences-tab-wrapper" data-sequence-count={filteredSequences.length}>
      <SequencesTab {...props} sequences={filteredSequences} />
    </div>
  );
};
