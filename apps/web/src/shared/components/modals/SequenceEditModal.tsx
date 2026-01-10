import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUpdateSequence } from '@features/sequences/api/useSequences';
import toast from 'react-hot-toast';
import { apiService } from '../../api/client';
import type { Sequence, Status } from '@shogun/shared';

interface SequenceEditModalProps {
  sequence: Sequence | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SequenceEditModal: React.FC<SequenceEditModalProps> = ({
  sequence,
  isOpen,
  onClose,
  onSuccess,
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

    // Include current sequence status if it's not in the applicable list
    const currentStatusId = (sequence as any)?.statusId;
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
  }, [allStatuses, sequence]);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    statusId: '',
    cutOrder: 0,
    duration: 0,
    assignedTo: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const updateSequenceMutation = useUpdateSequence();

  // Update form data when sequence changes
  useEffect(() => {
    if (sequence) {
      setFormData({
        code: sequence.code || '',
        name: sequence.name || '',
        description: sequence.description || '',
        statusId: (sequence as any)?.statusId ? String((sequence as any)?.statusId) : '',
        cutOrder: sequence.cutOrder || 0,
        duration: sequence.duration || 0,
        assignedTo:
          sequence.assignedTo !== undefined && sequence.assignedTo !== null
            ? String(sequence.assignedTo)
            : '',
      });
    }
  }, [sequence]);

  // Early return if no sequence or modal is closed
  if (!sequence || !isOpen) {
    return null;
  }

  const handleInputChange = (field: keyof typeof formData) => (value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const sequenceData = {
        code: formData.code,
        name: formData.name,
        description: formData.description,
        statusId: formData.statusId,
        cutOrder: formData.cutOrder,
        duration: formData.duration,
        assignedTo: formData.assignedTo ? parseInt(formData.assignedTo, 10) : undefined,
      };

      await updateSequenceMutation.mutateAsync({
        id: sequence.id,
        data: sequenceData,
      });

      toast.success('Sequence updated successfully!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving sequence:', error);
      toast.error('Failed to update sequence. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sequence-edit-modal-title"
    >
      <div
        className="rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2
            id="sequence-edit-modal-title"
            className="text-xl font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Edit Sequence: {sequence.name}
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
                placeholder="Enter sequence code"
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
                placeholder="Enter sequence name"
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
              placeholder="Enter sequence description"
            />
          </div>

          {/* Sequence Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cut Order
              </label>
              <input
                type="number"
                value={formData.cutOrder.toString()}
                onChange={(e) => handleInputChange('cutOrder')(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
                placeholder="Enter cut order"
                required
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Duration (seconds)
              </label>
              <input
                type="number"
                value={formData.duration.toString()}
                onChange={(e) => handleInputChange('duration')(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
                placeholder="Enter duration in seconds"
                required
              />
            </div>
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
                {sequenceStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
            disabled={isSaving || updateSequenceMutation.isPending}
            className="px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => {
              if (!isSaving && !updateSequenceMutation.isPending) {
                e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSaving && !updateSequenceMutation.isPending) {
                e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
              }
            }}
          >
            {isSaving || updateSequenceMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
