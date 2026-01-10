import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../shared/Modal';
import { FormField } from '../shared/FormField';
import { useUpdateEpisode } from '@features/episodes/api/useEpisodes';
import toast from 'react-hot-toast';
import { apiService } from '../../api/client';
import type { Episode, Status } from '@shogun/shared';

interface EpisodeEditModalProps {
  episode: Episode | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface EpisodeFormData {
  code: string;
  name: string;
  description: string;
  epNumber: number;
  statusId: string;
  duration: number;
  assignedTo: string;
}

export const EpisodeEditModal: React.FC<EpisodeEditModalProps> = ({
  episode,
  isOpen,
  onClose,
  onSuccess,
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

    // Include current episode status if it's not in the applicable list
    const currentStatusId = (episode as any)?.statusId;
    if (currentStatusId) {
      const currentStatus = allStatuses.find((s: Status) => s.id === currentStatusId);
      if (currentStatus && !applicableStatuses.some((s: Status) => s.id === currentStatusId)) {
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
  }, [allStatuses, episode]);

  const [formData, setFormData] = useState<EpisodeFormData>({
    code: episode?.code || '',
    name: episode?.name || '',
    description: episode?.description || '',
    epNumber: episode?.epNumber || 0,
    statusId: (episode as any)?.statusId ? String((episode as any)?.statusId) : '',
    duration: episode?.duration || 0,
    assignedTo:
      episode?.assignedTo !== undefined && episode?.assignedTo !== null
        ? String(episode.assignedTo)
        : '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const updateEpisodeMutation = useUpdateEpisode();

  // Update form data when episode changes
  useEffect(() => {
    if (episode) {
      setFormData({
        code: episode.code || '',
        name: episode.name || '',
        description: episode.description || '',
        epNumber: episode.epNumber || 0,
        statusId: (episode as any)?.statusId ? String((episode as any)?.statusId) : '',
        duration: episode.duration || 0,
        assignedTo:
          episode.assignedTo !== undefined && episode.assignedTo !== null
            ? String(episode.assignedTo)
            : '',
      });
    }
  }, [episode]);

  // Early return if no episode or modal is closed
  if (!episode || !isOpen) {
    return null;
  }

  const handleInputChange = (field: keyof EpisodeFormData) => (value: string | number) => {
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

    if (formData.epNumber < 0) {
      newErrors.epNumber = 'Episode number must be 0 or greater';
    }

    if (formData.duration <= 0) {
      newErrors.duration = 'Duration must be greater than 0';
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
      // Clean up empty optional fields
      const episodeData: any = {
        code: formData.code,
        name: formData.name,
        epNumber: formData.epNumber || undefined,
        statusId: formData.statusId,
        duration: formData.duration,
      };

      // Only add optional fields if they have values
      if (formData.description?.trim()) {
        episodeData.description = formData.description.trim();
      }
      if (formData.assignedTo?.trim()) {
        episodeData.assignedTo = parseInt(formData.assignedTo.trim(), 10);
      }

      await updateEpisodeMutation.mutateAsync({
        id: episode.id,
        data: episodeData,
      });

      toast.success('Episode updated successfully!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating episode:', error);
      toast.error('Failed to update episode. Please try again.');
      setErrors({ submit: 'Failed to update episode. Please try again.' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Episode" size="lg">
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
            label="Episode Number"
            name="epNumber"
            type="number"
            value={formData.epNumber.toString()}
            onChange={(value) => handleInputChange('epNumber')(parseInt(value) || 0)}
            placeholder="Enter episode number"
            error={errors.epNumber}
          />

          <FormField
            label="Duration (seconds)"
            name="duration"
            type="number"
            value={formData.duration.toString()}
            onChange={(value) => handleInputChange('duration')(parseInt(value) || 0)}
            placeholder="Enter duration in seconds"
            required
            error={errors.duration}
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
            disabled={updateEpisodeMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateEpisodeMutation.isPending ? 'Updating...' : 'Update Episode'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
