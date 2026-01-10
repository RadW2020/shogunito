import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShotsTabWrapper } from '../ShotsTabWrapper';
import { useUiStore } from '@app/stores/uiStore';
import * as useShotsModule from '@features/shots/api/useShots';
import * as useSequencesModule from '@features/sequences/api/useSequences';
import * as useEpisodesModule from '@features/episodes/api/useEpisodes';

// Mock the Zustand store
vi.mock('@app/stores/uiStore', () => ({
  useUiStore: vi.fn(),
}));

// Mock hooks
vi.mock('@features/shots/api/useShots', () => ({
  useShots: vi.fn(),
}));

vi.mock('@features/sequences/api/useSequences', () => ({
  useSequences: vi.fn(),
}));

vi.mock('@features/episodes/api/useEpisodes', () => ({
  useEpisodes: vi.fn(),
}));

// Mock ShotsTab
vi.mock('@features/shotgrid/components/shotgrid/tabs/ShotsTab', () => ({
  ShotsTab: ({ shots }: any) => (
    <div data-testid="shots-tab">
      {shots.map((s: any) => (
        <div key={s.id}>{s.name}</div>
      ))}
    </div>
  ),
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

describe('ShotsTabWrapper', () => {
  const defaultProps = {
    statusMap: {
      active: { label: 'Active', color: '#00FF00' },
      waiting: { label: 'Waiting', color: '#FF0000' },
    },
    selectedItems: new Set<string>(),
    onItemSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onItemClick: vi.fn(),
    onEditShot: vi.fn(),
    onAddNoteToShot: vi.fn(),
    onViewNotes: vi.fn(),
  };

  const mockSequences = [
    {
      id: 201,
      code: 'SEQ001',
      name: 'Sequence A',
      episodeId: 101,
      status: 'waiting',
      cutOrder: 1,
      description: 'Seq A',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 202,
      code: 'SEQ002',
      name: 'Sequence B',
      episodeId: 101,
      status: 'active',
      cutOrder: 2,
      description: 'Seq B',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockEpisodes = [
    {
      id: 101,
      code: 'EP001',
      name: 'Episode One',
      projectId: 1,
      status: 'waiting',
      epNumber: 1,
      description: 'First episode',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockShots = [
    {
      id: 301,
      code: 'SH001',
      name: 'Shot 1',
      sequenceId: 201,
      status: 'waiting',
      shotType: 'medium',
      duration: 10,
      cutOrder: 1,
      sequenceNumber: 1,
      sequence: { code: 'SEQ001' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 302,
      code: 'SH002',
      name: 'Shot 2',
      sequenceId: 201,
      status: 'active',
      shotType: 'closeup',
      duration: 15,
      cutOrder: 2,
      sequenceNumber: 2,
      sequence: { code: 'SEQ001' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 303,
      code: 'SH003',
      name: 'Shot 3',
      sequenceId: 202,
      status: 'waiting',
      shotType: 'detail',
      duration: 5,
      cutOrder: 1,
      sequenceNumber: 1,
      sequence: { code: 'SEQ002' },
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
      setFilter: vi.fn(),
    });
    (useShotsModule.useShots as unknown as Mock).mockReturnValue({
      data: mockShots,
      isLoading: false,
      error: null,
    });
    (useSequencesModule.useSequences as unknown as Mock).mockReturnValue({
      data: mockSequences,
      isLoading: false,
    });
    (useEpisodesModule.useEpisodes as unknown as Mock).mockReturnValue({
      data: mockEpisodes,
      isLoading: false,
    });
  });

  describe('Loading state', () => {
    it('should show loading spinner when any data is loading', () => {
      (useShotsModule.useShots as unknown as Mock).mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      });

      renderWithQueryClient(<ShotsTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/Loading shots/i)).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error state when there is an error', () => {
      const error = new Error('Failed to load shots');
      (useShotsModule.useShots as unknown as Mock).mockReturnValue({
        data: [],
        isLoading: false,
        error,
      });

      renderWithQueryClient(<ShotsTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText(/Error loading shots/i)).toBeInTheDocument();
      expect(screen.getByText('Failed to load shots')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter shots by selected sequence ID', () => {
      (useUiStore as unknown as Mock).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: 'all',
          selectedSequenceId: '201', // Sequence A
          selectedShotId: 'all',
          selectedAssetId: 'all',
          selectedFormat: 'all',
          selectedVersionStatus: 'all',
          selectedPlaylistStatus: 'all',
          selectedEntityType: 'all',
          latestOnly: false,
        },
        setFilter: vi.fn(),
      });

      renderWithQueryClient(<ShotsTabWrapper {...defaultProps} />);

      // Should only show shots from sequence 201
      expect(screen.getByText('Shot 1')).toBeInTheDocument();
      expect(screen.getByText('Shot 2')).toBeInTheDocument();
      expect(screen.queryByText('Shot 3')).not.toBeInTheDocument();
    });

    it('should filter shots by selected shot ID', () => {
      (useUiStore as unknown as Mock).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedShotId: '301', // Using ID as string (fixed bug)
          selectedAssetId: 'all',
          selectedFormat: 'all',
          selectedVersionStatus: 'all',
          selectedPlaylistStatus: 'all',
          selectedEntityType: 'all',
          latestOnly: false,
        },
        setFilter: vi.fn(),
      });

      renderWithQueryClient(<ShotsTabWrapper {...defaultProps} />);

      // Should only show Shot 1 (id: 301)
      expect(screen.getByText('Shot 1')).toBeInTheDocument();
      expect(screen.queryByText('Shot 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Shot 3')).not.toBeInTheDocument();
    });

    it('should filter shots by project through sequence->episode relationship', () => {
      (useUiStore as unknown as Mock).mockReturnValue({
        filters: {
          selectedProjectId: '1', // Project 1
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
        setFilter: vi.fn(),
      });

      renderWithQueryClient(<ShotsTabWrapper {...defaultProps} />);

      // All shots belong to sequences in episode 101, which belongs to project 1
      expect(screen.getByText('Shot 1')).toBeInTheDocument();
      expect(screen.getByText('Shot 2')).toBeInTheDocument();
      expect(screen.getByText('Shot 3')).toBeInTheDocument();
    });

    it('should filter shots by episode through sequence relationship', () => {
      (useUiStore as unknown as Mock).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: '101', // Episode 101
          selectedSequenceId: 'all',
          selectedShotId: 'all',
          selectedAssetId: 'all',
          selectedFormat: 'all',
          selectedVersionStatus: 'all',
          selectedPlaylistStatus: 'all',
          selectedEntityType: 'all',
          latestOnly: false,
        },
        setFilter: vi.fn(),
      });

      renderWithQueryClient(<ShotsTabWrapper {...defaultProps} />);

      // All shots belong to sequences in episode 101
      expect(screen.getByText('Shot 1')).toBeInTheDocument();
      expect(screen.getByText('Shot 2')).toBeInTheDocument();
      expect(screen.getByText('Shot 3')).toBeInTheDocument();
    });

    it('should filter shots by search term', () => {
      renderWithQueryClient(<ShotsTabWrapper {...defaultProps} searchTerm="Shot 1" />);

      expect(screen.getByText('Shot 1')).toBeInTheDocument();
      expect(screen.queryByText('Shot 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Shot 3')).not.toBeInTheDocument();
    });

    it('should show empty state when no shots match filters', () => {
      (useUiStore as unknown as Mock).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: 'all',
          selectedSequenceId: '999', // Non-existent sequence
          selectedShotId: 'all',
          selectedAssetId: 'all',
          selectedFormat: 'all',
          selectedVersionStatus: 'all',
          selectedPlaylistStatus: 'all',
          selectedEntityType: 'all',
          latestOnly: false,
        },
        setFilter: vi.fn(),
      });

      renderWithQueryClient(<ShotsTabWrapper {...defaultProps} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText(/No shots found/i)).toBeInTheDocument();
    });

    it('should show clear filters button when filters are active', () => {
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
        setFilter: vi.fn(),
      });

      // Mock empty shots to trigger empty state
      (useShotsModule.useShots as unknown as Mock).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<ShotsTabWrapper {...defaultProps} />);

      expect(screen.getByText(/Clear filters/i)).toBeInTheDocument();
    });
  });

  describe('Props forwarding', () => {
    it('should forward all props to ShotsTab', () => {
      renderWithQueryClient(<ShotsTabWrapper {...defaultProps} />);

      const shotsTab = screen.getByTestId('shots-tab');
      expect(shotsTab).toBeInTheDocument();
      expect(screen.getByText('Shot 1')).toBeInTheDocument();
      expect(screen.getByText('Shot 2')).toBeInTheDocument();
      expect(screen.getByText('Shot 3')).toBeInTheDocument();
    });
  });
});
