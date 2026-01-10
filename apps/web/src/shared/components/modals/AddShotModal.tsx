import React, { useState } from 'react';
import { Modal } from '../shared/Modal';
import { FormField } from '../shared/FormField';
import { useCreateShot } from '@features/shots/api/useShots';
import { showToast } from '../feedback';

interface AddShotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  sequences: Array<{ id: number; name: string; code: string }>;
}

interface ShotFormData {
  code: string;
  name: string;
  description: string;
  sequenceNumber: string;
  status: string;
  shotType: string;
  duration: string;
  cutOrder: string;
  sequenceId: string;
  assignedTo: string;
}

const SHOT_STATUS_OPTIONS = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'final', label: 'Final' },
];

const SHOT_TYPE_OPTIONS = [
  { value: 'establishing', label: 'Establishing' },
  { value: 'medium', label: 'Medium' },
  { value: 'closeup', label: 'Close-up' },
  { value: 'detail', label: 'Detail' },
];

export const AddShotModal: React.FC<AddShotModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sequences,
}) => {
  const [formData, setFormData] = useState<ShotFormData>({
    code: '',
    name: '',
    description: '',
    sequenceNumber: '',
    status: 'waiting',
    shotType: '',
    duration: '',
    cutOrder: '',
    sequenceId: '',
    assignedTo: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const createShotMutation = useCreateShot();

  const sequenceOptions = sequences.map((sequence) => ({
    value: String(sequence.id),
    label: `${sequence.code} - ${sequence.name}`,
  }));

  const handleInputChange = (field: keyof ShotFormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Shot code is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Shot name is required';
    }

    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    if (!formData.sequenceId) {
      newErrors.sequenceId = 'Sequence is required';
    }

    if (!formData.sequenceNumber.trim()) {
      newErrors.sequenceNumber = 'Sequence number is required';
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
      const shotData: any = {
        sequenceId: parseInt(formData.sequenceId), // Backend expects sequenceId (number)
        code: formData.code,
        name: formData.name,
        sequenceNumber: parseInt(formData.sequenceNumber),
        status: formData.status,
      };

      // Only add optional fields if they have values
      if (formData.description?.trim()) {
        shotData.description = formData.description.trim();
      }
      if (formData.shotType?.trim()) {
        shotData.shotType = formData.shotType.trim();
      }
      if (formData.duration?.trim()) {
        shotData.duration = parseInt(formData.duration);
      }
      if (formData.cutOrder?.trim()) {
        shotData.cutOrder = parseInt(formData.cutOrder);
      }
      if (formData.assignedTo?.trim()) {
        shotData.assignedTo = parseInt(formData.assignedTo.trim(), 10);
      }

      await createShotMutation.mutateAsync(shotData);

      showToast.success('Shot created successfully!');

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
        sequenceNumber: '',
        status: 'waiting',
        shotType: '',
        duration: '',
        cutOrder: '',
        sequenceId: '',
        assignedTo: '',
      });
      setErrors({});
    } catch (error) {
      console.error('Error creating shot:', error);
      showToast.error('Failed to create shot. Please try again.');
      setErrors({ submit: 'Failed to create shot. Please try again.' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Shot" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Shot Code"
            name="code"
            value={formData.code}
            onChange={handleInputChange('code')}
            placeholder="e.g., SHOT-001"
            required
            error={errors.code}
          />

          <FormField
            label="Shot Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange('name')}
            placeholder="Enter shot name"
            required
            error={errors.name}
          />

          <FormField
            label="Sequence"
            name="sequenceId"
            type="select"
            value={formData.sequenceId}
            onChange={handleInputChange('sequenceId')}
            options={sequenceOptions}
            required
            error={errors.sequenceId}
          />

          <FormField
            label="Status"
            name="status"
            type="select"
            value={formData.status}
            onChange={handleInputChange('status')}
            options={SHOT_STATUS_OPTIONS}
            required
            error={errors.status}
          />

          <FormField
            label="Sequence Number"
            name="sequenceNumber"
            type="number"
            value={formData.sequenceNumber}
            onChange={handleInputChange('sequenceNumber')}
            placeholder="Enter sequence number"
            required
            error={errors.sequenceNumber}
          />

          <FormField
            label="Shot Type"
            name="shotType"
            type="select"
            value={formData.shotType}
            onChange={handleInputChange('shotType')}
            options={SHOT_TYPE_OPTIONS}
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
            label="Cut Order"
            name="cutOrder"
            type="number"
            value={formData.cutOrder}
            onChange={handleInputChange('cutOrder')}
            placeholder="Enter cut order number"
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
          placeholder="Enter shot description"
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
            disabled={createShotMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createShotMutation.isPending ? 'Creating...' : 'Create Shot'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
