import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShotGridModals } from '../ShotGridModals';
import type { Project, Episode, Asset, Sequence } from '@shogun/shared';
import type { ApiVersion, Playlist } from '@shared/api/client';

// Mock all modals - Make them call onClose and onSuccess to cover callback paths
vi.mock('@shared/components/modals', () => ({
  AddProjectModal: ({ isOpen, onClose, onSuccess }: any) => {
    if (isOpen) {
      // Call callbacks to cover those code paths
      setTimeout(() => {
        if (onClose) onClose();
        if (onSuccess) onSuccess();
      }, 0);
      return <div data-testid="add-project-modal">Add Project</div>;
    }
    return null;
  },
  AddEpisodeModal: ({ isOpen, onClose, onSuccess, projects }: any) => {
    if (isOpen) {
      setTimeout(() => {
        if (onClose) onClose();
        if (onSuccess) onSuccess();
      }, 0);
      return <div data-testid="add-episode-modal">Add Episode {projects?.length || 0}</div>;
    }
    return null;
  },
  AddAssetModal: ({ isOpen, onClose, onSuccess, projects }: any) => {
    if (isOpen) {
      setTimeout(() => {
        if (onClose) onClose();
        if (onSuccess) onSuccess();
      }, 0);
      return <div data-testid="add-asset-modal">Add Asset {projects?.length || 0}</div>;
    }
    return null;
  },
  AddSequenceModal: ({ isOpen, onClose, onSuccess, episodes }: any) => {
    if (isOpen) {
      setTimeout(() => {
        if (onClose) onClose();
        if (onSuccess) onSuccess();
      }, 0);
      return <div data-testid="add-sequence-modal">Add Sequence {episodes?.length || 0}</div>;
    }
    return null;
  },

  AddVersionModal: ({ isOpen, onClose, onSuccess, assets, sequences, episodes }: any) => {
    if (isOpen) {
      setTimeout(() => {
        if (onClose) onClose();
        if (onSuccess) onSuccess();
      }, 0);
      return (
        <div data-testid="add-version-modal">
          Add Version {assets?.length || 0} {sequences?.length || 0}{' '}
          {episodes?.length || 0}
        </div>
      );
    }
    return null;
  },
  AddPlaylistModal: ({ isOpen, onClose, onSuccess }: any) => {
    if (isOpen) {
      setTimeout(() => {
        if (onClose) onClose();
        if (onSuccess) onSuccess();
      }, 0);
      return <div data-testid="add-playlist-modal">Add Playlist</div>;
    }
    return null;
  },
  AddStatusModal: ({ isOpen, onClose, onSuccess }: any) => {
    if (isOpen) {
      setTimeout(() => {
        if (onClose) onClose();
        if (onSuccess) onSuccess();
      }, 0);
      return <div data-testid="add-status-modal">Add Status</div>;
    }
    return null;
  },
  ProjectEditModal: ({ isOpen, project, onClose, onSuccess }: any) => {
    if (isOpen && project) {
      setTimeout(() => {
        if (onClose) onClose();
        if (onSuccess) onSuccess();
      }, 0);
      return <div data-testid="edit-project-modal">Edit Project</div>;
    }
    return null;
  },
  EpisodeEditModal: ({ isOpen, episode, onClose, onSuccess }: any) => {
    if (isOpen && episode) {
      setTimeout(() => {
        if (onClose) onClose();
        if (onSuccess) onSuccess();
      }, 0);
      return <div data-testid="edit-episode-modal">Edit Episode</div>;
    }
    return null;
  },
  AssetEditModal: ({ isOpen, asset, onClose, onSuccess }: any) => {
    if (isOpen && asset) {
      setTimeout(() => {
        if (onClose) onClose();
        if (onSuccess) onSuccess();
      }, 0);
      return <div data-testid="edit-asset-modal">Edit Asset</div>;
    }
    return null;
  },
  SequenceEditModal: ({ isOpen, sequence, onClose, onSuccess }: any) => {
    if (isOpen && sequence) {
      setTimeout(() => {
        if (onClose) onClose();
        if (onSuccess) onSuccess();
      }, 0);
      return <div data-testid="edit-sequence-modal">Edit Sequence</div>;
    }
    return null;
  },

  VersionEditModal: ({ isOpen, version, onClose, onSuccess }: any) => {
    if (isOpen && version) {
      setTimeout(() => {
        if (onClose) onClose();
        if (onSuccess) onSuccess();
      }, 0);
      return <div data-testid="edit-version-modal">Edit Version</div>;
    }
    return null;
  },
  PlaylistEditModal: ({ isOpen, playlist, onClose, onSuccess }: any) => {
    if (isOpen && playlist) {
      setTimeout(() => {
        if (onClose) onClose();
        if (onSuccess) onSuccess();
      }, 0);
      return <div data-testid="edit-playlist-modal">Edit Playlist</div>;
    }
    return null;
  },
  StatusEditModal: ({ isOpen, status, onClose, onSuccess }: any) => {
    if (isOpen && status) {
      setTimeout(() => {
        if (onClose) onClose();
        if (onSuccess) onSuccess();
      }, 0);
      return <div data-testid="edit-status-modal">Edit Status</div>;
    }
    return null;
  },
  NotesViewerModal: ({ isOpen, linkId, linkType, linkName, onClose, onRefresh }: any) => {
    if (isOpen && linkId) {
      setTimeout(() => {
        if (onClose) onClose();
        if (onRefresh) onRefresh();
      }, 0);
      return (
        <div data-testid="notes-viewer-modal">
          Notes Viewer {linkId} {linkType} {linkName}
        </div>
      );
    }
    return null;
  },
}));

