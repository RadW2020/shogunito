import React, { useState, useEffect, useMemo } from 'react';
import { AssetThumbnailUpload } from '../shared/AssetThumbnailUpload';
import { useUpdateAsset } from '@features/assets/api/useAssets';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@shared/api/client';
import type { Asset, Status } from '@shogun/shared';

interface AssetEditModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AssetEditModal: React.FC<AssetEditModalProps> = ({
  asset,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [editedAsset, setEditedAsset] = useState<Asset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const updateAssetMutation = useUpdateAsset();

  // Fetch statuses from API
  const { data: allStatuses = [] } = useQuery<Status[]>({
    queryKey: ['statuses'],
    queryFn: () => apiService.getStatuses(),
  });

  // Filter statuses applicable to assets
  const assetStatuses = useMemo(() => {
    const applicableStatuses = allStatuses.filter(
      (status: Status) =>
        status.isActive &&
        (status.applicableEntities?.includes('all') ||
          status.applicableEntities?.includes('asset')),
    );

    // Include current asset status if it's not in the applicable list
    const currentStatusId = (editedAsset as any)?.statusId;
    if (currentStatusId) {
      const currentStatus = allStatuses.find((s: Status) => s.id === currentStatusId);
      if (currentStatus && !applicableStatuses.some((s: Status) => s.id === currentStatusId)) {
        applicableStatuses.push(currentStatus);
      }
    }

    return applicableStatuses.sort((a, b) => {
      // Sort by sortOrder first, then by name
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return (a.name || a.code).localeCompare(b.name || b.code);
    });
  }, [allStatuses, editedAsset]);

  // Update edited asset when asset changes
  useEffect(() => {
    if (asset) {
      // Ensure statusId is available from the asset
      setEditedAsset({
        ...asset,
        statusId: (asset as any)?.statusId || undefined,
      } as any);
    }
  }, [asset]);

  // Early return if no asset or modal is closed
  if (!asset || !isOpen || !editedAsset) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const statusId =
        (editedAsset as any)?.statusId ||
        (editedAsset?.status
          ? allStatuses.find((s: Status) => s.code === editedAsset.status)?.id
          : null);

      await updateAssetMutation.mutateAsync({
        id: asset.id,
        data: {
          code: editedAsset.code,
          name: editedAsset.name,
          description: editedAsset.description,
          assetType: editedAsset.assetType,
          statusId: statusId,
          assignedTo: editedAsset.assignedTo
            ? parseInt(editedAsset.assignedTo as any, 10)
            : undefined,
        } as any,
      });

      toast.success('Asset updated successfully!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving asset:', error);
      toast.error('Failed to update asset. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThumbnailUpload = (updatedAsset: Asset) => {
    setEditedAsset(updatedAsset);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Edit Asset: {asset.name}
          </h2>
          <button
            onClick={onClose}
            className="hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Code
              </label>
              <input
                type="text"
                value={editedAsset.code}
                onChange={(e) => setEditedAsset({ ...editedAsset, code: e.target.value })}
                className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Name
              </label>
              <input
                type="text"
                value={editedAsset.name}
                onChange={(e) => setEditedAsset({ ...editedAsset, name: e.target.value })}
                className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
              />
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              Description
            </label>
            <textarea
              value={editedAsset.description}
              onChange={(e) => setEditedAsset({ ...editedAsset, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
              }}
            />
          </div>

          {/* Current Thumbnail */}
          {editedAsset.thumbnailPath && (
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Current Thumbnail
              </label>
              <div className="flex items-center space-x-4">
                <img
                  src={editedAsset.thumbnailPath}
                  alt={editedAsset.name}
                  className="w-24 h-24 object-cover rounded border"
                  style={{ borderColor: 'var(--border-primary)' }}
                />
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <p>
                    <strong>URL:</strong> {editedAsset.thumbnailPath}
                  </p>
                  <p>
                    <strong>Source:</strong>{' '}
                    {editedAsset.thumbnailPath.includes('localhost:9000') ? 'MinIO' : 'External'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Thumbnail Upload */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Upload New Thumbnail
            </label>
            <AssetThumbnailUpload
              asset={editedAsset}
              onSuccess={handleThumbnailUpload}
              onError={(error) => console.error('Upload error:', error)}
              className="max-w-md"
            />
          </div>

          {/* Asset Type and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Asset Type
              </label>
              <select
                value={editedAsset.assetType}
                onChange={(e) =>
                  setEditedAsset({
                    ...editedAsset,
                    assetType: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <option value="character">Character</option>
                <option value="subtitles">Subtitles</option>
                <option value="imagen">Imagen</option>
                <option value="audio">Audio</option>
                <option value="script">Script</option>
                <option value="text">Text</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Status
              </label>
              <select
                value={(editedAsset as any)?.statusId || ''}
                onChange={(e) => {
                  const selectedStatusId = e.target.value;
                  setEditedAsset({
                    ...editedAsset,
                    statusId: selectedStatusId || undefined,
                  } as any);
                }}
                className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <option value="">Select a status...</option>
                {assetStatuses.length === 0 ? (
                  <option value="">Loading statuses...</option>
                ) : (
                  assetStatuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name || status.code}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              Assigned To
            </label>
            <input
              type="text"
              value={editedAsset.assignedTo ?? ''}
              onChange={(e) =>
                setEditedAsset({
                  ...editedAsset,
                  assignedTo: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex justify-end space-x-3 mt-6 pt-6"
          style={{ borderTop: '1px solid var(--border-primary)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md transition-colors"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-primary)')}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || updateAssetMutation.isPending}
            className="px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => {
              if (!isSaving && !updateAssetMutation.isPending) {
                e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSaving && !updateAssetMutation.isPending) {
                e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
              }
            }}
          >
            {isSaving || updateAssetMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
