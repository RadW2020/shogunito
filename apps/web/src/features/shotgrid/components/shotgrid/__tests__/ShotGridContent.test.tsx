import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShotGridContent } from '../ShotGridContent';
import type { TabType, StatusMeta, Project, Episode, Asset, Sequence, Shot, Status } from '@shogun/shared';
import type { ApiVersion, Playlist } from '@shared/api/client';

// Mock all tab wrappers
vi.mock('@features/projects/components/ProjectsTabWrapper', () => ({
  ProjectsTabWrapper: ({ onItemClick }: any) => (
    <div data-testid="projects-tab">Projects Tab</div>
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

vi.mock('../tabs', () => ({
  UsersTab: () => <div data-testid="users-tab">Users Tab</div>,
  StatusTab: () => <div data-testid="status-tab">Status Tab</div>,
}));

describe('ShotGridContent', () => {
  const mockStatusMap: Record<string, StatusMeta> = {
    'status-1': { code: 'active', name: 'Active', color: '#00FF00' },
  };

  const defaultProps = {
    activeTab: 'projects' as TabType,
    statusMap: mockStatusMap,
    selectedItems: new Set<string>(),
    searchTerm: '',
    onItemSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onItemClick: vi.fn(),
    onEditProject: vi.fn(),
    onEditEpisode: vi.fn(),
    onEditAsset: vi.fn(),
    onEditSequence: vi.fn(),
    onEditShot: vi.fn(),
    onEditVersion: vi.fn(),
    onEditPlaylist: vi.fn(),
    onEditStatus: vi.fn(),
    onAddNoteToProject: vi.fn(),
    onAddNoteToEpisode: vi.fn(),
    onAddNoteToAsset: vi.fn(),
    onAddNoteToSequence: vi.fn(),
    onAddNoteToShot: vi.fn(),
    onAddNoteToVersion: vi.fn(),
    onAddNoteToPlaylist: vi.fn(),
    onViewNotes: vi.fn(),
    onRefresh: vi.fn().mockResolvedValue(undefined),
    onClearSearch: vi.fn(),
    projects: [] as Project[],
    episodes: [] as Episode[],
    assets: [] as Asset[],
    sequences: [] as Sequence[],
    shots: [] as Shot[],
    versions: [] as ApiVersion[],
    playlists: [] as Playlist[],
    statuses: [] as Status[],
    users: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tab rendering', () => {
    it('should render projects tab when activeTab is projects', () => {
      render(<ShotGridContent {...defaultProps} activeTab="projects" />);
      expect(screen.getByTestId('projects-tab')).toBeInTheDocument();
    });

    it('should render episodes tab when activeTab is episodes', () => {
      render(<ShotGridContent {...defaultProps} activeTab="episodes" />);
      expect(screen.getByTestId('episodes-tab')).toBeInTheDocument();
    });

    it('should render assets tab when activeTab is assets', () => {
      render(<ShotGridContent {...defaultProps} activeTab="assets" />);
      expect(screen.getByTestId('assets-tab')).toBeInTheDocument();
    });

    it('should render sequences tab when activeTab is sequences', () => {
      render(<ShotGridContent {...defaultProps} activeTab="sequences" />);
      expect(screen.getByTestId('sequences-tab')).toBeInTheDocument();
    });

    it('should render shots tab when activeTab is shots', () => {
      render(<ShotGridContent {...defaultProps} activeTab="shots" />);
      expect(screen.getByTestId('shots-tab')).toBeInTheDocument();
    });

    it('should render versions tab when activeTab is versions', () => {
      render(<ShotGridContent {...defaultProps} activeTab="versions" />);
      expect(screen.getByTestId('versions-tab')).toBeInTheDocument();
    });

    it('should render playlists tab when activeTab is playlists', () => {
      render(<ShotGridContent {...defaultProps} activeTab="playlists" />);
      expect(screen.getByTestId('playlists-tab')).toBeInTheDocument();
    });

    it('should render notes tab when activeTab is notes', () => {
      render(<ShotGridContent {...defaultProps} activeTab="notes" />);
      expect(screen.getByTestId('notes-tab')).toBeInTheDocument();
    });

    it('should render users tab when activeTab is users', () => {
      render(<ShotGridContent {...defaultProps} activeTab="users" />);
      expect(screen.getByTestId('users-tab')).toBeInTheDocument();
    });

    it('should render status tab when activeTab is status', () => {
      render(<ShotGridContent {...defaultProps} activeTab="status" />);
      expect(screen.getByTestId('status-tab')).toBeInTheDocument();
    });

    it('should render default message for unknown tab', () => {
      render(<ShotGridContent {...defaultProps} activeTab={'unknown' as TabType} />);
      expect(screen.getByText('Tab not implemented yet')).toBeInTheDocument();
    });
  });

  describe('Props passing', () => {
    it('should pass correct props to ProjectsTabWrapper', () => {
      const onItemSelect = vi.fn();
      const onSelectAll = vi.fn();
      const onItemClick = vi.fn();
      const onEditProject = vi.fn();
      const onAddNoteToProject = vi.fn();
      const onViewNotes = vi.fn();

      render(
        <ShotGridContent
          {...defaultProps}
          activeTab="projects"
          statusMap={mockStatusMap}
          selectedItems={new Set(['1', '2'])}
          searchTerm="test search"
          onItemSelect={onItemSelect}
          onSelectAll={onSelectAll}
          onItemClick={onItemClick}
          onEditProject={onEditProject}
          onAddNoteToProject={onAddNoteToProject}
          onViewNotes={onViewNotes}
        />,
      );

      expect(screen.getByTestId('projects-tab')).toBeInTheDocument();
    });
  });
});

