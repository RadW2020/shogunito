import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShotGrid } from '../shot-grid';
import { useUiStore } from '@app/stores/uiStore';
import * as apiServiceModule from '@shared/api/client';

// Mock useQueryClient
const mockRefetchQueries = vi.fn();
const mockInvalidateQueries = vi.fn();
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      refetchQueries: mockRefetchQueries,
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

// Mock the Zustand store
const mockSetActiveTab = vi.fn();
const mockToggleFilters = vi.fn();
const mockSetSelectedItems = vi.fn();
const mockSetSelectedDetail = vi.fn();
const mockSetViewMode = vi.fn();
const mockSetFilter = vi.fn();

vi.mock('@app/stores/uiStore', () => ({
  useUiStore: vi.fn(),
}));

// Mock API service
vi.mock('@shared/api/client', () => ({
  apiService: {
    getProjects: vi.fn(),
    getEpisodes: vi.fn(),
    getAssets: vi.fn(),
    getSequences: vi.fn(),
    getShots: vi.fn(),
    getVersions: vi.fn(),
    getPlaylists: vi.fn(),
    getStatuses: vi.fn(),
    getUsers: vi.fn(),
    deleteProject: vi.fn(),
    deleteEpisode: vi.fn(),
    deleteAsset: vi.fn(),
    deleteShot: vi.fn(),
    deleteVersion: vi.fn(),
    deletePlaylist: vi.fn(),
  },
}));

// Mock all tab wrappers
vi.mock('@features/projects/components/ProjectsTabWrapper', () => ({
  ProjectsTabWrapper: ({ onItemClick, onItemSelect }: any) => (
    <div data-testid="projects-tab">
      <button onClick={() => onItemClick('projects', { id: 1, name: 'Project 1' })}>
        Click Project
      </button>
      <button onClick={() => onItemSelect('1', true)}>Select Project</button>
    </div>
  ),
}));

vi.mock('@features/episodes/components/EpisodesTabWrapper', () => ({
  EpisodesTabWrapper: () => <div data-testid="episodes-tab">Episodes Tab</div>,
}));

vi.mock('@features/assets/components/AssetsTabWrapper', () => ({
  AssetsTabWrapper: () => <div data-testid="assets-tab">Assets Tab</div>,
}));

vi.mock('@features/sequences/components/SequencesTabWrapper', () => ({
  SequencesTabWrapper: () => <div data-testid="sequences-tab">Sequences Tab</div>,
}));

vi.mock('@features/shots/components/ShotsTabWrapper', () => ({
  ShotsTabWrapper: () => <div data-testid="shots-tab">Shots Tab</div>,
}));

vi.mock('@features/versions/components/VersionsTabWrapper', () => ({
  VersionsTabWrapper: () => <div data-testid="versions-tab">Versions Tab</div>,
}));

vi.mock('@features/playlists/components/PlaylistsTabWrapper', () => ({
  PlaylistsTabWrapper: () => <div data-testid="playlists-tab">Playlists Tab</div>,
}));

vi.mock('@features/notes/components/NotesTabWrapper', () => ({
  NotesTabWrapper: () => <div data-testid="notes-tab">Notes Tab</div>,
}));

vi.mock('@features/shotgrid/components/shotgrid/tabs', () => ({
  UsersTab: () => <div data-testid="users-tab">Users Tab</div>,
  StatusTab: () => <div data-testid="status-tab">Status Tab</div>,
}));

