import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VersionsTabWrapper } from '../VersionsTabWrapper';
import { useUiStore } from '@app/stores/uiStore';

// Mock the Zustand store
vi.mock('@app/stores/uiStore', () => ({
  useUiStore: vi.fn(),
}));

// Mock useVersions
const mockUseVersions = vi.fn();
vi.mock('../../api/useVersions', () => ({
  useVersions: () => mockUseVersions(),
}));

// Mock useShots
const mockUseShots = vi.fn();
vi.mock('@features/shots/api/useShots', () => ({
  useShots: () => mockUseShots(),
}));

// Mock useSequences
const mockUseSequences = vi.fn();
vi.mock('@features/sequences/api/useSequences', () => ({
  useSequences: () => mockUseSequences(),
}));

// Mock useEpisodes
const mockUseEpisodes = vi.fn();
vi.mock('@features/episodes/api/useEpisodes', () => ({
  useEpisodes: () => mockUseEpisodes(),
}));

// Mock VersionsTab
vi.mock('@features/shotgrid/components/shotgrid/tabs/VersionsTab', () => ({
  VersionsTab: ({ versions }: any) => (
    <div data-testid="versions-tab">
      {versions.map((v: any) => (
        <div key={v.id}>{v.name}</div>
      ))}
    </div>
  ),
}));

// Mock CreatePlaylistFromVersionsModal
vi.mock('@shared/components/modals/CreatePlaylistFromVersionsModal', () => ({
  CreatePlaylistFromVersionsModal: ({ isOpen, children }: any) =>
    isOpen ? <div data-testid="create-playlist-modal">{children}</div> : null,
}));

// Mock LoadingSpinner and EmptyState
vi.mock('@shared/ui', () => ({
  LoadingSpinner: ({ size }: any) => <div data-testid="loading-spinner">{size}</div>,
  EmptyState: ({ title, description, action }: any) => (
    <div data-testid="empty-state">
      <div>{title}</div>
      <div>{description}</div>
      {action}
    </div>
  ),
}));

