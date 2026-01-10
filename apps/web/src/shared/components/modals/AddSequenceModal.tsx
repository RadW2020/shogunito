import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../shared/Modal';
import { FormField } from '../shared/FormField';
import { useCreateSequence } from '@features/sequences/api/useSequences';
import { showToast } from '../feedback';
import { apiService } from '../../api/client';
import type { Status } from '@shogun/shared';

interface AddSequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  episodes: Array<{ id: number; name: string; code: string }>;
}

interface SequenceFormData {
  code: string;
  name: string;
  description: string;
  cutOrder: string;
  statusId: string;
  duration: string;
  storyId: string;
  episodeId: string;
  assignedTo: string;
}

export const AddSequenceModal: React.FC<AddSequenceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  episodes,
}) => {
  // Fetch statuses from API
  const { data: allStatuses = [] } = useQuery<Status[]>({
    queryKey: ['statuses'],
    queryFn: () => apiService.getStatuses(),
  });

  // Filter statuses applicable to sequences
  const sequenceStatusOptions = useMemo(() => {
    const applicableStatuses = allStatuses.filter(
      (status: Status) =>
        status.isActive &&
        (status.applicableEntities?.includes('all') ||
          status.applicableEntities?.includes('sequence')),
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

  const [formData, setFormData] = useState<SequenceFormData>({
    code: '',
    name: '',
    description: '',
    cutOrder: '',
    statusId: '',
    duration: '',
    storyId: '',
    episodeId: '',
    assignedTo: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const createSequenceMutation = useCreateSequence();

  const episodeOptions = episodes.map((episode) => ({
    value: String(episode.id),
    label: `${episode.code} - ${episode.name}`,
  }));

  const handleInputChange = (field: keyof SequenceFormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Sequence code is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Sequence name is required';
    }

    if (!formData.statusId) {
      newErrors.statusId = 'Status is required';
    }

    if (!formData.episodeId) {
      newErrors.episodeId = 'Episode is required';
    }

    if (!formData.cutOrder.trim()) {
      newErrors.cutOrder = 'Cut order is required';
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
      const sequenceData: any = {
        episodeId: parseInt(formData.episodeId, 10), // Convert string to number
        code: formData.code,
        name: formData.name,
        cutOrder: parseInt(formData.cutOrder, 10),
        statusId: formData.statusId,
      };

      // Only add optional fields if they have values
      if (formData.storyId?.trim()) {
        sequenceData.storyId = formData.storyId.trim();
      }
      if (formData.description?.trim()) {
        sequenceData.description = formData.description.trim();
      }
      if (formData.duration?.trim()) {
        sequenceData.duration = parseInt(formData.duration);
      }
      if (formData.assignedTo?.trim()) {
        sequenceData.assignedTo = parseInt(formData.assignedTo.trim(), 10);
      }

      await createSequenceMutation.mutateAsync(sequenceData);

      showToast.success('Sequence created successfully!');

      // Wait for onSuccess to complete (e.g., refreshData) before closing
      if (onSuccess) {
        await onSuccess();
      }

      onClose();
      // Reset form
      setFormData({
        code: '',
        name: '',
        description: '',
        cutOrder: '',
        statusId: '',
        duration: '',
        storyId: '',
        episodeId: '',
        assignedTo: '',
      });
      setErrors({});
    } catch (error) {
      console.error('Error creating sequence:', error);
      setErrors({ submit: 'Failed to create sequence. Please try again.' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Sequence" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Sequence Code"
            name="code"
            value={formData.code}
            onChange={handleInputChange('code')}
            placeholder="e.g., SEQ-001"
            required
            error={errors.code}
          />

          <FormField
            label="Sequence Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange('name')}
            placeholder="Enter sequence name"
            required
            error={errors.name}
          />

          <FormField
            label="Episode"
            name="episodeId"
            type="select"
            value={formData.episodeId}
            onChange={handleInputChange('episodeId')}
            options={episodeOptions}
            required
            error={errors.episodeId}
          />

          <FormField
            label="Status"
            name="statusId"
            type="select"
            value={formData.statusId}
            onChange={handleInputChange('statusId')}
            options={sequenceStatusOptions}
            required
            error={errors.statusId}
          />

          <FormField
            label="Cut Order"
            name="cutOrder"
            type="number"
            value={formData.cutOrder}
            onChange={handleInputChange('cutOrder')}
            placeholder="Enter cut order number"
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
            label="Story ID"
            name="storyId"
            value={formData.storyId}
            onChange={handleInputChange('storyId')}
            placeholder="Enter story ID"
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
          placeholder="Enter sequence description"
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
            disabled={createSequenceMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="create-sequence-submit"
          >
            {createSequenceMutation.isPending ? 'Creating...' : 'Create Sequence'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
