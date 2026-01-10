import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VersionsTabWrapperWithPagination } from '../VersionsTabWrapperWithPagination';
import { useUiStore } from '@app/stores/uiStore';

// Mock the Zustand store
vi.mock('@app/stores/uiStore', () => ({
  useUiStore: vi.fn(),
}));

// Mock hooks
vi.mock('../../api/useVersionsPaginated', () => ({
  useVersionsPaginated: vi.fn(),
  useIsVersionsInitialLoading: vi.fn(),
}));

vi.mock('@features/shots/api/useShots', () => ({
  useShots: vi.fn(),
}));

vi.mock('@features/sequences/api/useSequences', () => ({
  useSequences: vi.fn(),
}));

vi.mock('@features/episodes/api/useEpisodes', () => ({
  useEpisodes: vi.fn(),
}));

// Mock VersionsTab
vi.mock('@features/shotgrid/components/shotgrid/tabs/VersionsTab', () => ({
  VersionsTab: ({ versions }: any) => (
    <div data-testid="versions-tab">
      {versions.map((v: any) => (
        <div key={v.id}>{v.code}</div>
      ))}
    </div>
  ),
}));

// Mock VirtualTable
vi.mock('@shared/components/pagination', () => ({
  VirtualTable: ({ items }: any) => (
    <div data-testid="virtual-table">
      {items.map((item: any) => (
        <div key={item.id}>{item.code}</div>
      ))}
    </div>
  ),
}));

const { useVersionsPaginated, useIsVersionsInitialLoading } = await import(
  '../../api/useVersionsPaginated'
);
const { useShots } = await import('@features/shots/api/useShots');
const { useSequences } = await import('@features/sequences/api/useSequences');
const { useEpisodes } = await import('@features/episodes/api/useEpisodes');

