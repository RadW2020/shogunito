import React, { useState } from 'react';
import {
  useCreatePlaylistFromVersions,
  type CreatePlaylistFromVersionsData,
} from '@features/playlists/api/usePlaylists';
import { useProjects } from '@features/projects/api/useProjects';
import toast from 'react-hot-toast';
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

interface CreatePlaylistFromVersionsModalProps {
  versionCodes: string[];
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

export const CreatePlaylistFromVersionsModal: React.FC<CreatePlaylistFromVersionsModalProps> = ({
  versionCodes: initialVersionCodes,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { data: projects = [] } = useProjects();
  const createPlaylistMutation = useCreatePlaylistFromVersions();

  const [orderedVersionCodes, setOrderedVersionCodes] = useState<string[]>(initialVersionCodes);

  type PlaylistFromVersionsForm = Omit<
    CreatePlaylistFromVersionsData,
    'versionCodes' | 'createdBy' | 'assignedTo'
  > & {
    createdBy: string;
    assignedTo: string;
  };

  const [formData, setFormData] = useState<PlaylistFromVersionsForm>({
    code: '',
    name: '',
    description: `Playlist created from ${initialVersionCodes.length} selected versions`,
    projectId: projects[0]?.id || 0,
    status: 'waiting',
    createdBy: '',
    assignedTo: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedVersionCodes((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name || !formData.projectId) {
      toast.error('Please fill in all required fields (Code, Name, Project)');
      return;
    }

    setIsSaving(true);
    try {
      await createPlaylistMutation.mutateAsync({
        ...formData,
        projectId: formData.projectId,
        versionCodes: orderedVersionCodes,
        createdBy: formData.createdBy ? parseInt(formData.createdBy, 10) : undefined,
        assignedTo: formData.assignedTo ? parseInt(formData.assignedTo, 10) : undefined,
      });
      toast.success('Playlist created successfully!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Failed to create playlist. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
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
            Create Playlist from {initialVersionCodes.length} Selected Version
            {initialVersionCodes.length > 1 ? 's' : ''}
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
                Code <span className="text-red-500">*</span>
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
                placeholder="PL_REVIEW"
                required
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Name <span className="text-red-500">*</span>
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
                placeholder="Review Playlist"
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

          {/* Project Selection */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              Project <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => handleInputChange('projectId')(e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
              }}
              required
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.code})
                </option>
              ))}
            </select>
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
                value={formData.status}
                onChange={(e) => handleInputChange('status')(e.target.value)}
                className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <option value="waiting">Waiting</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="approved">Approved</option>
                <option value="final">Finished</option>
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
                placeholder="user@studio.com"
              />
            </div>
          </div>

          {/* Version Codes List with Drag & Drop */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Selected Versions ({orderedVersionCodes.length})
              <span className="ml-2 text-xs font-normal">(Drag to reorder)</span>
            </label>
            <div
              className="p-3 rounded-md max-h-64 overflow-y-auto"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
              }}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={orderedVersionCodes} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {orderedVersionCodes.map((code, index) => (
                      <SortableItem key={code} id={code} code={code} index={index} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
              The order here will be preserved in the playlist
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
            disabled={isSaving || createPlaylistMutation.isPending}
            className="px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => {
              if (!isSaving && !createPlaylistMutation.isPending) {
                e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSaving && !createPlaylistMutation.isPending) {
                e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
              }
            }}
          >
            {isSaving || createPlaylistMutation.isPending ? 'Creating...' : 'Create Playlist'}
          </button>
        </div>
      </div>
    </div>
  );
};