// Mock modals
vi.mock('@shared/components/modals', () => ({
  AddProjectModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="add-project-modal">Add Project</div> : null,
  AddEpisodeModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="add-episode-modal">Add Episode</div> : null,
  AddAssetModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="add-asset-modal">Add Asset</div> : null,
  AddSequenceModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="add-sequence-modal">Add Sequence</div> : null,
  AddShotModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="add-shot-modal">Add Shot</div> : null,
  AddPlaylistModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="add-playlist-modal">Add Playlist</div> : null,
  AddStatusModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="add-status-modal">Add Status</div> : null,
  ProjectEditModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="edit-project-modal">Edit Project</div> : null,
  EpisodeEditModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="edit-episode-modal">Edit Episode</div> : null,
  AssetEditModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="edit-asset-modal">Edit Asset</div> : null,
  SequenceEditModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="edit-sequence-modal">Edit Sequence</div> : null,
  ShotEditModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="edit-shot-modal">Edit Shot</div> : null,
  AddVersionModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="add-version-modal">Add Version</div> : null,
  VersionEditModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="edit-version-modal">Edit Version</div> : null,
  PlaylistEditModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="edit-playlist-modal">Edit Playlist</div> : null,
  StatusEditModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="edit-status-modal">Edit Status</div> : null,
  NotesViewerModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="notes-viewer-modal">Notes Viewer</div> : null,
}));

vi.mock('@shared/components/modals/GeneralNoteCreatorModal', () => ({
  GeneralNoteCreatorModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="general-note-creator-modal">General Note Creator</div> : null,
}));

// Mock FiltersBar and Toolbar
vi.mock('@features/shotgrid/components/shotgrid/FiltersBar', () => ({
  FiltersBar: () => <div data-testid="filters-bar">Filters Bar</div>,
}));

vi.mock('@features/shotgrid/components/shotgrid/Toolbar', () => ({
  Toolbar: ({ onAddClick, onToggleFilters, onSearchChange }: any) => (
    <div data-testid="toolbar">
      <button onClick={onAddClick} data-testid="add-button">
        Add
      </button>
      <button onClick={onToggleFilters} data-testid="toggle-filters-button">
        Toggle Filters
      </button>
      <input
        data-testid="search-input"
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search"
      />
    </div>
  ),
}));

// Mock hooks
vi.mock('@features/shotgrid/components/shotgrid/hooks/useStatusHelper', () => ({
  useStatusHelper: () => ({
    statusMap: {
      active: { label: 'Active', color: '#00FF00' },
      waiting: { label: 'Waiting', color: '#FF0000' },
    },
  }),
}));

vi.mock('@features/sequences/api/useSequences', () => ({
  useDeleteSequence: () => ({
    mutateAsync: vi.fn(),
  }),
}));