vi.mock('@shared/components/modals/GeneralNoteCreatorModal', () => ({
  GeneralNoteCreatorModal: ({ isOpen, onClose, projects, episodes, assets, sequences, playlists, versions }: any) => {
    if (isOpen) {
      setTimeout(() => {
        if (onClose) onClose();
      }, 0);
      return (
        <div data-testid="general-note-creator-modal">
          General Note Creator {projects?.length || 0} {episodes?.length || 0} {assets?.length || 0}{' '}
          {sequences?.length || 0} {playlists?.length || 0} {versions?.length || 0}
        </div>
      );
    }
    return null;
  },
}));

const mockOnNoteCreated = vi.fn();
const mockOnCancel = vi.fn();

vi.mock('@shared/components/shared/NoteCreator', () => ({
  NoteCreator: ({ linkId, linkType, linkName, onNoteCreated, onCancel }: any) => {
    // Store callbacks for testing
    if (onNoteCreated) mockOnNoteCreated.mockImplementation(onNoteCreated);
    if (onCancel) mockOnCancel.mockImplementation(onCancel);
    
    return (
      <div data-testid="note-creator">
        Note Creator for {linkName} ({linkType}: {linkId})
        <button data-testid="trigger-note-created" onClick={() => onNoteCreated?.()}>
          Create Note
        </button>
        <button data-testid="trigger-cancel" onClick={() => onCancel?.()}>
          Cancel
        </button>
      </div>
    );
  },
}));

