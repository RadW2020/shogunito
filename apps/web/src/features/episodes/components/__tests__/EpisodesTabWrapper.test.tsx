import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EpisodesTabWrapper } from '../EpisodesTabWrapper';
import { useUiStore } from '@app/stores/uiStore';
import * as useEpisodesModule from '@features/episodes/api/useEpisodes';

// Mock the Zustand store
vi.mock('@app/stores/uiStore', () => ({
  useUiStore: vi.fn(),
}));

// Mock useEpisodes
vi.mock('@features/episodes/api/useEpisodes', () => ({
  useEpisodes: vi.fn(),
}));

// Mock EpisodesTab
vi.mock('@features/shotgrid/components/shotgrid/tabs/EpisodesTab', () => ({
  EpisodesTab: ({ episodes }: any) => (
    <div data-testid="episodes-tab">
      {episodes.map((e: any) => (
        <div key={e.id}>{e.name}</div>
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

describe('EpisodesTabWrapper', () => {
  const defaultProps = {
    statusMap: {
      active: { label: 'Active', color: '#00FF00' },
      waiting: { label: 'Waiting', color: '#FF0000' },
    },
    selectedItems: new Set<string>(),
    onItemSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onItemClick: vi.fn(),
    onEditEpisode: vi.fn(),
    onAddNoteToEpisode: vi.fn(),
    onViewNotes: vi.fn(),
  };

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
    {
      id: 102,
      code: 'EP002',
      name: 'Episode Two',
      projectId: 1,
      status: 'active',
      epNumber: 2,
      description: 'Second episode',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 103,
      code: 'EP003',
      name: 'Episode Three',
      projectId: 2,
      status: 'waiting',
      epNumber: 1,
      description: 'Third episode',
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
    (useEpisodesModule.useEpisodes as unknown as Mock).mockReturnValue({
      data: mockEpisodes,
      isLoading: false,
      error: null,
    });
  });

  describe('Loading state', () => {
    it('should show loading spinner when data is loading', () => {
      (useEpisodesModule.useEpisodes as unknown as Mock).mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      });

      renderWithQueryClient(<EpisodesTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/Loading episodes/i)).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error state when there is an error', () => {
      const error = new Error('Failed to load episodes');
      (useEpisodesModule.useEpisodes as unknown as Mock).mockReturnValue({
        data: [],
        isLoading: false,
        error,
      });

      renderWithQueryClient(<EpisodesTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText(/Error loading episodes/i)).toBeInTheDocument();
      expect(screen.getByText('Failed to load episodes')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter episodes by selected project ID', () => {
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

      renderWithQueryClient(<EpisodesTabWrapper {...defaultProps} />);

      // Should only show episodes from project 1
      expect(screen.getByText('Episode One')).toBeInTheDocument();
      expect(screen.getByText('Episode Two')).toBeInTheDocument();
      expect(screen.queryByText('Episode Three')).not.toBeInTheDocument();
    });

    it('should filter episodes by selected episode ID', () => {
      (useUiStore as unknown as Mock).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: '101', // Using ID as string (fixed bug)
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

      renderWithQueryClient(<EpisodesTabWrapper {...defaultProps} />);

      // Should only show Episode One (id: 101)
      expect(screen.getByText('Episode One')).toBeInTheDocument();
      expect(screen.queryByText('Episode Two')).not.toBeInTheDocument();
      expect(screen.queryByText('Episode Three')).not.toBeInTheDocument();
    });

    it('should show all episodes when filters are "all"', () => {
      renderWithQueryClient(<EpisodesTabWrapper {...defaultProps} />);

      expect(screen.getByText('Episode One')).toBeInTheDocument();
      expect(screen.getByText('Episode Two')).toBeInTheDocument();
      expect(screen.getByText('Episode Three')).toBeInTheDocument();
    });

    it('should filter episodes by search term', () => {
      renderWithQueryClient(<EpisodesTabWrapper {...defaultProps} searchTerm="One" />);

      expect(screen.getByText('Episode One')).toBeInTheDocument();
      expect(screen.queryByText('Episode Two')).not.toBeInTheDocument();
      expect(screen.queryByText('Episode Three')).not.toBeInTheDocument();
    });

    it('should show empty state when no episodes match filters', () => {
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
        setFilter: vi.fn(),
      });

      renderWithQueryClient(<EpisodesTabWrapper {...defaultProps} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText(/No episodes found/i)).toBeInTheDocument();
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

      // Mock empty episodes to trigger empty state
      (useEpisodesModule.useEpisodes as unknown as Mock).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<EpisodesTabWrapper {...defaultProps} />);

      expect(screen.getByText(/Clear filters/i)).toBeInTheDocument();
    });
  });

  describe('Props forwarding', () => {
    it('should forward all props to EpisodesTab', () => {
      renderWithQueryClient(<EpisodesTabWrapper {...defaultProps} />);

      const episodesTab = screen.getByTestId('episodes-tab');
      expect(episodesTab).toBeInTheDocument();
      expect(screen.getByText('Episode One')).toBeInTheDocument();
      expect(screen.getByText('Episode Two')).toBeInTheDocument();
      expect(screen.getByText('Episode Three')).toBeInTheDocument();
    });
  });
});
