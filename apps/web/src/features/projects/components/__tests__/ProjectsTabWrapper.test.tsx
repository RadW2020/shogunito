import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectsTabWrapper } from '../ProjectsTabWrapper';
import { useUiStore } from '@app/stores/uiStore';
import { useProjects } from '@features/projects/api/useProjects';

// Mock the Zustand store
vi.mock('@app/stores/uiStore', () => ({
  useUiStore: vi.fn(),
}));

// Mock useProjects - debe retornar un objeto con data, isLoading, error
vi.mock('@features/projects/api/useProjects', () => ({
  useProjects: vi.fn(),
}));

// Mock ProjectsTab
vi.mock('@features/shotgrid/components/shotgrid/tabs/ProjectsTab', () => ({
  ProjectsTab: ({ projects }: any) => (
    <div data-testid="projects-tab">
      {projects.map((p: any) => (
        <div key={p.id}>{p.name}</div>
      ))}
    </div>
  ),
}));

// No need to mock LoadingSpinner and EmptyState for ProjectsTabWrapper
// as it uses simple divs for loading and error states

describe('ProjectsTabWrapper', () => {
  const defaultProps = {
    statusMap: {
      active: { label: 'Active', color: '#00FF00' },
      inactive: { label: 'Inactive', color: '#FF0000' },
    },
    selectedItems: new Set<string>(),
    onItemSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onItemClick: vi.fn(),
    onEditProject: vi.fn(),
    onAddNoteToProject: vi.fn(),
    onViewNotes: vi.fn(),
  };

  const mockProjects = [
    {
      id: 1,
      code: 'PRJ001',
      name: 'Project Alpha',
      status: 'active',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      clientName: 'Client A',
      description: 'Test project',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      code: 'PRJ002',
      name: 'Project Beta',
      status: 'inactive',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-11-30'),
      clientName: 'Client B',
      description: 'Another test project',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const renderWithQueryClient = (ui: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useUiStore as unknown as Mock).mockReturnValue({
      filters: {
        selectedProjectId: 'all',
        selectedEpisodeId: 'all',
        selectedSequenceId: 'all',
        selectedShotId: 'all',
        selectedAssetId: 'all',
        selectedFormat: 'all',
        selectedVersionStatus: 'all',
        selectedPlaylistStatus: 'all',
        selectedEntityType: 'all',
        latestOnly: false,
      },
    });
    (useProjects as unknown as Mock).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
    });
  });

  describe('Loading state', () => {
    it('should show loading message when data is loading', () => {
      (useProjects as unknown as Mock).mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      });

      renderWithQueryClient(<ProjectsTabWrapper {...defaultProps} />);
      expect(screen.getByText(/Loading projects/i)).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when there is an error', () => {
      const error = new Error('Failed to load projects');
      (useProjects as unknown as Mock).mockReturnValue({
        data: [],
        isLoading: false,
        error,
      });

      renderWithQueryClient(<ProjectsTabWrapper {...defaultProps} />);
      expect(screen.getByText(/Error loading projects/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to load projects/i)).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter projects by selected project ID', () => {
      (useUiStore as unknown as Mock).mockReturnValue({
        filters: {
          selectedProjectId: '1',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedShotId: 'all',
          selectedAssetId: 'all',
          selectedFormat: 'all',
          selectedVersionStatus: 'all',
          selectedPlaylistStatus: 'all',
          selectedEntityType: 'all',
          latestOnly: false,
        },
      });

      renderWithQueryClient(<ProjectsTabWrapper {...defaultProps} />);

      // Should only show Project Alpha (id: 1)
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Project Beta')).not.toBeInTheDocument();
    });

    it('should show all projects when filter is "all"', () => {
      renderWithQueryClient(<ProjectsTabWrapper {...defaultProps} />);

      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
    });

    it('should filter projects by search term', () => {
      renderWithQueryClient(<ProjectsTabWrapper {...defaultProps} searchTerm="Alpha" />);

      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Project Beta')).not.toBeInTheDocument();
    });

    it('should pass empty array to ProjectsTab when no projects match filters', () => {
      (useUiStore as unknown as Mock).mockReturnValue({
        filters: {
          selectedProjectId: '999', // Non-existent project
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedShotId: 'all',
          selectedAssetId: 'all',
          selectedFormat: 'all',
          selectedVersionStatus: 'all',
          selectedPlaylistStatus: 'all',
          selectedEntityType: 'all',
          latestOnly: false,
        },
      });

      renderWithQueryClient(<ProjectsTabWrapper {...defaultProps} />);

      // ProjectsTabWrapper doesn't show empty state, it just passes empty array to ProjectsTab
      const projectsTab = screen.getByTestId('projects-tab');
      expect(projectsTab).toBeInTheDocument();
      // No projects should be rendered
      expect(screen.queryByText('Project Alpha')).not.toBeInTheDocument();
      expect(screen.queryByText('Project Beta')).not.toBeInTheDocument();
    });
  });

  describe('Props forwarding', () => {
    it('should forward all props to ProjectsTab', () => {
      renderWithQueryClient(<ProjectsTabWrapper {...defaultProps} />);

      const projectsTab = screen.getByTestId('projects-tab');
      expect(projectsTab).toBeInTheDocument();
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
    });
  });
});
