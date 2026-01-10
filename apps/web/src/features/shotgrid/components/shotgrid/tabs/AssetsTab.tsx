import React, { useState } from 'react';
import { DataTable, type TableColumn } from '../DataTable';
import { StatusBadge } from '../StatusBadge';
import { NoteBadge } from '../../../../../shared/components/shared/NoteBadge';
import { AssetEditModal } from '../../../../../shared/components/modals/AssetEditModal';
import { useNotesSorting } from '../hooks/useNotesSorting';
import { useNotesByEntity } from '../../../../../features/notes/api/useNotes';
import type { Asset, StatusMeta, TabType } from '@shogun/shared';

interface AssetNotesCellProps {
  item: Asset;
  onAddNote?: (asset: Asset) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

const AssetNotesCell: React.FC<AssetNotesCellProps> = ({ item, onAddNote, onViewNotes }) => {
  const { data: notes = [], isLoading } = useNotesByEntity(item.id, 'Asset');
  const hasNotes = notes.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div
          className="w-4 h-4 rounded-full animate-pulse"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {hasNotes ? (
        <NoteBadge
          linkId={item.id}
          linkType="Asset"
          showCount={true}
          showUnread={true}
          onClick={() => onViewNotes?.(String(item.id), 'Asset', item.name)}
          className="cursor-pointer"
        />
      ) : (
        <button
          onClick={() => onAddNote?.(item)}
          className="px-2 py-1 text-xs rounded transition-colors"
          style={{
            backgroundColor: 'var(--status-success)',
            color: 'white',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--status-success-hover)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--status-success)')
          }
          title="Add Note"
        >
          + Note
        </button>
      )}
    </div>
  );
};

interface AssetsTabProps {
  assets: Asset[];
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: Asset) => void;
  onEditAsset?: (asset: Asset) => void;
  onAddNoteToAsset?: (asset: Asset) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

export const AssetsTab: React.FC<AssetsTabProps> = ({
  assets,
  statusMap,
  selectedItems,
  onItemSelect,
  onSelectAll,
  onItemClick,
  onEditAsset,
  onAddNoteToAsset,
  onViewNotes,
}) => {
  // Use notes sorting hook
  const { dataWithNotesCounts, sortByUnreadNotes } = useNotesSorting(assets, 'code', 'Asset');

  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleAssetUpdate = () => {
    console.log('Asset updated');
    setShowEditModal(false);
    setEditingAsset(null);
  };

  const columns: TableColumn[] = [
    { label: 'Code', field: 'code' },
    { label: 'Name', field: 'name' },
    { label: 'Type', field: 'assetType' },
    {
      label: 'Status',
      field: 'status',
      render: (item: Asset) => {
        if (!item.status) return <span>-</span>;
        return <StatusBadge status={item.status} meta={statusMap[item.status]} />;
      },
    },
    { label: 'Description', field: 'description' },
    {
      label: 'Notes',
      field: 'notes',
      render: (item: Asset) => (
        <AssetNotesCell
          item={item}
          onAddNote={onAddNoteToAsset}
          onViewNotes={onViewNotes}
        />
      ),
    },
    {
      label: 'Thumbnail',
      field: 'thumbnailPath',
      render: (item: Asset) => (
        <div className="flex items-center space-x-2">
          {item.thumbnailPath ? (
            <img
              src={item.thumbnailPath}
              alt={item.name}
              className="w-8 h-8 object-cover rounded border"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-200 rounded border flex items-center justify-center">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>
      ),
    },
    {
      label: 'Actions',
      field: 'actions',
      render: (item: Asset) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEditAsset?.(item)}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
            title="Edit Asset"
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={dataWithNotesCounts}
        entityType="assets"
        selectedItems={selectedItems}
        onItemSelect={onItemSelect}
        onSelectAll={onSelectAll}
        onItemClick={onItemClick}
        customSortFunctions={{
          notes: sortByUnreadNotes,
        }}
      />

      {/* Edit Modal */}
      {editingAsset && (
        <AssetEditModal
          asset={editingAsset as any}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingAsset(null);
          }}
          onSuccess={handleAssetUpdate}
        />
      )}
    </div>
  );
};
