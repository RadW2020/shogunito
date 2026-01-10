import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AssetsTab } from '@features/shotgrid/components/shotgrid/tabs/AssetsTab';
import { useAssets } from '../api/useAssets';
import { useUiStore } from '@app/stores/uiStore';
import { LoadingSpinner, EmptyState } from '@shared/ui';
import { apiService } from '@shared/api/client';
import type { StatusMeta, TabType, Asset, Status } from '@shogun/shared';

interface AssetsTabWrapperProps {
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  searchTerm?: string;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: { id: string | number; name?: string; code?: string }) => void;
  onEditAsset?: (asset: Asset) => void;
  onAddNoteToAsset?: (asset: Asset) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

export const AssetsTabWrapper: React.FC<AssetsTabWrapperProps> = (props) => {
  const { data: assets = [], isLoading, error } = useAssets();
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

  // Transform assets to include status code from statusId
  const transformedAssets = useMemo(() => {
    return assets.map((asset) => {
      const statusId = (asset as any)?.statusId;
      if (statusId && statusIdToCodeMap[String(statusId)]) {
        const statusCode = statusIdToCodeMap[String(statusId)];
        return {
          ...asset,
          status: statusCode,
        };
      }
      return {
        ...asset,
        status: undefined,
      };
    });
  }, [assets, statusIdToCodeMap]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading assets...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Error loading assets"
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
  const filteredAssets = transformedAssets.filter((asset) => {
    // Filter by selected project
    if (
      filters.selectedProjectId !== 'all' &&
      String(asset.projectId) !== filters.selectedProjectId
    ) {
      return false;
    }

    // Filter by selected asset
    if (filters.selectedAssetId !== 'all' && filters.selectedAssetId !== asset.code) {
      return false;
    }

    // Apply search filter
    if (props.searchTerm) {
      const searchLower = props.searchTerm.toLowerCase();
      const matchesSearch =
        asset.name?.toLowerCase().includes(searchLower) ||
        asset.description?.toLowerCase().includes(searchLower) ||
        asset.code?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    return true;
  });

  if (filteredAssets.length === 0) {
    return (
      <EmptyState
        icon="🎨"
        title="No assets found"
        description="No assets match your current filters"
        action={
          filters.selectedProjectId !== 'all' || filters.selectedAssetId !== 'all' ? (
            <button
              onClick={() => {
                const store = useUiStore.getState();
                store.setFilter('selectedProjectId', 'all');
                store.setFilter('selectedAssetId', 'all');
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

  return <AssetsTab {...props} assets={filteredAssets as Asset[]} />;
};
