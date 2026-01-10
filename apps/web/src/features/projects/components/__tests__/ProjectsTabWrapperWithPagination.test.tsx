import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectsTabWrapperWithPagination } from '../ProjectsTabWrapperWithPagination';
import { useUiStore } from '@app/stores/uiStore';

// Mock the Zustand store
vi.mock('@app/stores/uiStore', () => ({
  useUiStore: vi.fn(),
}));

// Mock hooks
vi.mock('../../api/useProjectsPaginated', () => ({
  useProjectsPaginated: vi.fn(),
  useIsProjectsInitialLoading: vi.fn(),
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

// Mock InfiniteScrollList
vi.mock('@shared/components/pagination', () => ({
  InfiniteScrollList: ({ items, renderItem }: any) => (
    <div data-testid="infinite-scroll-list">{items.map((item: any) => renderItem(item))}</div>
  ),
}));

const { useProjectsPaginated, useIsProjectsInitialLoading } = await import(
  '../../api/useProjectsPaginated'
);

describe('ProjectsTabWrapperWithPagination', () => {
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
      code: 'PROJ_001',
      name: 'Project 1',
      description: 'Description 1',
      status: 'active',
    },
    {
      id: 2,
      code: 'PROJ_002',
      name: 'Project 2',
      description: 'Description 2',
      status: 'inactive',
    },
  ];

  const createQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

  beforeEach(() => {
    vi.clearAllMocks();

    (useUiStore as any).mockReturnValue({
      filters: {
        selectedProjectId: 'all',
      },
    });

    (useIsProjectsInitialLoading as any).mockReturnValue(false);
  });

  it('should render loading state when initial loading', () => {
    (useIsProjectsInitialLoading as any).mockReturnValue(true);
    (useProjectsPaginated as any).mockReturnValue({
      flatData: [],
      totalItems: 0,
      hasMore: false,
      isFetchingNextPage: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      error: null,
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProjectsTabWrapperWithPagination {...defaultProps} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Loading projects...')).toBeInTheDocument();
  });

  it('should render error state when query fails', () => {
    (useProjectsPaginated as any).mockReturnValue({
      flatData: [],
      totalItems: 0,
      hasMore: false,
      isFetchingNextPage: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      error: { message: 'Failed to load projects' },
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProjectsTabWrapperWithPagination {...defaultProps} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Error loading projects')).toBeInTheDocument();
    expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
  });

  it('should render empty state when no projects', () => {
    (useProjectsPaginated as any).mockReturnValue({
      flatData: [],
      totalItems: 0,
      hasMore: false,
      isFetchingNextPage: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      error: null,
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProjectsTabWrapperWithPagination {...defaultProps} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('No projects found')).toBeInTheDocument();
  });

  it('should render ProjectsTab with filtered projects by default', () => {
    (useProjectsPaginated as any).mockReturnValue({
      flatData: mockProjects,
      totalItems: 2,
      hasMore: false,
      isFetchingNextPage: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      error: null,
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProjectsTabWrapperWithPagination {...defaultProps} />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('projects-tab')).toBeInTheDocument();
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
  });

  it('should render InfiniteScrollList when useInfiniteScroll is true', () => {
    (useProjectsPaginated as any).mockReturnValue({
      flatData: mockProjects,
      totalItems: 2,
      hasMore: false,
      isFetchingNextPage: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      error: null,
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProjectsTabWrapperWithPagination {...defaultProps} useInfiniteScroll={true} />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('infinite-scroll-list')).toBeInTheDocument();
  });

  it('should filter projects by selectedProjectId', () => {
    (useUiStore as any).mockReturnValue({
      filters: {
        selectedProjectId: '1',
      },
    });

    (useProjectsPaginated as any).mockReturnValue({
      flatData: mockProjects,
      totalItems: 2,
      hasMore: false,
      isFetchingNextPage: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      error: null,
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProjectsTabWrapperWithPagination {...defaultProps} />
      </QueryClientProvider>,
    );

    // Only Project 1 should be visible (id matches '1')
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.queryByText('Project 2')).not.toBeInTheDocument();
  });

  it('should filter projects by search term', () => {
    (useProjectsPaginated as any).mockReturnValue({
      flatData: mockProjects,
      totalItems: 2,
      hasMore: false,
      isFetchingNextPage: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      error: null,
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProjectsTabWrapperWithPagination {...defaultProps} searchTerm="Project 1" />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.queryByText('Project 2')).not.toBeInTheDocument();
  });

  it('should use custom pageSize', () => {
    const mockUseProjectsPaginated = vi.fn().mockReturnValue({
      flatData: mockProjects,
      totalItems: 2,
      hasMore: false,
      isFetchingNextPage: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      error: null,
    });
    vi.mocked(useProjectsPaginated).mockImplementation(mockUseProjectsPaginated);

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProjectsTabWrapperWithPagination {...defaultProps} pageSize={100} />
      </QueryClientProvider>,
    );

    expect(mockUseProjectsPaginated).toHaveBeenCalledWith({ limit: 100 });
  });
});
