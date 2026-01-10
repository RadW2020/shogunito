import React, { useState } from 'react';
import { Modal } from '../shared/Modal';
import { FormField } from '../shared/FormField';
import { useCreateAsset } from '@features/assets/api/useAssets';
import { showToast } from '../feedback';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projects: Array<{ id: number; name: string; code: string }>;
}

interface AssetFormData {
  code: string;
  name: string;
  assetType: string;
  status: string;
  description: string;
  thumbnailPath: string;
  projectId: string;
  assignedTo: string;
}

const ASSET_TYPE_OPTIONS = [
  { value: 'character', label: 'Character' },
  { value: 'subtitles', label: 'Subtitles' },
  { value: 'imagen', label: 'Imagen' },
  { value: 'audio', label: 'Audio' },
  { value: 'script', label: 'Script' },
  { value: 'text', label: 'Text' },
  { value: 'video', label: 'Video' },
];

const ASSET_STATUS_OPTIONS = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'final', label: 'Final' },
];

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projects,
}) => {
  const [formData, setFormData] = useState<AssetFormData>({
    code: '',
    name: '',
    assetType: 'text',
    status: 'waiting',
    description: '',
    thumbnailPath: '',
    projectId: '',
    assignedTo: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createAssetMutation = useCreateAsset();

  const projectOptions = projects.map((project) => ({
    value: String(project.id),
    label: `${project.code} - ${project.name}`,
  }));

  const handleInputChange = (field: keyof AssetFormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Asset code is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Asset name is required';
    }

    if (!formData.assetType) {
      newErrors.assetType = 'Asset type is required';
    }

    if (!formData.status) {
      newErrors.status = 'Status is required';
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
      // Clean up empty optional fields
      const assetData: any = {
        projectId: parseInt(formData.projectId, 10), // Convert string to number
        code: formData.code,
        name: formData.name,
        assetType: formData.assetType,
        status: formData.status,
      };

      // Only add optional fields if they have values
      if (formData.description?.trim()) {
        assetData.description = formData.description.trim();
      }
      if (formData.thumbnailPath?.trim()) {
        assetData.thumbnailPath = formData.thumbnailPath.trim();
      }
      if (formData.assignedTo?.trim()) {
        assetData.assignedTo = parseInt(formData.assignedTo.trim(), 10);
      }

      await createAssetMutation.mutateAsync(assetData);
      showToast.success('Asset created successfully!');

      if (onSuccess) {
        await onSuccess();
      }

      onClose();
      // Reset form
      setFormData({
        code: '',
        name: '',
        assetType: 'text',
        status: 'waiting',
        description: '',
        thumbnailPath: '',
        projectId: '',
        assignedTo: '',
      });
      setErrors({});
    } catch (error) {
      console.error('Error creating asset:', error);
      showToast.error('Failed to create asset. Please try again.');
      setErrors({ submit: 'Failed to create asset. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Asset" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Asset Code"
            name="code"
            value={formData.code}
            onChange={handleInputChange('code')}
            placeholder="e.g., CHAR-001"
            required
            error={errors.code}
          />

          <FormField
            label="Asset Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange('name')}
            placeholder="Enter asset name"
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
            label="Asset Type"
            name="assetType"
            type="select"
            value={formData.assetType}
            onChange={handleInputChange('assetType')}
            options={ASSET_TYPE_OPTIONS}
            required
            error={errors.assetType}
          />

          <FormField
            label="Status"
            name="status"
            type="select"
            value={formData.status}
            onChange={handleInputChange('status')}
            options={ASSET_STATUS_OPTIONS}
            required
            error={errors.status}
          />

          <FormField
            label="Thumbnail Path"
            name="thumbnailPath"
            value={formData.thumbnailPath}
            onChange={handleInputChange('thumbnailPath')}
            placeholder="Enter thumbnail file path"
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
          placeholder="Enter asset description"
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
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Asset'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
