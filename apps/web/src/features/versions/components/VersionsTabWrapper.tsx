import React from 'react';
import { VersionsTab } from '@features/shotgrid/components/shotgrid/tabs/VersionsTab';
import { useVersions } from '../api/useVersions';
import { useSequences } from '@features/sequences/api/useSequences';
import { useEpisodes } from '@features/episodes/api/useEpisodes';
import { useUiStore } from '@app/stores/uiStore';
import { LoadingSpinner, EmptyState } from '@shared/ui';
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

  // Use entity filters if available
  const {
    data: versions = [],
    isLoading: versionsLoading,
    error: versionsError,
  } = useVersions();
  
  const { data: sequences = [], isLoading: sequencesLoading } = useSequences();
  const { data: episodes = [], isLoading: episodesLoading } = useEpisodes();

  const isLoading = versionsLoading || sequencesLoading || episodesLoading;

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
  let filteredVersions = versions.filter((version: ApiVersion) => {
    // Filter by entity type if specified
    if (filters.selectedEntityType !== 'all' && version.entityType !== filters.selectedEntityType.toLowerCase()) {
      return false;
    }

    // Filter by project through entity relationship
    if (filters.selectedProjectId !== 'all') {
      const projectId = parseInt(filters.selectedProjectId);
      
      if (version.entityType === 'episode') {
        const episode = episodes.find(e => e.id === version.entityId);
        if (!episode || episode.projectId !== projectId) return false;
      } else if (version.entityType === 'sequence') {
        const sequence = sequences.find(s => s.id === version.entityId);
        if (!sequence) return false;
        const episode = episodes.find(e => e.id === sequence.episodeId);
        if (!episode || episode.projectId !== projectId) return false;
      }
      // Note: asset should also link to project, but for now we focus on the main ones
    }

    // Filter by episode
    if (filters.selectedEpisodeId !== 'all') {
      const episodeId = parseInt(filters.selectedEpisodeId);
      if (version.entityType === 'episode' && version.entityId !== episodeId) return false;
      if (version.entityType === 'sequence') {
        const sequence = sequences.find(s => s.id === version.entityId);
        if (!sequence || sequence.episodeId !== episodeId) return false;
      }
    }

    // Filter by sequence
    if (filters.selectedSequenceId !== 'all') {
      const sequenceId = parseInt(filters.selectedSequenceId);
      if (version.entityType === 'sequence' && version.entityId !== sequenceId) return false;
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


  return (
    <>
      <VersionsTab
        {...props}
        versions={filteredVersions}
        viewMode={viewModes.versions}
      />
    </>
  );
};
