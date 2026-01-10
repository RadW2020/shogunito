import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useUpdatePlaylist,
  useReorderPlaylistVersions,
} from '@features/playlists/api/usePlaylists';
import toast from 'react-hot-toast';
import { apiService } from '../../api/client';
import type { Playlist } from '@shared/api/client';
import type { Status } from '@shogun/shared';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PlaylistEditModalProps {
  playlist: Playlist | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SortableItemProps {
  id: string;
  code: string;
  index: number;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, code, index }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center space-x-2 px-3 py-2 rounded cursor-move hover:opacity-80 transition-opacity"
      title="Drag to reorder"
    >
      <svg
        className="w-4 h-4 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={{ color: 'var(--text-secondary)' }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
      </svg>
      <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
        #{index + 1}
      </span>
      <span
        className="px-2 py-1 text-xs rounded flex-grow"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--text-primary)',
        }}
      >
        {code}
      </span>
    </div>
  );
};

export const PlaylistEditModal: React.FC<PlaylistEditModalProps> = ({
  playlist,
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Fetch statuses from API
  const { data: allStatuses = [] } = useQuery<Status[]>({
    queryKey: ['statuses'],
    queryFn: () => apiService.getStatuses(),
  });

  // Filter statuses applicable to playlists
  const playlistStatusOptions = useMemo(() => {
    const applicableStatuses = allStatuses.filter(
      (status: Status) =>
        status.isActive &&
        (status.applicableEntities?.includes('all') ||
          status.applicableEntities?.includes('playlist')),
    );

    // Include current playlist status if it's not in the applicable list
    const currentStatusId = playlist?.statusId;
    if (currentStatusId) {
      const currentStatus = allStatuses.find((s: Status) => String(s.id) === currentStatusId);
      if (
        currentStatus &&
        !applicableStatuses.some((s: Status) => String(s.id) === currentStatusId)
      ) {
        applicableStatuses.push(currentStatus);
      }
    }

    return applicableStatuses
      .sort((a, b) => {
        // Sort by sortOrder first, then by name
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return (a.name || a.code).localeCompare(b.name || b.code);
      })
      .map((status) => ({
        value: String(status.id),
        label: status.name || status.code,
      }));
  }, [allStatuses, playlist]);

  const [formData, setFormData] = useState({
    code: playlist?.code || '',
    name: playlist?.name || '',
    description: playlist?.description || '',
    statusId: playlist?.statusId ? String(playlist.statusId) : '',
    versionCodes: playlist?.versionCodes || [],
    assignedTo:
      playlist?.assignedTo !== undefined && playlist?.assignedTo !== null
        ? String(playlist.assignedTo)
        : '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const updatePlaylistMutation = useUpdatePlaylist();
  const reorderVersionsMutation = useReorderPlaylistVersions();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Update form data when playlist changes
  useEffect(() => {
    if (playlist) {
      setFormData({
        code: playlist.code || '',
        name: playlist.name || '',
        description: playlist.description || '',
        statusId: playlist.statusId ? String(playlist.statusId) : '',
        versionCodes: playlist.versionCodes || [],
        assignedTo:
          playlist.assignedTo !== undefined && playlist.assignedTo !== null
            ? String(playlist.assignedTo)
            : '',
      });
    }
  }, [playlist]);

  const handleInputChange = (field: keyof typeof formData) => (value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.versionCodes.indexOf(active.id as string);
        const newIndex = prev.versionCodes.indexOf(over.id as string);
        const newVersionCodes = arrayMove(prev.versionCodes, oldIndex, newIndex);
        return { ...prev, versionCodes: newVersionCodes };
      });
    }
  };

  const handleSave = async () => {
    if (!playlist) return;

    setIsSaving(true);
    try {
      // First update the playlist metadata
      const playlistData = {
        code: formData.code,
        name: formData.name,
        description: formData.description,
        statusId: formData.statusId,
        versionCodes: formData.versionCodes,
        assignedTo: formData.assignedTo ? parseInt(formData.assignedTo, 10) : undefined,
      };

      await updatePlaylistMutation.mutateAsync({
        id: playlist.id,
        data: playlistData,
      });

      // Then update the version order if it changed
      const originalOrder = playlist.versionCodes || [];
      const newOrder = formData.versionCodes;
      const orderChanged = JSON.stringify(originalOrder) !== JSON.stringify(newOrder);

      if (orderChanged && newOrder.length > 0) {
        await reorderVersionsMutation.mutateAsync({
          playlistId: playlist.id,
          versionCodes: newOrder,
        });
      }

      toast.success('Playlist updated successfully!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving playlist:', error);
      toast.error('Failed to update playlist. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Early return if no playlist or modal is closed
  if (!playlist || !isOpen) {
    return null;
  }

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
            Edit Playlist: {playlist.name}
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
                value={formData.code}
                onChange={(e) => handleInputChange('code')(e.target.value)}
                className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
                placeholder="Enter playlist code"
                required
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
                value={formData.name}
                onChange={(e) => handleInputChange('name')(e.target.value)}
                className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
                placeholder="Enter playlist name"
                required
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
              value={formData.description}
              onChange={(e) => handleInputChange('description')(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
              }}
              placeholder="Enter playlist description"
            />
          </div>

          {/* Status and Assigned To */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Status
              </label>
              <select
                value={formData.statusId}
                onChange={(e) => handleInputChange('statusId')(e.target.value)}
                className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
                required
              >
                <option value="">Select a status</option>
                {playlistStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Assigned To
              </label>
              <input
                type="text"
                value={formData.assignedTo}
                onChange={(e) => handleInputChange('assignedTo')(e.target.value)}
                className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
                placeholder="Enter assigned person"
              />
            </div>
          </div>

          {/* Version Codes List with Drag & Drop */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Versions ({formData.versionCodes.length})
              <span className="ml-2 text-xs font-normal">(Drag to reorder)</span>
            </label>
            <div
              className="p-3 rounded-md max-h-64 overflow-y-auto"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
              }}
            >
              {formData.versionCodes.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={formData.versionCodes}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1">
                      {formData.versionCodes.map((code, index) => (
                        <SortableItem key={code} id={code} code={code} index={index} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div
                  className="text-center py-4 text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  No versions in this playlist
                </div>
              )}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
              Drag versions to reorder them. The order will be saved when you click "Save Changes".
            </p>
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
            disabled={isSaving || updatePlaylistMutation.isPending}
            className="px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => {
              if (!isSaving && !updatePlaylistMutation.isPending) {
                e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSaving && !updatePlaylistMutation.isPending) {
                e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
              }
            }}
          >
            {isSaving || updatePlaylistMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
