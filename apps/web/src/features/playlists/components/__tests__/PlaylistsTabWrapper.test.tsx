import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlaylistsTabWrapper } from '../PlaylistsTabWrapper';
import { useUiStore } from '@app/stores/uiStore';

// Mock the Zustand store
vi.mock('@app/stores/uiStore', () => ({
  useUiStore: vi.fn(),
}));

// Mock usePlaylists
const mockUsePlaylists = vi.fn();
vi.mock('../../api/usePlaylists', () => ({
  usePlaylists: () => mockUsePlaylists(),
}));

// Mock useProjects
const mockUseProjects = vi.fn();
vi.mock('@features/projects/api/useProjects', () => ({
  useProjects: () => mockUseProjects(),
}));

// Mock useEpisodes
const mockUseEpisodes = vi.fn();
vi.mock('@features/episodes/api/useEpisodes', () => ({
  useEpisodes: () => mockUseEpisodes(),
}));

// Mock useSequences
const mockUseSequences = vi.fn();
vi.mock('@features/sequences/api/useSequences', () => ({
  useSequences: () => mockUseSequences(),
}));

// Mock useShots
const mockUseShots = vi.fn();
vi.mock('@features/shots/api/useShots', () => ({
  useShots: () => mockUseShots(),
}));

// Mock PlaylistsTab
vi.mock('@features/shotgrid/components/shotgrid/tabs/PlaylistsTab', () => ({
  PlaylistsTab: ({ playlists }: any) => (
    <div data-testid="playlists-tab">
      {playlists.map((p: any) => (
        <div key={p.id}>{p.name}</div>
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

describe('PlaylistsTabWrapper', () => {
  const defaultProps = {
    statusMap: {
      active: { label: 'Active', color: '#00FF00' },
      waiting: { label: 'Waiting', color: '#FF0000' },
    },
    selectedItems: new Set<string>(),
    onItemSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onItemClick: vi.fn(),
    onEditPlaylist: vi.fn(),
    onAddNoteToPlaylist: vi.fn(),
    onViewNotes: vi.fn(),
  };

  const mockPlaylists = [
    {
      id: 1,
      code: 'PL001',
      name: 'Playlist One',
      project: { id: 1, name: 'Project One' },
      status: 'active',
      statusId: 'active', // Add statusId to match filter
      versions: [
        { id: 1, entityCode: 'SHOT001' },
        { id: 2, entityCode: 'SHOT002' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      code: 'PL002',
      name: 'Playlist Two',
      project: { id: 2, name: 'Project Two' },
      status: 'waiting',
      statusId: 'waiting', // Add statusId to match filter
      versions: [{ id: 3, entityCode: 'SHOT003' }],
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
      sequence: { code: 'SEQ001' },
    },
    {
      id: 3,
      code: 'SHOT003',
      name: 'Shot Three',
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
        selectedPlaylistStatus: 'all',
      },
    });
    mockUsePlaylists.mockReturnValue({
      data: mockPlaylists,
      isLoading: false,
      error: null,
    });
    mockUseProjects.mockReturnValue({
      isLoading: false,
    });
    mockUseEpisodes.mockReturnValue({
      isLoading: false,
    });
    mockUseSequences.mockReturnValue({
      data: mockSequences,
      isLoading: false,
    });
    mockUseShots.mockReturnValue({
      data: mockShots,
      isLoading: false,
    });
  });

  describe('Basic rendering', () => {
    it('should render PlaylistsTab with playlists', () => {
      renderWithQueryClient(<PlaylistsTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('playlists-tab')).toBeInTheDocument();
      expect(screen.getByText('Playlist One')).toBeInTheDocument();
      expect(screen.getByText('Playlist Two')).toBeInTheDocument();
    });

    it('should show loading spinner when loading', () => {
      mockUsePlaylists.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      });

      renderWithQueryClient(<PlaylistsTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should show error state when there is an error', () => {
      mockUsePlaylists.mockReturnValue({
        data: [],
        isLoading: false,
        error: { message: 'Failed to load playlists' },
      });

      renderWithQueryClient(<PlaylistsTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('Error loading playlists')).toBeInTheDocument();
    });
  });

  describe('Filtering by project', () => {
    it('should filter by selected project', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '1',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedPlaylistStatus: 'all',
        },
      });

      renderWithQueryClient(<PlaylistsTabWrapper {...defaultProps} />);

      // Only playlists from project 1 should be shown
      expect(screen.getByText('Playlist One')).toBeInTheDocument();
      expect(screen.queryByText('Playlist Two')).not.toBeInTheDocument();
    });
  });

  describe('Filtering by episode', () => {
    it('should filter by selected episode through versions', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: '101',
          selectedSequenceId: 'all',
          selectedPlaylistStatus: 'all',
        },
      });

      // Mock sequences with episodeId
      mockUseSequences.mockReturnValue({
        data: [
          {
            id: 1,
            code: 'SEQ001',
            name: 'Sequence One',
            episodeId: 101,
          },
        ],
        isLoading: false,
      });

      renderWithQueryClient(<PlaylistsTabWrapper {...defaultProps} />);

      // Only playlists with versions from episode 101 should be shown
      expect(screen.getByText('Playlist One')).toBeInTheDocument();
      expect(screen.queryByText('Playlist Two')).not.toBeInTheDocument();
    });
  });

  describe('Filtering by sequence', () => {
    it('should filter by selected sequence through versions', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'SEQ001',
          selectedPlaylistStatus: 'all',
        },
      });

      renderWithQueryClient(<PlaylistsTabWrapper {...defaultProps} />);

      // Only playlists with versions from SEQ001 should be shown
      expect(screen.getByText('Playlist One')).toBeInTheDocument();
      expect(screen.queryByText('Playlist Two')).not.toBeInTheDocument();
    });
  });

  describe('Filtering by playlist status', () => {
    it('should filter by selected playlist status', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedPlaylistStatus: 'active',
        },
      });

      renderWithQueryClient(<PlaylistsTabWrapper {...defaultProps} />);

      // Only playlists with status 'active' should be shown
      expect(screen.getByText('Playlist One')).toBeInTheDocument();
      expect(screen.queryByText('Playlist Two')).not.toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('should filter by search term', () => {
      renderWithQueryClient(<PlaylistsTabWrapper {...defaultProps} searchTerm="One" />);

      expect(screen.getByText('Playlist One')).toBeInTheDocument();
      expect(screen.queryByText('Playlist Two')).not.toBeInTheDocument();
    });

    it('should be case insensitive', () => {
      renderWithQueryClient(<PlaylistsTabWrapper {...defaultProps} searchTerm="playlist" />);

      expect(screen.getByText('Playlist One')).toBeInTheDocument();
      expect(screen.getByText('Playlist Two')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no playlists match filters', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '999',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedPlaylistStatus: 'all',
        },
      });

      renderWithQueryClient(<PlaylistsTabWrapper {...defaultProps} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No playlists found')).toBeInTheDocument();
    });

    it('should show clear filters button when filters are active', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '1',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedPlaylistStatus: 'all',
        },
      });
      const setFilter = vi.fn();
      (useUiStore.getState as any) = vi.fn(() => ({
        setFilter,
      }));

      mockUsePlaylists.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<PlaylistsTabWrapper {...defaultProps} />);

      const clearButton = screen.getByText('Clear filters');
      expect(clearButton).toBeInTheDocument();
    });
  });
});
