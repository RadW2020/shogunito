import React, { useState } from 'react';
import { Modal } from '../shared/Modal';
import { FormField } from '../shared/FormField';
import { useCreatePlaylist } from '@features/playlists/api/usePlaylists';
import { useProjects } from '@features/projects/api/useProjects';
import toast from 'react-hot-toast';

interface AddPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PlaylistFormData {
  code: string;
  name: string;
  description: string;
  status: string;
  projectId: string;
  assignedTo: string;
}

const PLAYLIST_STATUS_OPTIONS = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'final', label: 'Final' },
];

export const AddPlaylistModal: React.FC<AddPlaylistModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<PlaylistFormData>({
    code: '',
    name: '',
    description: '',
    status: 'waiting',
    projectId: '',
    assignedTo: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: projects = [] } = useProjects();
  const createPlaylistMutation = useCreatePlaylist();

  const projectOptions = projects.map((project) => ({
    value: String(project.id),
    label: `${project.code} - ${project.name}`,
  }));

  const handleInputChange = (field: keyof PlaylistFormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.projectId) {
      newErrors.projectId = 'Project is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createPlaylistMutation.mutateAsync({
        code: formData.code,
        name: formData.name,
        description: formData.description || undefined,
        status: formData.status as 'waiting',
        projectId: parseInt(formData.projectId, 10), // Convert string to number - API expects projectId, not project
        assignedTo: formData.assignedTo ? parseInt(formData.assignedTo, 10) : undefined,
      } as any); // Type assertion needed because Playlist type has project?: Project but API expects projectId

      toast.success('Playlist created successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating playlist:', error);
      toast.error(error.message || 'Failed to create playlist');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        code: '',
        name: '',
        description: '',
        status: 'waiting',
        projectId: '',
        assignedTo: '',
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Playlist" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Code"
          name="code"
          type="text"
          value={formData.code}
          onChange={handleInputChange('code')}
          placeholder="Enter playlist code (e.g., PL001)"
          required
          error={errors.code}
        />

        <FormField
          label="Name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleInputChange('name')}
          placeholder="Enter playlist name"
          required
          error={errors.name}
        />

        <FormField
          label="Description"
          name="description"
          type="textarea"
          value={formData.description}
          onChange={handleInputChange('description')}
          placeholder="Enter playlist description"
          rows={3}
        />

        <FormField
          label="Project"
          name="projectId"
          type="select"
          value={formData.projectId}
          onChange={handleInputChange('projectId')}
          options={projectOptions}
          required
          error={errors.projectId}
        />

        <FormField
          label="Status"
          name="status"
          type="select"
          value={formData.status}
          onChange={handleInputChange('status')}
          options={PLAYLIST_STATUS_OPTIONS}
          required
        />

        <FormField
          label="Assigned To"
          name="assignedTo"
          type="text"
          value={formData.assignedTo}
          onChange={handleInputChange('assignedTo')}
          placeholder="Enter assignee email or name"
        />

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium rounded-md border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Playlist'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
