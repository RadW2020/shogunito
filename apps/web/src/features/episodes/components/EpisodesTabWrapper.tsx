import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EpisodesTab } from '@features/shotgrid/components/shotgrid/tabs/EpisodesTab';
import { useEpisodes } from '../api/useEpisodes';
import { useUiStore } from '@app/stores/uiStore';
import { LoadingSpinner, EmptyState } from '@shared/ui';
import { apiService } from '@shared/api/client';
import type { StatusMeta, TabType, Episode, Status } from '@shogun/shared';

interface EpisodesTabWrapperProps {
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  searchTerm?: string;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: { id: string | number; name?: string; code?: string }) => void;
  onEditEpisode?: (episode: Episode) => void;
  onAddNoteToEpisode?: (episode: Episode) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

export const EpisodesTabWrapper: React.FC<EpisodesTabWrapperProps> = (props) => {
  const { data: episodes = [], isLoading, error } = useEpisodes();
  const { data: statuses = [] } = useQuery<Status[]>({
    queryKey: ['statuses'],
    queryFn: () => apiService.getStatuses(),
  });
  const { filters } = useUiStore();

  // Create a map from statusId to status code
  const statusIdToCodeMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const status of statuses) {
      map[String(status.id)] = status.code;
    }
    return map;
  }, [statuses]);

  // Transform episodes to include status code from statusId
  const transformedEpisodes = useMemo(() => {
    return episodes.map((episode) => {
      const statusId = (episode as any)?.statusId;
      if (statusId && statusIdToCodeMap[String(statusId)]) {
        const statusCode = statusIdToCodeMap[String(statusId)];
        return {
          ...episode,
          status: statusCode,
        };
      }
      return {
        ...episode,
        status: undefined,
      };
    });
  }, [episodes, statusIdToCodeMap]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading episodes...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Error loading episodes"
        description={error.message}
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
  const filteredEpisodes = transformedEpisodes.filter((episode) => {
    // Filter by selected project
    if (
      filters.selectedProjectId !== 'all' &&
      String(episode.projectId) !== filters.selectedProjectId
    ) {
      return false;
    }

    // Filter by selected episode
    if (filters.selectedEpisodeId !== 'all' && String(episode.id) !== filters.selectedEpisodeId) {
      return false;
    }

    // Apply search filter
    if (props.searchTerm) {
      const searchLower = props.searchTerm.toLowerCase();
      const matchesSearch =
        episode.name?.toLowerCase().includes(searchLower) ||
        episode.description?.toLowerCase().includes(searchLower) ||
        episode.code?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    return true;
  });

  if (filteredEpisodes.length === 0) {
    const hasFilters = filters.selectedProjectId !== 'all' || filters.selectedEpisodeId !== 'all';

    return (
      <EmptyState
        icon="📺"
        title="No episodes found"
        description="No episodes match your current filters"
        action={
          hasFilters ? (
            <button
              onClick={() => {
                const store = useUiStore.getState();
                store.setFilter('selectedProjectId', 'all');
                store.setFilter('selectedEpisodeId', 'all');
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

  return <EpisodesTab {...props} episodes={filteredEpisodes as Episode[]} />;
};