describe('ShotGrid', () => {
  const user = userEvent.setup();
  const mockProjects = [
    { id: 1, name: 'Project 1', code: 'P001' },
    { id: 2, name: 'Project 2', code: 'P002' },
  ];

  const mockEpisodes = [
    { id: 1, name: 'Episode 1', code: 'E001', projectId: 1 },
    { id: 2, name: 'Episode 2', code: 'E002', projectId: 1 },
  ];

  const mockStatuses = [
    { id: 1, name: 'active', label: 'Active', color: '#00FF00' },
    { id: 2, name: 'waiting', label: 'Waiting', color: '#FF0000' },
  ];

  const renderWithQueryClient = (ui: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, refetchOnWindowFocus: false },
        mutations: { retry: false },
      },
    });
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useUiStore as any).mockReturnValue({
      activeTab: 'projects',
      showFilters: false,
      selectedItems: new Set<string>(),
      showDetailPanel: false,
      selectedDetail: null,
      viewModes: {
        versions: 'grid',
      },
      filters: {
        selectedProjectId: 'all',
        selectedEpisodeId: 'all',
        selectedSequenceId: 'all',
        selectedShotId: 'all',
        selectedAssetId: 'all',
        selectedVersionStatus: 'all',
        selectedPlaylistStatus: 'all',
        selectedFormat: 'all',
        selectedEntityType: 'all',
        latestOnly: false,
      },
      setActiveTab: mockSetActiveTab,
      toggleFilters: mockToggleFilters,
      setSelectedItems: mockSetSelectedItems,
      setSelectedDetail: mockSetSelectedDetail,
      setViewMode: mockSetViewMode,
      setFilter: mockSetFilter,
    });

    // Mock API responses
    (apiServiceModule.apiService.getProjects as any).mockResolvedValue(mockProjects);
    (apiServiceModule.apiService.getEpisodes as any).mockResolvedValue(mockEpisodes);
    (apiServiceModule.apiService.getAssets as any).mockResolvedValue([]);
    (apiServiceModule.apiService.getSequences as any).mockResolvedValue([]);
    (apiServiceModule.apiService.getShots as any).mockResolvedValue([]);
    (apiServiceModule.apiService.getVersions as any).mockResolvedValue([]);
    (apiServiceModule.apiService.getPlaylists as any).mockResolvedValue([]);
    (apiServiceModule.apiService.getStatuses as any).mockResolvedValue(mockStatuses);
    (apiServiceModule.apiService.getUsers as any).mockResolvedValue([]);
  });

  describe('Basic rendering', () => {
    it('should render ShotGrid component', async () => {
      renderWithQueryClient(<ShotGrid />);

      await waitFor(() => {
        expect(screen.getByTestId('projects-tab')).toBeInTheDocument();
      });
    });

    it('should render all tabs', () => {
      renderWithQueryClient(<ShotGrid />);

      expect(screen.getByTestId('tab-projects')).toBeInTheDocument();
      expect(screen.getByTestId('tab-episodes')).toBeInTheDocument();
      expect(screen.getByTestId('tab-assets')).toBeInTheDocument();
      expect(screen.getByTestId('tab-sequences')).toBeInTheDocument();
      expect(screen.getByTestId('tab-shots')).toBeInTheDocument();
      expect(screen.getByTestId('tab-versions')).toBeInTheDocument();
      expect(screen.getByTestId('tab-playlists')).toBeInTheDocument();
      expect(screen.getByTestId('tab-notes')).toBeInTheDocument();
    });

    it('should render toolbar', () => {
      renderWithQueryClient(<ShotGrid />);

      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('add-button')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-filters-button')).toBeInTheDocument();
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });
  });

  describe('Tab switching', () => {
    it('should switch to episodes tab when clicked', async () => {
      renderWithQueryClient(<ShotGrid />);

      const episodesTab = screen.getByTestId('tab-episodes');
      await user.click(episodesTab);

      expect(mockSetActiveTab).toHaveBeenCalledWith('episodes');
    });

    it('should render correct tab content for each tab', async () => {
      const { rerender } = renderWithQueryClient(<ShotGrid />);

      // Test projects tab
      (useUiStore as any).mockReturnValue({
        activeTab: 'projects',
        showFilters: false,
        selectedItems: new Set<string>(),
        showDetailPanel: false,
        selectedDetail: null,
        viewModes: { versions: 'grid' },
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedShotId: 'all',
          selectedAssetId: 'all',
          selectedVersionStatus: 'all',
          selectedPlaylistStatus: 'all',
          selectedFormat: 'all',
          selectedEntityType: 'all',
          latestOnly: false,
        },
        setActiveTab: mockSetActiveTab,
        toggleFilters: mockToggleFilters,
        setSelectedItems: mockSetSelectedItems,
        setSelectedDetail: mockSetSelectedDetail,
        setViewMode: mockSetViewMode,
        setFilter: mockSetFilter,
      });
      rerender(<ShotGrid />);
      await waitFor(() => {
        expect(screen.getByTestId('projects-tab')).toBeInTheDocument();
      });

      // Test episodes tab
      (useUiStore as any).mockReturnValue({
        activeTab: 'episodes',
        showFilters: false,
        selectedItems: new Set<string>(),
        showDetailPanel: false,
        selectedDetail: null,
        viewModes: { versions: 'grid' },
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedShotId: 'all',
          selectedAssetId: 'all',
          selectedVersionStatus: 'all',
          selectedPlaylistStatus: 'all',
          selectedFormat: 'all',
          selectedEntityType: 'all',
          latestOnly: false,
        },
        setActiveTab: mockSetActiveTab,
        toggleFilters: mockToggleFilters,
        setSelectedItems: mockSetSelectedItems,
        setSelectedDetail: mockSetSelectedDetail,
        setViewMode: mockSetViewMode,
        setFilter: mockSetFilter,
      });
      rerender(<ShotGrid />);
      await waitFor(() => {
        expect(screen.getByTestId('episodes-tab')).toBeInTheDocument();
      });
    });
  });

  describe('Filters', () => {
    it('should show filters bar when showFilters is true', () => {
      (useUiStore as any).mockReturnValue({
        activeTab: 'projects',
        showFilters: true,
        selectedItems: new Set<string>(),
        showDetailPanel: false,
        selectedDetail: null,
        viewModes: { versions: 'grid' },
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedShotId: 'all',
          selectedAssetId: 'all',
          selectedVersionStatus: 'all',
          selectedPlaylistStatus: 'all',
          selectedFormat: 'all',
          selectedEntityType: 'all',
          latestOnly: false,
        },
        setActiveTab: mockSetActiveTab,
        toggleFilters: mockToggleFilters,
        setSelectedItems: mockSetSelectedItems,
        setSelectedDetail: mockSetSelectedDetail,
        setViewMode: mockSetViewMode,
        setFilter: mockSetFilter,
      });

      renderWithQueryClient(<ShotGrid />);

      expect(screen.getByTestId('filters-bar')).toBeInTheDocument();
    });

    it('should toggle filters when toggle button is clicked', async () => {
      renderWithQueryClient(<ShotGrid />);

      const toggleButton = screen.getByTestId('toggle-filters-button');
      await user.click(toggleButton);

      expect(mockToggleFilters).toHaveBeenCalled();
    });
  });

  describe('Search functionality', () => {
    it('should update search term when typing in search input', async () => {
      renderWithQueryClient(<ShotGrid />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test search');

      expect(searchInput).toHaveValue('test search');
    });
  });

  describe('Add functionality', () => {
    it('should open AddProjectModal when Add is clicked on projects tab', async () => {
      renderWithQueryClient(<ShotGrid />);

      const addButton = screen.getByTestId('add-button');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('add-project-modal')).toBeInTheDocument();
      });
    });

    it('should open AddEpisodeModal when Add is clicked on episodes tab', async () => {
      (useUiStore as any).mockReturnValue({
        activeTab: 'episodes',
        showFilters: false,
        selectedItems: new Set<string>(),
        showDetailPanel: false,
        selectedDetail: null,
        viewModes: { versions: 'grid' },
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
          selectedShotId: 'all',
          selectedAssetId: 'all',
          selectedVersionStatus: 'all',
          selectedPlaylistStatus: 'all',
          selectedFormat: 'all',
          selectedEntityType: 'all',
          latestOnly: false,
        },
        setActiveTab: mockSetActiveTab,
        toggleFilters: mockToggleFilters,
        setSelectedItems: mockSetSelectedItems,
        setSelectedDetail: mockSetSelectedDetail,
        setViewMode: mockSetViewMode,
        setFilter: mockSetFilter,
      });

      const { rerender } = renderWithQueryClient(<ShotGrid />);
      rerender(<ShotGrid />);

      const addButton = screen.getByTestId('add-button');
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('add-episode-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Item selection and detail panel', () => {
    it('should open detail panel when item is clicked', async () => {
      renderWithQueryClient(<ShotGrid />);

      await waitFor(() => {
        expect(screen.getByTestId('projects-tab')).toBeInTheDocument();
      });

      const clickButton = screen.getByText('Click Project');
      await user.click(clickButton);

      expect(mockSetSelectedDetail).toHaveBeenCalledWith({
        type: 'projects',
        item: { id: 1, name: 'Project 1' },
      });
    });

    it('should handle item selection', async () => {
      renderWithQueryClient(<ShotGrid />);

      await waitFor(() => {
        expect(screen.getByTestId('projects-tab')).toBeInTheDocument();
      });

      const selectButton = screen.getByText('Select Project');
      await user.click(selectButton);

      expect(mockSetSelectedItems).toHaveBeenCalled();
    });
  });
});
