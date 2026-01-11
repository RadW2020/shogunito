import React, { useMemo } from 'react';
import { VersionsTab } from '@features/shotgrid/components/shotgrid/tabs/VersionsTab';
import { useVersionsPaginated, useIsVersionsInitialLoading } from '../api/useVersionsPaginated';
import { VirtualTable, type VirtualTableColumn } from '@shared/components/pagination';
import { useSequences } from '@features/sequences/api/useSequences';
import { useEpisodes } from '@features/episodes/api/useEpisodes';
import { useUiStore } from '@app/stores/uiStore';
import { LoadingSpinner, EmptyState } from '@shared/ui';
import type { StatusMeta, TabType } from '@shogunito/shared';
import type { ApiVersion } from '@shared/api/client';

interface VersionsTabWrapperWithPaginationProps {
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  searchTerm?: string;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: ApiVersion) => void;
  onEditVersion?: (version: ApiVersion) => void;
  onAddNoteToVersion?: (version: ApiVersion) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
  useVirtualTable?: boolean; // Toggle between virtual table and regular table
  pageSize?: number;
}

/**
 * Versions Tab Wrapper with Virtual Scrolling
 *
 * This is an enhanced version of VersionsTabWrapper that supports:
 * - Virtual scrolling for efficient rendering of large datasets
 * - Automatic loading of more versions as you scroll
 * - Client-side pagination (until backend supports it)
 *
 * Virtual scrolling only renders visible rows, which significantly
 * improves performance when dealing with thousands of versions.
 *
 * @example
 * <VersionsTabWrapperWithPagination
 *   {...props}
 *   useVirtualTable={true}
 *   pageSize={100}
 * />
 */
export const VersionsTabWrapperWithPagination: React.FC<VersionsTabWrapperWithPaginationProps> = ({
  useVirtualTable = false,
  pageSize = 100,
  ...props
}) => {
  const { filters, viewModes } = useUiStore();

  const query = useVersionsPaginated({ limit: pageSize });
  const isInitialLoading = useIsVersionsInitialLoading(query);

  const { data: sequences = [], isLoading: sequencesLoading } = useSequences();
  const { data: episodes = [], isLoading: episodesLoading } = useEpisodes();

  const isLoading = isInitialLoading || sequencesLoading || episodesLoading;

  // Apply hierarchical filters
  const filteredVersions = useMemo(() => {
    return query.flatData.filter((version: ApiVersion) => {
      // Filter by entity type
      if (filters.selectedEntityType !== 'all' && version.entityType !== filters.selectedEntityType.toLowerCase()) {
        return false;
      }

      // Filter by project
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

      // Apply search filter
      if (props.searchTerm) {
        const searchLower = props.searchTerm.toLowerCase();
        const matchesSearch =
          version.name?.toLowerCase().includes(searchLower) ||
          version.code?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [query.flatData, filters, sequences, episodes, props.searchTerm]);

  // Show loading spinner on initial load
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

  // Show error state
  if (query.error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Error loading versions"
        description={query.error.message}
        action={
          <button
            onClick={() => query.refetch()}
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

  // Show empty state if no versions after filtering
  if (filteredVersions.length === 0) {
    return (
      <EmptyState
        icon="📭"
        title="No versions found"
        description={
          props.searchTerm ? `No versions match "${props.searchTerm}"` : 'No versions available'
        }
      />
    );
  }

  // Render with virtual table
  if (useVirtualTable) {
    const columns: VirtualTableColumn<ApiVersion>[] = [
      {
        key: 'select',
        header: '',
        width: 50,
        render: (version) => (
          <input
            type="checkbox"
            checked={props.selectedItems.has(String(version.id))}
            onChange={(e) => {
              e.stopPropagation();
              props.onItemSelect(String(version.id), e.target.checked);
            }}
          />
        ),
      },
      {
        key: 'code',
        header: 'Code',
        width: 150,
        render: (version) => <span className="font-medium">{version.code}</span>,
      },
      {
        key: 'name',
        header: 'Name',
        width: 250,
        render: (version) => version.name || '-',
      },
      {
        key: 'status',
        header: 'Status',
        width: 120,
        render: (version) => (
          <span
            className="px-2 py-1 rounded text-xs font-medium"
            style={{
              backgroundColor: props.statusMap[version.statusId || '']?.color || '#gray',
              color: 'white',
              cursor: 'default'
            }}
          >
            {props.statusMap[version.statusId || '']?.label || version.statusId || ''}
          </span>
        ),
      },
      {
        key: 'entity',
        header: 'Entity',
        width: 150,
        render: (version) => version.entityCode || '-',
      },
      {
        key: 'created',
        header: 'Created',
        width: 150,
        render: (version) =>
          version.createdAt ? new Date(version.createdAt).toLocaleDateString() : '-',
      },
    ];

    return (
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {filteredVersions.length} of {query.totalItems} versions
            {query.hasMore && ' (scroll to load more)'}
          </div>
          {query.isFetchingNextPage && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <LoadingSpinner size="sm" />
              Loading more...
            </div>
          )}
        </div>
        <VirtualTable
          items={filteredVersions}
          columns={columns}
          hasMore={query.hasMore}
          loadMore={query.loadMore}
          isLoading={query.isFetchingNextPage}
          rowHeight={60}
          height={700}
          onRowClick={(version) =>
            props.onItemClick('versions', version)
          }
        />
      </div>
    );
  }

  // Default: Use regular VersionsTab component
  return (
    <VersionsTab
      {...props}
      versions={filteredVersions}
      viewMode={viewModes.versions}
    />
  );
};