describe('VersionsTabWrapper', () => {
  const defaultProps = {
    statusMap: {
      active: { label: 'Active', color: '#00FF00' },
      waiting: { label: 'Waiting', color: '#FF0000' },
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
      name: 'Version One',
      entityCode: 'SHOT001',
      status: 'waiting',
      statusId: 'waiting', // Add statusId to match filter
      latest: true,
      format: 'mp4',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      code: 'V002',
      name: 'Version Two',
      entityCode: 'SHOT001',
      status: 'active',
      statusId: 'active', // Add statusId to match filter
      latest: false,
      format: 'mov',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      code: 'V003',
      name: 'Version Three',
      entityCode: 'SHOT002',
      status: 'waiting',
      statusId: 'waiting', // Add statusId to match filter
      latest: true,
      format: 'mp4',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockShots = [
    {
      id: 1,
      code: 'SHOT001',
      name: 'Shot One',
      sequence: { code: 'SEQ001' },
    },
    {
      id: 2,
      code: 'SHOT002',
      name: 'Shot Two',
      sequence: { code: 'SEQ002' },
    },
  ];

  const mockSequences = [
    {
      id: 1,
      code: 'SEQ001',
      name: 'Sequence One',
      episodeId: 101,
    },
    {
      id: 2,
      code: 'SEQ002',
      name: 'Sequence Two',
      episodeId: 102,
    },
  ];

  const mockEpisodes = [
    {
      id: 101,
      code: 'EP001',
      name: 'Episode One',
      projectId: 1,
    },
    {
      id: 102,
      code: 'EP002',
      name: 'Episode Two',
      projectId: 2,
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
    (useUiStore as any).mockReturnValue({
      filters: {
        selectedProjectId: 'all',
        selectedEpisodeId: 'all',
        selectedSequenceId: 'all',
        selectedShotId: 'all',
        selectedVersionStatus: 'all',
        latestOnly: false,
        selectedFormat: 'all',
      },
      viewModes: {
        versions: 'grid',
      },
    });
    mockUseVersions.mockReturnValue({
      data: mockVersions,
      isLoading: false,
      error: null,
    });
    mockUseShots.mockReturnValue({
      data: mockShots,
      isLoading: false,
    });
    mockUseSequences.mockReturnValue({
      data: mockSequences,
      isLoading: false,
    });
    mockUseEpisodes.mockReturnValue({
      data: mockEpisodes,
      isLoading: false,
    });
  });

  describe('Basic rendering', () => {
    it('should render VersionsTab with versions', () => {
      renderWithQueryClient(<VersionsTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('versions-tab')).toBeInTheDocument();
      expect(screen.getByText('Version One')).toBeInTheDocument();
      expect(screen.getByText('Version Two')).toBeInTheDocument();
      expect(screen.getByText('Version Three')).toBeInTheDocument();
    });

    it('should show loading spinner when loading', () => {
      mockUseVersions.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      });

      renderWithQueryClient(<VersionsTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should show error state when there is an error', () => {
      mockUseVersions.mockReturnValue({
        data: [],
        isLoading: false,
        error: { message: 'Failed to load versions' },
      });

      renderWithQueryClient(<VersionsTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('Error loading versions')).toBeInTheDocument();
    });
  });

  describe('Filtering by shot', () => {
    it('should filter by selected shot', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedShotId: '1', // Use shot ID, not code
          selectedVersionStatus: 'all',
          latestOnly: false,
          selectedFormat: 'all',
        },
        viewModes: {
          versions: 'grid',
        },
      });

      renderWithQueryClient(<VersionsTabWrapper {...defaultProps} />);

      // Only versions from SHOT001 (id: 1) should be shown
      expect(screen.getByText('Version One')).toBeInTheDocument();
      expect(screen.getByText('Version Two')).toBeInTheDocument();
      expect(screen.queryByText('Version Three')).not.toBeInTheDocument();
    });
  });

  describe('Filtering by sequence', () => {
    it('should filter by selected sequence through shot relationship', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'SEQ001',
          selectedShotId: 'all',
          selectedVersionStatus: 'all',
          latestOnly: false,
          selectedFormat: 'all',
        },
        viewModes: {
          versions: 'grid',
        },
      });

      renderWithQueryClient(<VersionsTabWrapper {...defaultProps} />);

      // Only versions from shots in SEQ001 should be shown
      expect(screen.getByText('Version One')).toBeInTheDocument();
      expect(screen.getByText('Version Two')).toBeInTheDocument();
      expect(screen.queryByText('Version Three')).not.toBeInTheDocument();
    });
  });

  describe('Filtering by episode', () => {
    it('should filter by selected episode through shot->sequence relationship', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: '101',
          selectedSequenceId: 'all',
          selectedShotId: 'all',
          selectedVersionStatus: 'all',
          latestOnly: false,
          selectedFormat: 'all',
        },
        viewModes: {
          versions: 'grid',
        },
      });

      renderWithQueryClient(<VersionsTabWrapper {...defaultProps} />);

      // Only versions from shots in sequences in episode 101 should be shown
      expect(screen.getByText('Version One')).toBeInTheDocument();
      expect(screen.getByText('Version Two')).toBeInTheDocument();
      expect(screen.queryByText('Version Three')).not.toBeInTheDocument();
    });
  });

  describe('Filtering by project', () => {
    it('should filter by selected project through shot->sequence->episode relationship', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '1',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedShotId: 'all',
          selectedVersionStatus: 'all',
          latestOnly: false,
          selectedFormat: 'all',
        },
        viewModes: {
          versions: 'grid',
        },
      });

      renderWithQueryClient(<VersionsTabWrapper {...defaultProps} />);

      // Only versions from shots in sequences in episodes in project 1 should be shown
      expect(screen.getByText('Version One')).toBeInTheDocument();
      expect(screen.getByText('Version Two')).toBeInTheDocument();
      expect(screen.queryByText('Version Three')).not.toBeInTheDocument();
    });
  });

  describe('Version-specific filters', () => {
    it('should filter by version status', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedShotId: 'all',
          selectedVersionStatus: 'waiting',
          latestOnly: false,
          selectedFormat: 'all',
        },
        viewModes: {
          versions: 'grid',
        },
      });

      renderWithQueryClient(<VersionsTabWrapper {...defaultProps} />);

      // Only versions with status 'waiting' should be shown
      expect(screen.getByText('Version One')).toBeInTheDocument();
      expect(screen.getByText('Version Three')).toBeInTheDocument();
      expect(screen.queryByText('Version Two')).not.toBeInTheDocument();
    });

    it('should filter by latest only', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedShotId: 'all',
          selectedVersionStatus: 'all',
          latestOnly: true,
          selectedFormat: 'all',
        },
        viewModes: {
          versions: 'grid',
        },
      });

      renderWithQueryClient(<VersionsTabWrapper {...defaultProps} />);

      // Only latest versions should be shown
      expect(screen.getByText('Version One')).toBeInTheDocument();
      expect(screen.getByText('Version Three')).toBeInTheDocument();
      expect(screen.queryByText('Version Two')).not.toBeInTheDocument();
    });

    it('should filter by format', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedShotId: 'all',
          selectedVersionStatus: 'all',
          latestOnly: false,
          selectedFormat: 'mp4',
        },
        viewModes: {
          versions: 'grid',
        },
      });

      renderWithQueryClient(<VersionsTabWrapper {...defaultProps} />);

      // Only versions with format 'mp4' should be shown
      expect(screen.getByText('Version One')).toBeInTheDocument();
      expect(screen.getByText('Version Three')).toBeInTheDocument();
      expect(screen.queryByText('Version Two')).not.toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('should filter by search term', () => {
      renderWithQueryClient(<VersionsTabWrapper {...defaultProps} searchTerm="One" />);

      expect(screen.getByText('Version One')).toBeInTheDocument();
      expect(screen.queryByText('Version Two')).not.toBeInTheDocument();
      expect(screen.queryByText('Version Three')).not.toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no versions match filters', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '999',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedShotId: 'all',
          selectedVersionStatus: 'all',
          latestOnly: false,
          selectedFormat: 'all',
        },
        viewModes: {
          versions: 'grid',
        },
      });

      renderWithQueryClient(<VersionsTabWrapper {...defaultProps} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No versions found')).toBeInTheDocument();
    });

    it('should show clear filters button when filters are active', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '1',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedShotId: 'all',
          selectedVersionStatus: 'all',
          latestOnly: false,
          selectedFormat: 'all',
        },
        viewModes: {
          versions: 'grid',
        },
      });
      const setFilter = vi.fn();
      (useUiStore.getState as any) = vi.fn(() => ({
        setFilter,
      }));

      mockUseVersions.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<VersionsTabWrapper {...defaultProps} />);

      const clearButton = screen.getByText('Clear filters');
      expect(clearButton).toBeInTheDocument();
    });
  });
});
