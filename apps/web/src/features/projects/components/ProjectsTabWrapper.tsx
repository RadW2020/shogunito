import React from 'react';
import { ProjectsTab } from '@features/shotgrid/components/shotgrid/tabs/ProjectsTab';
import { useProjects } from '../api/useProjects';
import { useUiStore } from '@app/stores/uiStore';
import type { StatusMeta, TabType, Project } from '@shogun/shared';

interface ProjectsTabWrapperProps {
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  searchTerm?: string;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: { id: string | number; name?: string; code?: string }) => void;
  onEditProject?: (project: Project) => void;
  onAddNoteToProject?: (project: Project) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

export const ProjectsTabWrapper: React.FC<ProjectsTabWrapperProps> = (props) => {
  const { data: projects = [], isLoading, error } = useProjects();
  const { filters } = useUiStore();

  if (isLoading) {
    return <div className="p-6">Loading projects...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error loading projects: {error.message}</div>;
  }

  // Apply filters
  const filteredProjects = projects.filter((project) => {
    // Filter by selected project (when not "all")
    if (filters.selectedProjectId !== 'all' && String(project.id) !== filters.selectedProjectId) {
      return false;
    }

    // Apply search filter
    if (props.searchTerm) {
      const searchLower = props.searchTerm.toLowerCase();
      const matchesSearch =
        project.name?.toLowerCase().includes(searchLower) ||
        project.description?.toLowerCase().includes(searchLower) ||
        project.code?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    return true;
  });

  return <ProjectsTab {...props} projects={filteredProjects} />;
};
