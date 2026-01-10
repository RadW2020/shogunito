import React, { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { FormField } from '../shared/FormField';
import { apiService } from '@shared/api/client';
import toast from 'react-hot-toast';
import type { Status } from '@shogun/shared';

interface StatusEditModalProps {
  status: Status | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface StatusFormData {
  code: string;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
  applicableEntities: string[];
  assignedTo: string;
}

const ENTITY_OPTIONS = [
  { value: 'project', label: 'Project' },
  { value: 'episode', label: 'Episode' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'shot', label: 'Shot' },
  { value: 'version', label: 'Version' },
  { value: 'asset', label: 'Asset' },
  { value: 'note', label: 'Note' },
  { value: 'all', label: 'All Entities' },
];

export const StatusEditModal: React.FC<StatusEditModalProps> = ({
  status,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<StatusFormData>({
    code: '',
    name: '',
    description: '',
    color: '#3B82F6',
    isActive: true,
    sortOrder: 0,
    applicableEntities: [],
    assignedTo: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data when status changes
  useEffect(() => {
    if (status) {
      setFormData({
        code: status.code || '',
        name: status.name || '',
        description: status.description || '',
        color: status.color || '#3B82F6',
        isActive: status.isActive ?? true,
        sortOrder: status.sortOrder || 0,
        applicableEntities: status.applicableEntities || [],
        assignedTo:
          status.assignedTo !== undefined && status.assignedTo !== null
            ? String(status.assignedTo)
            : '',
      });
    }
  }, [status]);

  if (!status || !isOpen) {
    return null;
  }

  const handleInputChange = (field: keyof StatusFormData) => (value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleEntityToggle = (entity: string) => {
    setFormData((prev) => {
      const entities = prev.applicableEntities.includes(entity)
        ? prev.applicableEntities.filter((e) => e !== entity)
        : [...prev.applicableEntities, entity];
      return { ...prev, applicableEntities: entities };
    });
    if (errors.applicableEntities) {
      setErrors((prev) => ({ ...prev, applicableEntities: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Status code is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Status name is required';
    }

    if (!formData.color.match(/^#[0-9A-Fa-f]{6}$/)) {
      newErrors.color = 'Color must be a valid hex color (e.g., #FF0000)';
    }

    if (formData.applicableEntities.length === 0) {
      newErrors.applicableEntities = 'At least one entity must be selected';
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
      // Clean up empty optional fields
      const statusData: any = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        color: formData.color,
        applicableEntities: formData.applicableEntities,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
      };

      // Only add optional fields if they have values
      if (formData.description?.trim()) {
        statusData.description = formData.description.trim();
      }
      if (formData.assignedTo?.trim()) {
        statusData.assignedTo = parseInt(formData.assignedTo.trim(), 10);
      }

      await apiService.updateStatus(status.id, statusData);

      toast.success('Status updated successfully!');

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Status" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Code"
            name="code"
            value={formData.code}
            onChange={handleInputChange('code')}
            placeholder="e.g., IN_PROGRESS"
            required
            error={errors.code}
          />

          <FormField
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange('name')}
            placeholder="e.g., In Progress"
            required
            error={errors.name}
          />
        </div>

        <FormField
          label="Description"
          name="description"
          type="textarea"
          value={formData.description}
          onChange={handleInputChange('description')}
          placeholder="Describe the purpose of this status..."
          rows={2}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Color *
            </label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => handleInputChange('color')(e.target.value)}
              className="w-full h-10 px-2 rounded border"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
              }}
            />
            {errors.color && <p className="text-red-500 text-sm mt-1">{errors.color}</p>}
          </div>

          <FormField
            label="Sort Order"
            name="sortOrder"
            type="number"
            value={formData.sortOrder.toString()}
            onChange={(value) => handleInputChange('sortOrder')(parseInt(value) || 0)}
            placeholder="0"
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Applicable Entities *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ENTITY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <input
                  type="checkbox"
                  checked={formData.applicableEntities.includes(option.value)}
                  onChange={() => handleEntityToggle(option.value)}
                  className="w-4 h-4"
                />
                <span style={{ color: 'var(--text-primary)' }}>{option.label}</span>
              </label>
            ))}
          </div>
          {errors.applicableEntities && (
            <p className="text-red-500 text-sm mt-1">{errors.applicableEntities}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => handleInputChange('isActive')(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="isActive" className="text-sm" style={{ color: 'var(--text-primary)' }}>
            Status is active
          </label>
        </div>

        <FormField
          label="Assigned To"
          name="assignedTo"
          value={formData.assignedTo}
          onChange={handleInputChange('assignedTo')}
          placeholder="e.g., supervisor@studio.com"
        />

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-sm"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-primary)',
            }}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded text-sm text-white"
            style={{ backgroundColor: 'var(--accent-primary)' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