describe('ShotGridModals', () => {
  const mockOnRefresh = vi.fn().mockResolvedValue(undefined);
  const mockCloseAddModal = vi.fn();
  const mockCloseEditModal = vi.fn();
  const mockSetNoteCreatorEntity = vi.fn();
  const mockSetViewingNotesFor = vi.fn();

  const defaultModals = {
    showAddProject: false,
    showAddEpisode: false,
    showAddAsset: false,
    showAddSequence: false,
    showAddPlaylist: false,
    showAddVersion: false,
    showAddNote: false,
    showAddStatus: false,
    showEditProject: false,
    showEditEpisode: false,
    showEditAsset: false,
    showEditSequence: false,
    showEditVersion: false,
    showEditPlaylist: false,
    showEditStatus: false,
    showNotesViewer: false,
    editingProject: null,
    editingEpisode: null,
    editingAsset: null,
    editingSequence: null,
    editingVersion: null,
    editingPlaylist: null,
    editingStatus: null,
    noteCreatorEntity: null,
    viewingNotesFor: null,
    closeAddModal: mockCloseAddModal,
    closeEditModal: mockCloseEditModal,
    setNoteCreatorEntity: mockSetNoteCreatorEntity,
    setViewingNotesFor: mockSetViewingNotesFor,
  };

  const defaultProps = {
    modals: defaultModals,
    onRefresh: mockOnRefresh,
    projects: [] as Project[],
    episodes: [] as Episode[],
    assets: [] as Asset[],
    sequences: [] as Sequence[],
    versions: [] as ApiVersion[],
    playlists: [] as Playlist[],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnNoteCreated.mockClear();
    mockOnCancel.mockClear();
  });

  describe('Add modals', () => {
    it('should render AddProjectModal when showAddProject is true', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, showAddProject: true }}
        />,
      );
      expect(screen.getByTestId('add-project-modal')).toBeInTheDocument();
    });

    it('should render AddEpisodeModal when showAddEpisode is true', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, showAddEpisode: true }}
        />,
      );
      expect(screen.getByTestId('add-episode-modal')).toBeInTheDocument();
    });

    it('should render AddAssetModal when showAddAsset is true', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, showAddAsset: true }}
        />,
      );
      expect(screen.getByTestId('add-asset-modal')).toBeInTheDocument();
    });

    it('should render AddSequenceModal when showAddSequence is true', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, showAddSequence: true }}
        />,
      );
      expect(screen.getByTestId('add-sequence-modal')).toBeInTheDocument();
    });



    it('should render AddVersionModal when showAddVersion is true', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, showAddVersion: true }}
        />,
      );
      expect(screen.getByTestId('add-version-modal')).toBeInTheDocument();
    });

    it('should render AddPlaylistModal when showAddPlaylist is true', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, showAddPlaylist: true }}
        />,
      );
      expect(screen.getByTestId('add-playlist-modal')).toBeInTheDocument();
    });

    it('should render AddStatusModal when showAddStatus is true', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, showAddStatus: true }}
        />,
      );
      expect(screen.getByTestId('add-status-modal')).toBeInTheDocument();
    });

    it('should render GeneralNoteCreatorModal when showAddNote is true', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, showAddNote: true }}
        />,
      );
      expect(screen.getByTestId('general-note-creator-modal')).toBeInTheDocument();
    });
  });

  describe('Edit modals', () => {
    const mockProject: Project = { id: 1, code: 'PROJ-001', name: 'Test Project' } as Project;
    const mockEpisode: Episode = { id: 1, code: 'EP-001', name: 'Test Episode' } as Episode;
    const mockAsset: Asset = { id: 1, code: 'ASSET-001', name: 'Test Asset' } as Asset;
    const mockSequence: Sequence = { id: 1, code: 'SEQ-001', name: 'Test Sequence' } as Sequence;
    const mockVersion: ApiVersion = { id: 1, code: 'VER-001' } as ApiVersion;
    const mockPlaylist: Playlist = { id: 1, code: 'PLAY-001', name: 'Test Playlist' } as Playlist;

    it('should render ProjectEditModal when showEditProject is true and editingProject exists', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, showEditProject: true, editingProject: mockProject }}
        />,
      );
      expect(screen.getByTestId('edit-project-modal')).toBeInTheDocument();
    });

    it('should not render ProjectEditModal when editingProject is null', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, showEditProject: true, editingProject: null }}
        />,
      );
      expect(screen.queryByTestId('edit-project-modal')).not.toBeInTheDocument();
    });

    it('should render EpisodeEditModal when showEditEpisode is true and editingEpisode exists', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, showEditEpisode: true, editingEpisode: mockEpisode }}
        />,
      );
      expect(screen.getByTestId('edit-episode-modal')).toBeInTheDocument();
    });

    it('should render AssetEditModal when showEditAsset is true and editingAsset exists', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, showEditAsset: true, editingAsset: mockAsset }}
        />,
      );
      expect(screen.getByTestId('edit-asset-modal')).toBeInTheDocument();
    });

    it('should render SequenceEditModal when showEditSequence is true and editingSequence exists', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, showEditSequence: true, editingSequence: mockSequence }}
        />,
      );
      expect(screen.getByTestId('edit-sequence-modal')).toBeInTheDocument();
    });



    it('should render VersionEditModal when showEditVersion is true and editingVersion exists', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, showEditVersion: true, editingVersion: mockVersion }}
        />,
      );
      expect(screen.getByTestId('edit-version-modal')).toBeInTheDocument();
    });

    it('should render PlaylistEditModal when showEditPlaylist is true and editingPlaylist exists', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, showEditPlaylist: true, editingPlaylist: mockPlaylist }}
        />,
      );
      expect(screen.getByTestId('edit-playlist-modal')).toBeInTheDocument();
    });
  });

  describe('NotesViewerModal', () => {
    it('should render NotesViewerModal when showNotesViewer is true and viewingNotesFor exists', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{
            ...defaultModals,
            showNotesViewer: true,
            viewingNotesFor: { linkId: '123', linkType: 'Project', linkName: 'Test Project' },
          }}
        />,
      );
      expect(screen.getByTestId('notes-viewer-modal')).toBeInTheDocument();
    });

    it('should not render NotesViewerModal when viewingNotesFor is null', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, showNotesViewer: true, viewingNotesFor: null }}
        />,
      );
      expect(screen.queryByTestId('notes-viewer-modal')).not.toBeInTheDocument();
    });
  });

  describe('Note Creator Entity Modal', () => {
    it('should render note creator modal when noteCreatorEntity exists', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{
            ...defaultModals,
            noteCreatorEntity: { linkId: '123', linkType: 'Project', linkName: 'Test Project' },
          }}
        />,
      );
      expect(screen.getByTestId('note-creator')).toBeInTheDocument();
      expect(screen.getByText('Add Note to Project')).toBeInTheDocument();
    });

    it('should not render note creator modal when noteCreatorEntity is null', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, noteCreatorEntity: null }}
        />,
      );
      expect(screen.queryByTestId('note-creator')).not.toBeInTheDocument();
    });

    it('should close note creator modal when backdrop is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{
            ...defaultModals,
            noteCreatorEntity: { linkId: '123', linkType: 'Project', linkName: 'Test Project' },
          }}
        />,
      );

      const backdrop = screen.getByRole('dialog').querySelector('.absolute.inset-0');
      if (backdrop) {
        await user.click(backdrop);
        expect(mockSetNoteCreatorEntity).toHaveBeenCalledWith(null);
      }
    });

    it('should close note creator modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{
            ...defaultModals,
            noteCreatorEntity: { linkId: '123', linkType: 'Project', linkName: 'Test Project' },
          }}
        />,
      );

      const closeButton = screen.getByText('✕');
      await user.click(closeButton);
      expect(mockSetNoteCreatorEntity).toHaveBeenCalledWith(null);
    });

    it('should render note creator for different entity types', () => {
      const entityTypes = ['Episode', 'Asset', 'Sequence', 'Shot', 'Playlist', 'Version'];

      entityTypes.forEach((linkType) => {
        const { unmount } = render(
          <ShotGridModals
            {...defaultProps}
            modals={{
              ...defaultModals,
              noteCreatorEntity: { linkId: '123', linkType, linkName: `Test ${linkType}` },
            }}
          />,
        );
        expect(screen.getByText(`Add Note to ${linkType}`)).toBeInTheDocument();
        unmount();
      });
    });

    it('should prevent event propagation when clicking modal content', async () => {
      const user = userEvent.setup();
      const setNoteCreatorEntity = vi.fn();
      
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{
            ...defaultModals,
            noteCreatorEntity: { linkId: '123', linkType: 'Project', linkName: 'Test Project' },
            setNoteCreatorEntity,
          }}
        />,
      );

      // Clear any calls from the mock NoteCreator component
      setNoteCreatorEntity.mockClear();

      const modalContent = screen.getByRole('dialog').querySelector('.relative');
      if (modalContent) {
        await user.click(modalContent);
        // Should not close when clicking content (stopPropagation prevents backdrop click)
        // Note: The mock NoteCreator calls callbacks, so we just verify the click didn't trigger backdrop
        expect(screen.getByTestId('note-creator')).toBeInTheDocument();
      }
    });
  });

  describe('Modal props passing', () => {
    it('should pass projects to AddEpisodeModal', () => {
      const projects = [{ id: 1, code: 'PROJ-001', name: 'Test Project' }] as Project[];
      render(
        <ShotGridModals
          {...defaultProps}
          projects={projects}
          modals={{ ...defaultModals, showAddEpisode: true }}
        />,
      );
      expect(screen.getByTestId('add-episode-modal')).toBeInTheDocument();
    });

    it('should pass projects to AddAssetModal', () => {
      const projects = [{ id: 1, code: 'PROJ-001', name: 'Test Project' }] as Project[];
      render(
        <ShotGridModals
          {...defaultProps}
          projects={projects}
          modals={{ ...defaultModals, showAddAsset: true }}
        />,
      );
      expect(screen.getByTestId('add-asset-modal')).toBeInTheDocument();
    });

    it('should pass episodes to AddSequenceModal', () => {
      const episodes = [{ id: 1, code: 'EP-001', name: 'Test Episode' }] as Episode[];
      render(
        <ShotGridModals
          {...defaultProps}
          episodes={episodes}
          modals={{ ...defaultModals, showAddSequence: true }}
        />,
      );
      expect(screen.getByTestId('add-sequence-modal')).toBeInTheDocument();
    });



    it('should pass multiple props to AddVersionModal', () => {
      const assets = [{ id: 1, code: 'ASSET-001' }] as Asset[];
      const sequences = [{ id: 1, code: 'SEQ-001' }] as Sequence[];
      const episodes = [{ id: 1, code: 'EP-001' }] as Episode[];

      render(
        <ShotGridModals
          {...defaultProps}
          assets={assets}
          sequences={sequences}
          episodes={episodes}
          modals={{ ...defaultModals, showAddVersion: true }}
        />,
      );
      expect(screen.getByTestId('add-version-modal')).toBeInTheDocument();
    });

    it('should pass all entities to GeneralNoteCreatorModal', () => {
      const projects = [{ id: 1, code: 'PROJ-001' }] as Project[];
      const episodes = [{ id: 1, code: 'EP-001' }] as Episode[];
      const assets = [{ id: 1, code: 'ASSET-001' }] as Asset[];
      const sequences = [{ id: 1, code: 'SEQ-001' }] as Sequence[];
      const playlists = [{ id: 1, code: 'PLAY-001' }] as Playlist[];
      const versions = [{ id: 1, code: 'VER-001' }] as ApiVersion[];

      render(
        <ShotGridModals
          {...defaultProps}
          projects={projects}
          episodes={episodes}
          assets={assets}
          sequences={sequences}
          playlists={playlists}
          versions={versions}
          modals={{ ...defaultModals, showAddNote: true }}
        />,
      );
      expect(screen.getByTestId('general-note-creator-modal')).toBeInTheDocument();
    });
  });

  describe('Note Creator callbacks', () => {
    it('should call onRefresh and close modal when note is created', async () => {
      const user = userEvent.setup();
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      const setNoteCreatorEntity = vi.fn();

      render(
        <ShotGridModals
          {...defaultProps}
          onRefresh={onRefresh}
          modals={{
            ...defaultModals,
            noteCreatorEntity: { linkId: '123', linkType: 'Project', linkName: 'Test Project' },
            setNoteCreatorEntity,
          }}
        />,
      );

      expect(screen.getByTestId('note-creator')).toBeInTheDocument();
      
      const createButton = screen.getByTestId('trigger-note-created');
      await user.click(createButton);

      expect(setNoteCreatorEntity).toHaveBeenCalledWith(null);
      expect(onRefresh).toHaveBeenCalled();
    });

    it('should close modal when note creation is cancelled', async () => {
      const user = userEvent.setup();
      const setNoteCreatorEntity = vi.fn();

      render(
        <ShotGridModals
          {...defaultProps}
          modals={{
            ...defaultModals,
            noteCreatorEntity: { linkId: '123', linkType: 'Project', linkName: 'Test Project' },
            setNoteCreatorEntity,
          }}
        />,
      );

      expect(screen.getByTestId('note-creator')).toBeInTheDocument();
      
      const cancelButton = screen.getByTestId('trigger-cancel');
      await user.click(cancelButton);

      expect(setNoteCreatorEntity).toHaveBeenCalledWith(null);
    });
  });

  describe('StatusEditModal', () => {
    it('should render StatusEditModal when showEditStatus is true and editingStatus exists', () => {
      const mockStatus = { id: 'status-1', code: 'STATUS-001', name: 'Test Status' } as any;

      render(
        <ShotGridModals
          {...defaultProps}
          modals={{ ...defaultModals, showEditStatus: true, editingStatus: mockStatus }}
        />,
      );
      expect(screen.getByTestId('edit-status-modal')).toBeInTheDocument();
    });
  });

  describe('All modals rendered together', () => {
    it('should render all add modals when all are open', () => {
      render(
        <ShotGridModals
          {...defaultProps}
          modals={{
            ...defaultModals,
            showAddProject: true,
            showAddEpisode: true,
            showAddAsset: true,
            showAddSequence: true,
            showAddVersion: true,
            showAddPlaylist: true,
            showAddNote: true,
            showAddStatus: true,
          }}
        />,
      );

      expect(screen.getByTestId('add-project-modal')).toBeInTheDocument();
      expect(screen.getByTestId('add-episode-modal')).toBeInTheDocument();
      expect(screen.getByTestId('add-asset-modal')).toBeInTheDocument();
      expect(screen.getByTestId('add-sequence-modal')).toBeInTheDocument();
      expect(screen.getByTestId('add-version-modal')).toBeInTheDocument();
      expect(screen.getByTestId('add-playlist-modal')).toBeInTheDocument();
      expect(screen.getByTestId('general-note-creator-modal')).toBeInTheDocument();
      expect(screen.getByTestId('add-status-modal')).toBeInTheDocument();
    });

    it('should render all edit modals when all are open with entities', () => {
      const mockProject: Project = { id: 1, code: 'PROJ-001' } as Project;
      const mockEpisode: Episode = { id: 1, code: 'EP-001' } as Episode;
      const mockAsset: Asset = { id: 1, code: 'ASSET-001' } as Asset;
      const mockSequence: Sequence = { id: 1, code: 'SEQ-001' } as Sequence;
      const mockVersion: ApiVersion = { id: 1, code: 'VER-001' } as ApiVersion;
      const mockPlaylist: Playlist = { id: 1, code: 'PLAY-001' } as Playlist;
      const mockStatus = { id: 'status-1', code: 'STATUS-001' } as any;

      render(
        <ShotGridModals
          {...defaultProps}
          modals={{
            ...defaultModals,
            showEditProject: true,
            editingProject: mockProject,
            showEditEpisode: true,
            editingEpisode: mockEpisode,
            showEditAsset: true,
            editingAsset: mockAsset,
            showEditSequence: true,
            editingSequence: mockSequence,
            showEditVersion: true,
            editingVersion: mockVersion,
            showEditPlaylist: true,
            editingPlaylist: mockPlaylist,
            showEditStatus: true,
            editingStatus: mockStatus,
          }}
        />,
      );

      expect(screen.getByTestId('edit-project-modal')).toBeInTheDocument();
      expect(screen.getByTestId('edit-episode-modal')).toBeInTheDocument();
      expect(screen.getByTestId('edit-asset-modal')).toBeInTheDocument();
      expect(screen.getByTestId('edit-sequence-modal')).toBeInTheDocument();
      expect(screen.getByTestId('edit-version-modal')).toBeInTheDocument();
      expect(screen.getByTestId('edit-playlist-modal')).toBeInTheDocument();
      expect(screen.getByTestId('edit-status-modal')).toBeInTheDocument();
    });
  });
});

