import React, { useState, useMemo } from 'react';
import { Modal } from '../shared/Modal';
import { FormField } from '../shared/FormField';
import { useCreateVersion } from '@features/versions/api/useVersions';
import { useProjects } from '@features/projects/api/useProjects';
import { showToast } from '../feedback';
import type { Asset, Sequence, Episode } from '@shogunito/shared';

interface AddVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  assets: Asset[];
  sequences: Sequence[];
  episodes: Episode[];
}

interface VersionFormData {
  projectId: string;
  name: string;
  description: string;
  entityType: 'asset' | 'sequence' | 'episode';
  entityId: string;
  format: '16:9' | '9:16' | '1:1' | 'custom' | '';
  artist: string;
  latest: boolean;
}

const ENTITY_TYPE_OPTIONS = [
  { value: 'asset', label: 'Asset' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'episode', label: 'Episode' },
];

const FORMAT_OPTIONS = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: 'custom', label: 'Custom' },
];

export const AddVersionModal: React.FC<AddVersionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  assets,
  sequences,
  episodes,
}) => {
  const { data: projects = [] } = useProjects();

  const [formData, setFormData] = useState<VersionFormData>({
    projectId: '',
    name: '',
    description: '',
    entityType: 'asset',
    entityId: '',
    format: '',
    artist: '',
    latest: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const createVersionMutation = useCreateVersion();

  // Project options
  const projectOptions = useMemo(() => {
    return projects.map((project) => ({
      value: String(project.id),
      label: `${project.code} - ${project.name}`,
    }));
  }, [projects]);

  // Get entity options based on selected entity type and project
  const getEntityOptions = () => {
    if (!formData.projectId) {
      return [];
    }

    const projectId = parseInt(formData.projectId);

    switch (formData.entityType) {
      case 'asset': {
        // Filter assets by project
        const projectAssets = assets.filter((asset) => asset.projectId === projectId);
        return projectAssets.map((asset) => ({
          value: String(asset.id),
          label: `${asset.code} - ${asset.name}`,
        }));
      }
      case 'sequence': {
        // Filter sequences by project: sequences -> episodes -> project
        const projectEpisodes = episodes.filter((ep) => ep.projectId === projectId);
        const projectEpisodeIds = new Set(projectEpisodes.map((ep) => ep.id));
        const projectSequences = sequences.filter((seq) => projectEpisodeIds.has(seq.episodeId));

        return projectSequences.map((sequence) => ({
          value: String(sequence.id),
          label: `${sequence.code} - ${sequence.name}`,
        }));
      }
      case 'episode': {
        // Filter episodes by project
        const projectEpisodes = episodes.filter((ep) => ep.projectId === projectId);
        return projectEpisodes.map((episode) => ({
          value: String(episode.id),
          label: `${episode.code} - ${episode.name}`,
        }));
      }
      default:
        return [];
    }
  };

  const entityOptions = getEntityOptions();

  // Get the code of the selected entity
  const getSelectedEntityCode = (): string | null => {
    if (!formData.entityId) return null;

    const entityId = parseInt(formData.entityId);
    switch (formData.entityType) {
      case 'asset': {
        const asset = assets.find((a) => a.id === entityId);
        return asset?.code || null;
      }
      case 'sequence': {
        const sequence = sequences.find((s) => s.id === entityId);
        return sequence?.code || null;
      }
      case 'episode': {
        const episode = episodes.find((e) => e.id === entityId);
        return episode?.code || null;
      }
      default:
        return null;
    }
  };

  const handleInputChange = (field: keyof VersionFormData) => (value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
    // Clear entityId when projectId or entityType changes
    if (field === 'projectId' || field === 'entityType') {
      setFormData((prev) => ({ ...prev, entityId: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectId) {
      newErrors.projectId = 'Project is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Version name is required';
    }

    if (!formData.entityType) {
      newErrors.entityType = 'Entity type is required';
    }

    if (!formData.entityId) {
      newErrors.entityId = 'Entity is required';
    } else {
      // Validate that we can get the entity code
      const entityCode = getSelectedEntityCode();
      if (!entityCode) {
        newErrors.entityId = 'Selected entity not found';
      }
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
      // Get the entity code automatically from the selected entity
      const entityCode = getSelectedEntityCode();
      if (!entityCode) {
        setErrors({
          submit: 'Could not determine entity code. Please try again.',
        });
        return;
      }

      // Clean up empty optional fields
      const versionData: any = {
        code: entityCode,
        name: formData.name,
        entityType: formData.entityType,
        entityId: parseInt(formData.entityId),
        latest: formData.latest,
      };

      // Only add optional fields if they have values
      if (formData.description?.trim()) {
        versionData.description = formData.description.trim();
      }
      if (formData.format) {
        versionData.format = formData.format;
      }
      if (formData.artist?.trim()) {
        versionData.artist = formData.artist.trim();
      }

      await createVersionMutation.mutateAsync(versionData);

      showToast.success('Version created successfully!');

      // Wait for onSuccess to complete (e.g., refreshData) before closing
      if (onSuccess) {
        await onSuccess();
      }

      onClose();
      // Reset form
      setFormData({
        projectId: '',
        name: '',
        description: '',
        entityType: 'asset',
        entityId: '',
        format: '',
        artist: '',
        latest: true,
      });
      setErrors({});
    } catch (error) {
      console.error('Error creating version:', error);
      showToast.error('Failed to create version. Please try again.');
      setErrors({ submit: 'Failed to create version. Please try again.' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Version" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Project"
            name="projectId"
            type="select"
            value={formData.projectId}
            onChange={handleInputChange('projectId')}
            options={projectOptions}
            required
            error={errors.projectId}
            placeholder="Select a project"
          />

          <FormField
            label="Version Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange('name')}
            placeholder="Enter version name"
            required
            error={errors.name}
          />

          <FormField
            label="Entity Type"
            name="entityType"
            type="select"
            value={formData.entityType}
            onChange={handleInputChange('entityType')}
            options={ENTITY_TYPE_OPTIONS}
            required
            error={errors.entityType}
            disabled={!formData.projectId}
          />

          <FormField
            label="Entity"
            name="entityId"
            type="select"
            value={formData.entityId}
            onChange={handleInputChange('entityId')}
            options={entityOptions}
            required
            error={errors.entityId}
            disabled={!formData.projectId || !formData.entityType}
            placeholder={
              !formData.projectId
                ? 'Select a project first'
                : !formData.entityType
                  ? 'Select an entity type first'
                  : 'Select an entity'
            }
          />

          <FormField
            label="Format"
            name="format"
            type="select"
            value={formData.format}
            onChange={handleInputChange('format')}
            options={FORMAT_OPTIONS}
          />

          <FormField
            label="Artist"
            name="artist"
            value={formData.artist}
            onChange={handleInputChange('artist')}
            placeholder="Enter artist name"
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="latest"
              checked={formData.latest}
              onChange={(e) => handleInputChange('latest')(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="latest" className="text-sm font-medium">
              Mark as latest version
            </label>
          </div>
        </div>

        <FormField
          label="Description"
          name="description"
          type="textarea"
          value={formData.description}
          onChange={handleInputChange('description')}
          placeholder="Enter version description"
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
            disabled={createVersionMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createVersionMutation.isPending ? 'Creating...' : 'Create Version'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
