import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUpdateShot } from '@features/shots/api/useShots';
import toast from 'react-hot-toast';
import { apiService } from '../../api/client';
import type { Shot, Status } from '@shogun/shared';

interface ShotEditModalProps {
  shot: Shot | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ShotEditModal: React.FC<ShotEditModalProps> = ({
  shot,
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Fetch statuses from API
  const { data: allStatuses = [] } = useQuery<Status[]>({
    queryKey: ['statuses'],
    queryFn: () => apiService.getStatuses(),
  });

  // Filter statuses applicable to shots
  const shotStatusOptions = useMemo(() => {
    const applicableStatuses = allStatuses.filter(
      (status: Status) =>
        status.isActive &&
        (status.applicableEntities?.includes('all') || status.applicableEntities?.includes('shot')),
    );

    // Include current shot status if it's not in the applicable list
    const currentStatusId = (shot as any)?.statusId;
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
  }, [allStatuses, shot]);

  const [formData, setFormData] = useState({
    code: shot?.code || '',
    name: shot?.name || '',
    description: shot?.description || '',
    statusId: '',
    shotType: shot?.shotType || 'medium',
    sequenceNumber: shot?.sequenceNumber || 0,
    duration: shot?.duration || 0,
    cutOrder: shot?.cutOrder || 0,
    assignedTo:
      shot?.assignedTo !== undefined && shot?.assignedTo !== null ? String(shot.assignedTo) : '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const updateShotMutation = useUpdateShot();

  // Update form data when shot changes
  useEffect(() => {
    if (shot) {
      setFormData({
        code: shot.code || '',
        name: shot.name || '',
        description: shot.description || '',
        statusId: (shot as any)?.statusId || '',
        shotType: shot.shotType || 'medium',
        sequenceNumber: shot.sequenceNumber || 0,
        duration: shot.duration || 0,
        cutOrder: shot.cutOrder || 0,
        assignedTo:
          shot.assignedTo !== undefined && shot.assignedTo !== null ? String(shot.assignedTo) : '',
      });
    }
  }, [shot]);

  // Early return if no shot or modal is closed
  if (!shot || !isOpen) {
    return null;
  }

  const handleInputChange = (field: keyof typeof formData) => (value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const shotData = {
        code: formData.code,
        name: formData.name,
        description: formData.description,
        statusId: formData.statusId || undefined,
        shotType: formData.shotType,
        sequenceNumber: formData.sequenceNumber,
        duration: formData.duration,
        cutOrder: formData.cutOrder,
        assignedTo: formData.assignedTo ? parseInt(formData.assignedTo, 10) : undefined,
      };

      await updateShotMutation.mutateAsync({
        id: shot.id,
        data: shotData,
      });

      toast.success('Shot updated successfully!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving shot:', error);
      toast.error('Failed to update shot. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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
            Edit Shot: {shot.name}
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
                placeholder="Enter shot code"
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
                placeholder="Enter shot name"
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
              placeholder="Enter shot description"
            />
          </div>

          {/* Shot Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Shot Type
              </label>
              <select
                value={formData.shotType}
                onChange={(e) => handleInputChange('shotType')(e.target.value)}
                className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
                required
              >
                <option value="medium">Medium</option>
                <option value="closeup">Close-up</option>
                <option value="establishing">Establishing</option>
                <option value="detail">Detail</option>
              </select>
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Sequence Number
              </label>
              <input
                type="number"
                value={formData.sequenceNumber.toString()}
                onChange={(e) => handleInputChange('sequenceNumber')(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
                placeholder="Enter sequence number"
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
                {shotStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration and Cut Order */}
          <div className="grid grid-cols-2 gap-4">
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
            disabled={isSaving || updateShotMutation.isPending}
            className="px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => {
              if (!isSaving && !updateShotMutation.isPending) {
                e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSaving && !updateShotMutation.isPending) {
                e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
              }
            }}
          >
            {isSaving || updateShotMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
