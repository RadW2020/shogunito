import React, { useMemo } from 'react';
import { VersionsTab } from '@features/shotgrid/components/shotgrid/tabs/VersionsTab';
import { useVersionsPaginated, useIsVersionsInitialLoading } from '../api/useVersionsPaginated';
import { VirtualTable, type VirtualTableColumn } from '@shared/components/pagination';
import { useShots } from '@features/shots/api/useShots';
import { useSequences } from '@features/sequences/api/useSequences';
import { useEpisodes } from '@features/episodes/api/useEpisodes';
import { useUiStore } from '@app/stores/uiStore';
import { LoadingSpinner, EmptyState } from '@shared/ui';
import type { StatusMeta, TabType } from '@shogun/shared';
import type { ApiVersion } from '@shared/api/client';

interface VersionsTabWrapperWithPaginationProps {
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  searchTerm?: string;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: { id: string | number; name?: string; code?: string }) => void;
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
 * Usage:
 * - Set useVirtualTable={true} for virtual scrolling mode
 * - Set useVirtualTable={false} for traditional table view
 * - Adjust pageSize to control initial load size (default: 100)
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

  // Use shot filter if available
  const shotId = filters.selectedShotId !== 'all' ? Number(filters.selectedShotId) : undefined;

  const query = useVersionsPaginated({ shotId, limit: pageSize });
  const isInitialLoading = useIsVersionsInitialLoading(query);

  const { data: shots = [], isLoading: shotsLoading } = useShots();
  const { data: sequences = [], isLoading: sequencesLoading } = useSequences();
  const { data: episodes = [], isLoading: episodesLoading } = useEpisodes();

  const isLoading = isInitialLoading || shotsLoading || sequencesLoading || episodesLoading;

  // Apply hierarchical filters
  const filteredVersions = useMemo(() => {
    return query.flatData.filter((version) => {
      // Filter by shot if specified
      if (
        filters.selectedShotId !== 'all' &&
        (version as any).entityCode !== filters.selectedShotId
      ) {
        return false;
      }

      // Filter by sequence through shot relationship
      if (filters.selectedSequenceId !== 'all') {
        const shot = shots.find((s) => s.code === (version as any).entityCode);
        if (!shot || shot.sequence?.code !== filters.selectedSequenceId) {
          return false;
        }
      }

      // Filter by episode through sequence-shot relationship
      if (filters.selectedEpisodeId !== 'all') {
        const shot = shots.find((s) => s.code === (version as any).entityCode);
        if (shot && shot.sequence?.code) {
          const sequence = sequences.find((seq) => seq.code === shot.sequence?.code);
          if (String(sequence?.episodeId) !== filters.selectedEpisodeId) {
            return false;
          }
        }
      }

      // Filter by project through episode-sequence-shot relationship
      if (filters.selectedProjectId !== 'all') {
        const shot = shots.find((s) => s.code === (version as any).entityCode);
        if (shot && shot.sequence?.code) {
          const sequence = sequences.find((seq) => seq.code === shot.sequence?.code);
          if (sequence) {
            const episode = episodes.find((ep) => ep.id === sequence.episodeId);
            if (String(episode?.projectId) !== filters.selectedProjectId) {
              return false;
            }
          }
        }
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
  }, [query.flatData, filters, shots, sequences, episodes, props.searchTerm]);

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
            }}
          >
            {props.statusMap[version.statusId || '']?.label || version.statusId || ''}
          </span>
        ),
      },
      {
        key: 'shot',
        header: 'Shot',
        width: 150,
        render: (version) => (version as any).entityCode || '-',
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
            props.onItemClick('versions', {
              id: version.id,
              name: version.name,
              code: version.code,
            })
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
      shots={shots}
      viewMode={viewModes.versions}
    />
  );
};
