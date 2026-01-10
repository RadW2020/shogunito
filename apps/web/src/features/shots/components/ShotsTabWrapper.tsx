import React from 'react';
import { ShotsTab } from '@features/shotgrid/components/shotgrid/tabs/ShotsTab';
import { useShots } from '../api/useShots';
import { useSequences } from '@features/sequences/api/useSequences';
import { useEpisodes } from '@features/episodes/api/useEpisodes';
import { useUiStore } from '@app/stores/uiStore';
import { LoadingSpinner, EmptyState } from '@shared/ui';
import type { StatusMeta, TabType, Shot } from '@shogun/shared';

interface ShotsTabWrapperProps {
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  searchTerm?: string;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: { id: string | number; name?: string; code?: string }) => void;
  onEditShot?: (shot: Shot) => void;
  onAddNoteToShot?: (shot: Shot) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

export const ShotsTabWrapper: React.FC<ShotsTabWrapperProps> = (props) => {
  const { data: shots = [], isLoading: shotsLoading, error: shotsError } = useShots();
  const { data: sequences = [], isLoading: sequencesLoading } = useSequences();
  const { data: episodes = [], isLoading: episodesLoading } = useEpisodes();
  const { filters } = useUiStore();

  const isLoading = shotsLoading || sequencesLoading || episodesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading shots...
        </span>
      </div>
    );
  }

  if (shotsError) {
    return (
      <EmptyState
        icon="⚠️"
        title="Error loading shots"
        description={shotsError.message}
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

  // Apply hierarchical filters based on relationships
  const filteredShots = shots.filter((shot) => {
    // Filter by sequence if specified
    if (
      filters.selectedSequenceId !== 'all' &&
      String(shot.sequenceId) !== filters.selectedSequenceId
    ) {
      return false;
    }

    // Filter by shot if specified
    if (filters.selectedShotId !== 'all' && String(shot.id) !== filters.selectedShotId) {
      return false;
    }

    // Filter by project through sequence->episode relationship
    if (filters.selectedProjectId !== 'all') {
      const sequence = sequences.find((seq) => seq.code === shot.sequence?.code);
      if (sequence) {
        // sequence.episodeId contains the episode id, so find episode by id
        const episode = episodes.find((ep) => ep.id === sequence.episodeId);
        if (!episode || String(episode.projectId) !== filters.selectedProjectId) {
          return false;
        }
      }
    }

    // Filter by episode through sequence relationship
    if (filters.selectedEpisodeId !== 'all') {
      const sequence = sequences.find((seq) => seq.id === shot.sequenceId);
      if (!sequence || String(sequence.episodeId) !== filters.selectedEpisodeId) {
        return false;
      }
    }

    // Apply search filter
    if (props.searchTerm) {
      const searchLower = props.searchTerm.toLowerCase();
      const matchesSearch =
        shot.name?.toLowerCase().includes(searchLower) ||
        shot.description?.toLowerCase().includes(searchLower) ||
        shot.code?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    return true;
  });

  if (filteredShots.length === 0) {
    const hasFilters =
      filters.selectedProjectId !== 'all' ||
      filters.selectedEpisodeId !== 'all' ||
      filters.selectedSequenceId !== 'all' ||
      filters.selectedShotId !== 'all';

    return (
      <EmptyState
        icon="📹"
        title="No shots found"
        description={
          hasFilters ? 'No shots match your current filters' : 'No shots available in the system'
        }
        action={
          hasFilters ? (
            <button
              onClick={() => {
                const store = useUiStore.getState();
                store.setFilter('selectedProjectId', 'all');
                store.setFilter('selectedEpisodeId', 'all');
                store.setFilter('selectedSequenceId', 'all');
                store.setFilter('selectedShotId', 'all');
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

  return <ShotsTab {...props} shots={filteredShots} />;
};
