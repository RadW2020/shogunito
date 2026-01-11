import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../shared/Modal';
import { FormField } from '../shared/FormField';
import { useCreateEpisode } from '@features/episodes/api/useEpisodes';
import toast from 'react-hot-toast';
import { apiService } from '../../api/client';
import type { Status } from '@shogunito/shared';

interface AddEpisodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projects: Array<{ id: number; name: string; code: string }>;
}

interface EpisodeFormData {
  code: string;
  name: string;
  description: string;
  cutOrder: string;
  statusId: string;
  duration: string;
  projectId: string;
  assignedTo: string;
}

export const AddEpisodeModal: React.FC<AddEpisodeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projects,
}) => {
  // Fetch statuses from API
  const { data: allStatuses = [] } = useQuery<Status[]>({
    queryKey: ['statuses'],
    queryFn: () => apiService.getStatuses(),
  });

  // Filter statuses applicable to episodes
  const episodeStatusOptions = useMemo(() => {
    const applicableStatuses = allStatuses.filter(
      (status: Status) =>
        status.isActive &&
        (status.applicableEntities?.includes('all') ||
          status.applicableEntities?.includes('episode')),
    );

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
  }, [allStatuses]);

  const [formData, setFormData] = useState<EpisodeFormData>({
    code: '',
    name: '',
    description: '',
    cutOrder: '',
    statusId: '',
    duration: '',
    projectId: '',
    assignedTo: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const createEpisodeMutation = useCreateEpisode();

  const projectOptions = projects.map((project) => ({
    value: String(project.id),
    label: `${project.code} - ${project.name}`,
  }));

  const handleInputChange = (field: keyof EpisodeFormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Episode code is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Episode name is required';
    }

    if (!formData.statusId) {
      newErrors.statusId = 'Status is required';
    }

    if (!formData.projectId) {
      newErrors.projectId = 'Project is required';
    } else {
      // Validate that projectId is a valid number
      const projectIdNum = parseInt(formData.projectId, 10);
      if (isNaN(projectIdNum) || projectIdNum <= 0) {
        newErrors.projectId = 'Invalid project selected';
      }
    }

    if (!formData.cutOrder.trim()) {
      newErrors.cutOrder = 'Cut order is required';
    } else {
      const cutOrderNum = parseInt(formData.cutOrder, 10);
      if (isNaN(cutOrderNum) || cutOrderNum < 1) {
        newErrors.cutOrder = 'Cut order must be at least 1';
      }
    }

    if (formData.duration && parseInt(formData.duration) < 0) {
      newErrors.duration = 'Duration must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Validate projectId before proceeding
      const projectIdNum = parseInt(formData.projectId, 10);
      if (isNaN(projectIdNum) || projectIdNum <= 0) {
        throw new Error('Invalid project selected');
      }

      // Clean up empty optional fields
      const episodeData: any = {
        projectId: projectIdNum, // Convert string to number
        code: formData.code,
        name: formData.name,
        cutOrder: parseInt(formData.cutOrder, 10),
        statusId: formData.statusId,
      };

      // Only add optional fields if they have values
      if (formData.description?.trim()) {
        episodeData.description = formData.description.trim();
      }
      if (formData.duration?.trim()) {
        episodeData.duration = parseInt(formData.duration);
      }
      if (formData.assignedTo?.trim()) {
        episodeData.assignedTo = parseInt(formData.assignedTo.trim(), 10);
      }

      await createEpisodeMutation.mutateAsync(episodeData);

      toast.success('Episode created successfully!');
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        code: '',
        name: '',
        description: '',
        cutOrder: '',
        statusId: '',
        duration: '',
        projectId: '',
        assignedTo: '',
      });
      setErrors({});
    } catch (error) {
      console.error('Error creating episode:', error);
      toast.error('Failed to create episode. Please try again.');
      setErrors({ submit: 'Failed to create episode. Please try again.' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Episode" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Episode Code"
            name="code"
            value={formData.code}
            onChange={handleInputChange('code')}
            placeholder="e.g., EP-001"
            required
            error={errors.code}
          />

          <FormField
            label="Episode Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange('name')}
            placeholder="Enter episode name"
            required
            error={errors.name}
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
            name="statusId"
            type="select"
            value={formData.statusId}
            onChange={handleInputChange('statusId')}
            options={episodeStatusOptions}
            required
            error={errors.statusId}
          />

          <FormField
            label="Cut Order"
            name="cutOrder"
            type="number"
            value={formData.cutOrder}
            onChange={handleInputChange('cutOrder')}
            placeholder="Enter cut order"
            required
            error={errors.cutOrder}
          />

          <FormField
            label="Duration (seconds)"
            name="duration"
            type="number"
            value={formData.duration}
            onChange={handleInputChange('duration')}
            placeholder="Enter duration in seconds"
          />

          <FormField
            label="Assigned To"
            name="assignedTo"
            value={formData.assignedTo}
            onChange={handleInputChange('assignedTo')}
            placeholder="Enter assignee name"
          />
        </div>

        <FormField
          label="Description"
          name="description"
          type="textarea"
          value={formData.description}
          onChange={handleInputChange('description')}
          placeholder="Enter episode description"
          rows={3}
        />

        {errors.submit && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errors.submit}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createEpisodeMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createEpisodeMutation.isPending ? 'Creating...' : 'Create Episode'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
