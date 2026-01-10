import React, { useState } from 'react';
import { VersionsTab } from '@features/shotgrid/components/shotgrid/tabs/VersionsTab';
import { useVersions } from '../api/useVersions';
import { useShots } from '@features/shots/api/useShots';
import { useSequences } from '@features/sequences/api/useSequences';
import { useEpisodes } from '@features/episodes/api/useEpisodes';
import { useUiStore } from '@app/stores/uiStore';
import { LoadingSpinner, EmptyState } from '@shared/ui';
import { CreatePlaylistFromVersionsModal } from '@shared/components/modals/CreatePlaylistFromVersionsModal';
import type { StatusMeta, TabType } from '@shogun/shared';
import type { ApiVersion } from '@shared/api/client';

interface VersionsTabWrapperProps {
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  searchTerm?: string;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: { id: string | number; name?: string; code?: string }) => void;
  onEditVersion?: (version: ApiVersion) => void;
  onAddNoteToVersion?: (version: ApiVersion) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

export const VersionsTabWrapper: React.FC<VersionsTabWrapperProps> = (props) => {
  const { filters, viewModes } = useUiStore();
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);

  // Use shot filter if available, otherwise get all versions
  const shotId = filters.selectedShotId !== 'all' ? Number(filters.selectedShotId) : undefined;
  const {
    data: versions = [],
    isLoading: versionsLoading,
    error: versionsError,
  } = useVersions(shotId);
  const { data: shots = [], isLoading: shotsLoading } = useShots();
  const { data: sequences = [], isLoading: sequencesLoading } = useSequences();
  const { data: episodes = [], isLoading: episodesLoading } = useEpisodes();

  const isLoading = versionsLoading || shotsLoading || sequencesLoading || episodesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading versions...
        </span>
      </div>
    );
  }

  if (versionsError) {
    return (
      <EmptyState
        icon="⚠️"
        title="Error loading versions"
        description={versionsError.message}
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
  let filteredVersions = versions.filter((version) => {
    // Filter by shot if specified
    // Note: entityCode is the shot CODE, but selectedShotId is the shot ID
    // We need to find the shot by code and compare its id
    if (filters.selectedShotId !== 'all') {
      const shot = shots.find((s) => s.code === (version as any).entityCode);
      if (!shot || String(shot.id) !== filters.selectedShotId) {
        return false;
      }
    }

    // Filter by sequence through shot relationship
    if (filters.selectedSequenceId !== 'all') {
      const shot = shots.find((s) => s.code === (version as any).entityCode);
      if (!shot) {
        // Version doesn't have a corresponding shot, exclude it
        return false;
      }

      if (shot.sequence?.code !== filters.selectedSequenceId) {
        // Shot doesn't belong to selected sequence, exclude it
        return false;
      }
    }

    // Filter by episode through shot->sequence relationship
    if (filters.selectedEpisodeId !== 'all') {
      const shot = shots.find((s) => s.code === (version as any).entityCode);
      if (!shot) {
        // Version doesn't have a corresponding shot, exclude it
        return false;
      }

      if (!shot.sequence?.code) {
        // Shot doesn't have a sequence, exclude it
        return false;
      }

      const sequence = sequences.find((seq) => seq.code === shot.sequence?.code);
      if (!sequence) {
        // Sequence not found, exclude it
        return false;
      }

      if (String(sequence.episodeId) !== filters.selectedEpisodeId) {
        // Sequence doesn't belong to selected episode, exclude it
        return false;
      }
    }

    // Filter by project through shot->sequence->episode relationship
    if (filters.selectedProjectId !== 'all') {
      const shot = shots.find((s) => s.code === (version as any).entityCode);
      if (!shot) {
        // Version doesn't have a corresponding shot, exclude it
        return false;
      }

      if (!shot.sequence?.code) {
        // Shot doesn't have a sequence, exclude it
        return false;
      }

      const sequence = sequences.find((seq) => seq.code === shot.sequence?.code);
      if (!sequence) {
        // Sequence not found, exclude it
        return false;
      }

      if (!sequence.episodeId) {
        // Sequence doesn't have an episode, exclude it
        return false;
      }

      const episode = episodes.find((ep) => ep.id === sequence.episodeId);
      if (!episode) {
        // Episode not found, exclude it
        return false;
      }

      if (String(episode.projectId) !== filters.selectedProjectId) {
        // Episode doesn't belong to selected project, exclude it
        return false;
      }
    }

    return true;
  });

  // Apply version status filter
  if (filters.selectedVersionStatus !== 'all') {
    filteredVersions = filteredVersions.filter((v) => v.statusId === filters.selectedVersionStatus);
  }

  // Apply latest only filter
  if (filters.latestOnly) {
    filteredVersions = filteredVersions.filter((v) => v.latest);
  }

  // Apply format filter
  if (filters.selectedFormat !== 'all') {
    filteredVersions = filteredVersions.filter((v) => v.format === filters.selectedFormat);
  }

  // Apply search filter
  if (props.searchTerm) {
    const searchLower = props.searchTerm.toLowerCase();
    filteredVersions = filteredVersions.filter((version) => {
      const matchesSearch =
        version.name?.toLowerCase().includes(searchLower) ||
        version.description?.toLowerCase().includes(searchLower) ||
        version.code?.toLowerCase().includes(searchLower);
      return matchesSearch;
    });
  }

  if (filteredVersions.length === 0) {
    const hasFilters =
      filters.selectedProjectId !== 'all' ||
      filters.selectedEpisodeId !== 'all' ||
      filters.selectedSequenceId !== 'all' ||
      filters.selectedShotId !== 'all' ||
      filters.selectedVersionStatus !== 'all' ||
      filters.latestOnly ||
      filters.selectedFormat !== 'all';

    return (
      <EmptyState
        icon="🎥"
        title="No versions found"
        description={
          hasFilters
            ? 'No versions match your current filters'
            : 'No versions available in the system'
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
                store.setFilter('selectedVersionStatus', 'all');
                store.setFilter('latestOnly', false);
                store.setFilter('selectedFormat', 'all');
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

  const handleCreatePlaylist = () => {
    setShowCreatePlaylistModal(true);
  };

  const handlePlaylistCreated = () => {
    setShowCreatePlaylistModal(false);
    // Clear selection after creating playlist
    props.selectedItems.clear();
  };

  return (
    <>
      <VersionsTab
        {...props}
        versions={filteredVersions}
        shots={shots}
        viewMode={viewModes.versions}
        onCreatePlaylist={handleCreatePlaylist}
      />

      {showCreatePlaylistModal && props.selectedItems.size > 0 && (
        <CreatePlaylistFromVersionsModal
          versionCodes={Array.from(props.selectedItems)}
          isOpen={showCreatePlaylistModal}
          onClose={() => setShowCreatePlaylistModal(false)}
          onSuccess={handlePlaylistCreated}
        />
      )}
    </>
  );
};
