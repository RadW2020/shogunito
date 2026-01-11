import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, ModalContent } from '../shared/Modal';
import { ModalFooter, ModalSecondaryButton, ModalPrimaryButton } from '../shared/ModalFooter';
import { FormField } from '../shared/FormField';
import { useCreateProject } from '@features/projects/api/useProjects';
import { showToast } from '../feedback';
import { apiService } from '../../api/client';
import type { Status } from '@shogunito/shared';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>; // Made optional since React Query will handle cache updates
}

interface ProjectFormData {
  code: string;
  name: string;
  description: string;
  statusId: string;
  clientName: string;
  startDate: string;
  endDate: string;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({ isOpen, onClose, onSuccess }) => {
  // Fetch statuses from API
  const { data: allStatuses = [] } = useQuery<Status[]>({
    queryKey: ['statuses'],
    queryFn: () => apiService.getStatuses(),
  });

  // Filter statuses applicable to projects
  const projectStatusOptions = useMemo(() => {
    const applicableStatuses = allStatuses.filter(
      (status: Status) =>
        status.isActive &&
        (status.applicableEntities?.includes('all') ||
          status.applicableEntities?.includes('project')),
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

  const [formData, setFormData] = useState<ProjectFormData>({
    code: '',
    name: '',
    description: '',
    statusId: '',
    clientName: '',
    startDate: '',
    endDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const createProjectMutation = useCreateProject();

  const handleInputChange = (field: keyof ProjectFormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Project code is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.statusId) {
      newErrors.statusId = 'Status is required';
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
      const projectData: any = {
        code: formData.code,
        name: formData.name,
        statusId: formData.statusId,
      };

      // Only add optional fields if they have values
      if (formData.description?.trim()) {
        projectData.description = formData.description.trim();
      }
      if (formData.clientName?.trim()) {
        projectData.clientName = formData.clientName.trim();
      }
      if (formData.startDate) {
        projectData.startDate = formData.startDate;
      }
      if (formData.endDate) {
        projectData.endDate = formData.endDate;
      }

      await createProjectMutation.mutateAsync(projectData);

      showToast.success('Project created successfully!');

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
        statusId: '',
        clientName: '',
        startDate: '',
        endDate: '',
      });
      setErrors({});
    } catch (error) {
      console.error('Error creating project:', error);
      showToast.error('Failed to create project. Please try again.');
      setErrors({ submit: 'Failed to create project. Please try again.' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Project" size="lg">
      <form onSubmit={handleSubmit}>
        <ModalContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Project Code"
              name="code"
              value={formData.code}
              onChange={handleInputChange('code')}
              placeholder="e.g., PROJ-001"
              required
              error={errors.code}
            />

            <FormField
              label="Project Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange('name')}
              placeholder="Enter project name"
              required
              error={errors.name}
            />

            <FormField
              label="Status"
              name="statusId"
              type="select"
              value={formData.statusId}
              onChange={handleInputChange('statusId')}
              options={projectStatusOptions}
              required
              error={errors.statusId}
            />

            <FormField
              label="Client Name"
              name="clientName"
              value={formData.clientName}
              onChange={handleInputChange('clientName')}
              placeholder="Enter client name"
            />

            <FormField
              label="Start Date"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleInputChange('startDate')}
            />

            <FormField
              label="End Date"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={handleInputChange('endDate')}
            />
          </div>

          <FormField
            label="Description"
            name="description"
            type="textarea"
            value={formData.description}
            onChange={handleInputChange('description')}
            placeholder="Enter project description"
            rows={3}
          />

          {errors.submit && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"
            >
              {errors.submit}
            </div>
          )}
        </ModalContent>

        <ModalFooter>
          <ModalSecondaryButton type="button" onClick={onClose}>
            Cancel
          </ModalSecondaryButton>
          <ModalPrimaryButton
            type="submit"
            disabled={createProjectMutation.isPending}
            loading={createProjectMutation.isPending}
          >
            {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
          </ModalPrimaryButton>
        </ModalFooter>
      </form>
    </Modal>
  );
};
