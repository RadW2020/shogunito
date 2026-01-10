import React from 'react';
import { PlaylistsTab } from '@features/shotgrid/components/shotgrid/tabs/PlaylistsTab';
import { usePlaylists } from '../api/usePlaylists';
import { useUiStore } from '@app/stores/uiStore';
import { LoadingSpinner, EmptyState } from '@shared/ui';
import { useProjects } from '@features/projects/api/useProjects';
import { useEpisodes } from '@features/episodes/api/useEpisodes';
import { useSequences } from '@features/sequences/api/useSequences';

import type { StatusMeta, TabType } from '@shogun/shared';
import type { Playlist } from '@shared/api/client';

interface PlaylistsTabWrapperProps {
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  searchTerm?: string;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: { id: string | number; name?: string; code?: string }) => void;
  onEditPlaylist?: (playlist: Playlist) => void;
  onAddNoteToPlaylist?: (playlist: Playlist) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

export const PlaylistsTabWrapper: React.FC<PlaylistsTabWrapperProps> = (props) => {
  const { filters } = useUiStore();

  const {
    data: playlists = [],
    isLoading: playlistsLoading,
    error: playlistsError,
  } = usePlaylists();

  // Projects and episodes are loaded but may not be used directly in this component
  // They're used in the PlaylistsTab component
  const { isLoading: projectsLoading } = useProjects();
  const { isLoading: episodesLoading } = useEpisodes();

  const { data: sequences = [], isLoading: sequencesLoading } = useSequences();



  const isLoading =
    playlistsLoading || projectsLoading || episodesLoading || sequencesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading playlists...
        </span>
      </div>
    );
  }

  if (playlistsError) {
    return (
      <EmptyState
        icon="⚠️"
        title="Error loading playlists"
        description={playlistsError.message}
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
  let filteredPlaylists: Playlist[] = Array.isArray(playlists) ? playlists : [];

  // Apply hierarchical filters based on versions in playlists
  filteredPlaylists = filteredPlaylists.filter((playlist) => {
    // Filter by project
    if (filters.selectedProjectId !== 'all') {
      const playlistProjectId =
        typeof playlist.project === 'string' ? playlist.project : playlist.project?.id;
      if (String(playlistProjectId) !== filters.selectedProjectId) {
        return false;
      }
    }

    // Filter by episode through versions
    if (filters.selectedEpisodeId !== 'all') {
      const episodeId = parseInt(filters.selectedEpisodeId);
      const hasVersionInEpisode = playlist.versions?.some((version) => {
        if (version.entityType === 'episode' && version.entityId === episodeId) {
          return true;
        }
        if (version.entityType === 'sequence') {
          const sequence = sequences.find(s => s.id === version.entityId);
          if (sequence && sequence.episodeId === episodeId) {
            return true;
          }
        }
        return false;
      });

      if (!hasVersionInEpisode) {
        return false;
      }
    }

    // Filter by sequence through versions
    if (filters.selectedSequenceId !== 'all') {
      const sequenceId = parseInt(filters.selectedSequenceId);
      const hasVersionInSequence = playlist.versions?.some((version) => {
        if (version.entityType === 'sequence' && version.entityId === sequenceId) {
          return true;
        }
        return false;
      });

      if (!hasVersionInSequence) {
        return false;
      }
    }

    return true;
  });

  // Apply playlist status filter
  if (filters.selectedPlaylistStatus !== 'all') {
    filteredPlaylists = filteredPlaylists.filter(
      (p) => p.statusId === filters.selectedPlaylistStatus,
    );
  }

  // Apply search filter
  if (props.searchTerm) {
    const searchLower = props.searchTerm.toLowerCase();
    filteredPlaylists = filteredPlaylists.filter((playlist) => {
      const matchesSearch =
        playlist.name?.toLowerCase().includes(searchLower) ||
        playlist.description?.toLowerCase().includes(searchLower) ||
        playlist.code?.toLowerCase().includes(searchLower);
      return matchesSearch;
    });
  }

  if (filteredPlaylists.length === 0) {
    const hasFilters =
      filters.selectedProjectId !== 'all' ||
      filters.selectedEpisodeId !== 'all' ||
      filters.selectedSequenceId !== 'all' ||
      filters.selectedPlaylistStatus !== 'all' ||
      !!props.searchTerm;

    return (
      <EmptyState
        icon="📋"
        title="No playlists found"
        description={
          hasFilters
            ? 'No playlists match your current filters'
            : 'No playlists available in the system'
        }
        action={
          hasFilters ? (
            <button
              onClick={() => {
                const store = useUiStore.getState();
                store.setFilter('selectedProjectId', 'all');
                store.setFilter('selectedEpisodeId', 'all');
                store.setFilter('selectedSequenceId', 'all');
                store.setFilter('selectedPlaylistStatus', 'all');
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

  return <PlaylistsTab {...props} playlists={filteredPlaylists} />;
};