describe('VersionsTabWrapperWithPagination', () => {
  const defaultProps = {
    statusMap: {
      approved: { label: 'Approved', color: '#00FF00' },
      pending: { label: 'Pending', color: '#FFFF00' },
    },
    selectedItems: new Set<string>(),
    onItemSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onItemClick: vi.fn(),
    onEditVersion: vi.fn(),
    onAddNoteToVersion: vi.fn(),
    onViewNotes: vi.fn(),
  };

  const mockVersions = [
    {
      id: 1,
      code: 'V001',
      name: 'Version 1',
      status: 'approved',
      entityCode: 'SHOT_001',
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      code: 'V002',
      name: 'Version 2',
      status: 'pending',
      entityCode: 'SHOT_002',
      createdAt: new Date().toISOString(),
    },
  ];

  const mockShots = [
    { id: 1, code: 'SHOT_001', sequence: { code: 'SEQ_001' } },
    { id: 2, code: 'SHOT_002', sequence: { code: 'SEQ_002' } },
  ];

  const mockSequences = [
    { id: 1, code: 'SEQ_001', episodeId: 1 },
    { id: 2, code: 'SEQ_002', episodeId: 2 },
  ];

  const mockEpisodes = [
    { id: 1, projectId: 1 },
    { id: 2, projectId: 2 },
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
        selectedEpisodeId: 'all',
        selectedSequenceId: 'all',
        selectedShotId: 'all',
      },
      viewModes: {
        versions: 'table',
      },
    });

    (useIsVersionsInitialLoading as any).mockReturnValue(false);
    (useShots as any).mockReturnValue({
      data: mockShots,
      isLoading: false,
    });
    (useSequences as any).mockReturnValue({
      data: mockSequences,
      isLoading: false,
    });
    (useEpisodes as any).mockReturnValue({
      data: mockEpisodes,
      isLoading: false,
    });
  });

  it('should render loading state when initial loading', () => {
    (useIsVersionsInitialLoading as any).mockReturnValue(true);
    (useVersionsPaginated as any).mockReturnValue({
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
        <VersionsTabWrapperWithPagination {...defaultProps} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Loading versions...')).toBeInTheDocument();
  });

  it('should render error state when query fails', () => {
    (useVersionsPaginated as any).mockReturnValue({
      flatData: [],
      totalItems: 0,
      hasMore: false,
      isFetchingNextPage: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      error: { message: 'Failed to load versions' },
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <VersionsTabWrapperWithPagination {...defaultProps} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Error loading versions')).toBeInTheDocument();
    expect(screen.getByText('Failed to load versions')).toBeInTheDocument();
  });

  it('should render empty state when no versions', () => {
    (useVersionsPaginated as any).mockReturnValue({
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
        <VersionsTabWrapperWithPagination {...defaultProps} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('No versions found')).toBeInTheDocument();
  });

  it('should render VersionsTab with filtered versions by default', () => {
    (useVersionsPaginated as any).mockReturnValue({
      flatData: mockVersions,
      totalItems: 2,
      hasMore: false,
      isFetchingNextPage: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      error: null,
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <VersionsTabWrapperWithPagination {...defaultProps} />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('versions-tab')).toBeInTheDocument();
    expect(screen.getByText('V001')).toBeInTheDocument();
    expect(screen.getByText('V002')).toBeInTheDocument();
  });

  it('should render VirtualTable when useVirtualTable is true', () => {
    (useVersionsPaginated as any).mockReturnValue({
      flatData: mockVersions,
      totalItems: 2,
      hasMore: false,
      isFetchingNextPage: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      error: null,
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <VersionsTabWrapperWithPagination {...defaultProps} useVirtualTable={true} />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('virtual-table')).toBeInTheDocument();
  });

  it('should filter versions by shotId', () => {
    (useUiStore as any).mockReturnValue({
      filters: {
        selectedProjectId: 'all',
        selectedEpisodeId: 'all',
        selectedSequenceId: 'all',
        selectedShotId: 'SHOT_001',
      },
      viewModes: {
        versions: 'table',
      },
    });

    (useVersionsPaginated as any).mockReturnValue({
      flatData: mockVersions,
      totalItems: 2,
      hasMore: false,
      isFetchingNextPage: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      error: null,
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <VersionsTabWrapperWithPagination {...defaultProps} />
      </QueryClientProvider>,
    );

    // Only V001 should be visible (matches SHOT_001)
    expect(screen.getByText('V001')).toBeInTheDocument();
    expect(screen.queryByText('V002')).not.toBeInTheDocument();
  });

  it('should filter versions by search term', () => {
    (useVersionsPaginated as any).mockReturnValue({
      flatData: mockVersions,
      totalItems: 2,
      hasMore: false,
      isFetchingNextPage: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      error: null,
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <VersionsTabWrapperWithPagination {...defaultProps} searchTerm="V001" />
      </QueryClientProvider>,
    );

    expect(screen.getByText('V001')).toBeInTheDocument();
    expect(screen.queryByText('V002')).not.toBeInTheDocument();
  });

  it('should show empty state with search term when no matches', () => {
    (useVersionsPaginated as any).mockReturnValue({
      flatData: mockVersions,
      totalItems: 2,
      hasMore: false,
      isFetchingNextPage: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      error: null,
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <VersionsTabWrapperWithPagination {...defaultProps} searchTerm="NonExistent" />
      </QueryClientProvider>,
    );

    expect(screen.getByText('No versions found')).toBeInTheDocument();
    expect(screen.getByText('No versions match "NonExistent"')).toBeInTheDocument();
  });

  it('should use custom pageSize', () => {
    const mockUseVersionsPaginated = vi.fn().mockReturnValue({
      flatData: mockVersions,
      totalItems: 2,
      hasMore: false,
      isFetchingNextPage: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      error: null,
    });
    vi.mocked(useVersionsPaginated).mockImplementation(mockUseVersionsPaginated);

    render(
      <QueryClientProvider client={createQueryClient()}>
        <VersionsTabWrapperWithPagination {...defaultProps} pageSize={50} />
      </QueryClientProvider>,
    );

    expect(mockUseVersionsPaginated).toHaveBeenCalledWith({
      shotId: undefined,
      limit: 50,
    });
  });
});
