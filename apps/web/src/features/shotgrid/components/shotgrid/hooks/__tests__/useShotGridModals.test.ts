import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShotGridModals } from '../useShotGridModals';
import type { Project, Episode, Asset, Sequence, Shot, Status } from '@shogun/shared';
import type { ApiVersion, Playlist } from '@shared/api/client';

describe('useShotGridModals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize all modals as closed', () => {
      const { result } = renderHook(() => useShotGridModals());

      expect(result.current.showAddProject).toBe(false);
      expect(result.current.showAddEpisode).toBe(false);
      expect(result.current.showAddAsset).toBe(false);
      expect(result.current.showAddSequence).toBe(false);
      expect(result.current.showAddShot).toBe(false);
      expect(result.current.showAddPlaylist).toBe(false);
      expect(result.current.showAddVersion).toBe(false);
      expect(result.current.showAddNote).toBe(false);
      expect(result.current.showAddStatus).toBe(false);

      expect(result.current.showEditProject).toBe(false);
      expect(result.current.showEditEpisode).toBe(false);
      expect(result.current.showEditAsset).toBe(false);
      expect(result.current.showEditSequence).toBe(false);
      expect(result.current.showEditShot).toBe(false);
      expect(result.current.showEditVersion).toBe(false);
      expect(result.current.showEditPlaylist).toBe(false);
      expect(result.current.showEditStatus).toBe(false);

      expect(result.current.showNotesViewer).toBe(false);
      expect(result.current.editingProject).toBeNull();
      expect(result.current.noteCreatorEntity).toBeNull();
      expect(result.current.viewingNotesFor).toBeNull();
    });
  });

  describe('openAddModal', () => {
    it('should open project add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('project');
      });

      expect(result.current.showAddProject).toBe(true);
    });

    it('should open episode add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('episode');
      });

      expect(result.current.showAddEpisode).toBe(true);
    });

    it('should open asset add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('asset');
      });

      expect(result.current.showAddAsset).toBe(true);
    });

    it('should open sequence add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('sequence');
      });

      expect(result.current.showAddSequence).toBe(true);
    });

    it('should open shot add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('shot');
      });

      expect(result.current.showAddShot).toBe(true);
    });

    it('should open playlist add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('playlist');
      });

      expect(result.current.showAddPlaylist).toBe(true);
    });

    it('should open version add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('version');
      });

      expect(result.current.showAddVersion).toBe(true);
    });

    it('should open note add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('note');
      });

      expect(result.current.showAddNote).toBe(true);
    });

    it('should open status add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('status');
      });

      expect(result.current.showAddStatus).toBe(true);
    });
  });

  describe('closeAddModal', () => {
    it('should close project add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('project');
      });
      expect(result.current.showAddProject).toBe(true);

      act(() => {
        result.current.closeAddModal('project');
      });
      expect(result.current.showAddProject).toBe(false);
    });

    it('should close episode add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('episode');
      });
      expect(result.current.showAddEpisode).toBe(true);

      act(() => {
        result.current.closeAddModal('episode');
      });
      expect(result.current.showAddEpisode).toBe(false);
    });

    it('should close asset add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('asset');
      });
      expect(result.current.showAddAsset).toBe(true);

      act(() => {
        result.current.closeAddModal('asset');
      });
      expect(result.current.showAddAsset).toBe(false);
    });

    it('should close sequence add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('sequence');
      });
      expect(result.current.showAddSequence).toBe(true);

      act(() => {
        result.current.closeAddModal('sequence');
      });
      expect(result.current.showAddSequence).toBe(false);
    });

    it('should close shot add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('shot');
      });
      expect(result.current.showAddShot).toBe(true);

      act(() => {
        result.current.closeAddModal('shot');
      });
      expect(result.current.showAddShot).toBe(false);
    });

    it('should close version add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('version');
      });
      expect(result.current.showAddVersion).toBe(true);

      act(() => {
        result.current.closeAddModal('version');
      });
      expect(result.current.showAddVersion).toBe(false);
    });

    it('should close playlist add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('playlist');
      });
      expect(result.current.showAddPlaylist).toBe(true);

      act(() => {
        result.current.closeAddModal('playlist');
      });
      expect(result.current.showAddPlaylist).toBe(false);
    });

    it('should close note add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('note');
      });
      expect(result.current.showAddNote).toBe(true);

      act(() => {
        result.current.closeAddModal('note');
      });
      expect(result.current.showAddNote).toBe(false);
    });

    it('should close status add modal', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('status');
      });
      expect(result.current.showAddStatus).toBe(true);

      act(() => {
        result.current.closeAddModal('status');
      });
      expect(result.current.showAddStatus).toBe(false);
    });

    it('should close all add modals', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openAddModal('project');
        result.current.openAddModal('episode');
        result.current.openAddModal('asset');
        result.current.openAddModal('sequence');
        result.current.openAddModal('shot');
        result.current.openAddModal('version');
        result.current.openAddModal('playlist');
        result.current.openAddModal('note');
        result.current.openAddModal('status');
      });

      act(() => {
        result.current.closeAddModal('project');
        result.current.closeAddModal('episode');
        result.current.closeAddModal('asset');
        result.current.closeAddModal('sequence');
        result.current.closeAddModal('shot');
        result.current.closeAddModal('version');
        result.current.closeAddModal('playlist');
        result.current.closeAddModal('note');
        result.current.closeAddModal('status');
      });

      expect(result.current.showAddProject).toBe(false);
      expect(result.current.showAddEpisode).toBe(false);
      expect(result.current.showAddAsset).toBe(false);
      expect(result.current.showAddSequence).toBe(false);
      expect(result.current.showAddShot).toBe(false);
      expect(result.current.showAddVersion).toBe(false);
      expect(result.current.showAddPlaylist).toBe(false);
      expect(result.current.showAddNote).toBe(false);
      expect(result.current.showAddStatus).toBe(false);
    });
  });

  describe('openEditModal', () => {
    const mockProject: Project = {
      id: 1,
      code: 'PROJ-001',
      name: 'Test Project',
    } as Project;

    const mockEpisode: Episode = {
      id: 1,
      code: 'EP-001',
      name: 'Test Episode',
    } as Episode;

    const mockAsset: Asset = {
      id: 1,
      code: 'ASSET-001',
      name: 'Test Asset',
    } as Asset;

    const mockSequence: Sequence = {
      id: 1,
      code: 'SEQ-001',
      name: 'Test Sequence',
    } as Sequence;

    const mockShot: Shot = {
      id: 1,
      code: 'SHOT-001',
      name: 'Test Shot',
    } as Shot;

    const mockVersion: ApiVersion = {
      id: 1,
      code: 'VER-001',
    } as ApiVersion;

    const mockPlaylist: Playlist = {
      id: 1,
      code: 'PLAY-001',
      name: 'Test Playlist',
    } as Playlist;

    const mockStatus: Status = {
      id: 'status-1',
      code: 'STATUS-001',
      name: 'Test Status',
    } as Status;

    it('should open project edit modal with entity', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openEditModal('project', mockProject);
      });

      expect(result.current.showEditProject).toBe(true);
      expect(result.current.editingProject).toEqual(mockProject);
    });

    it('should open episode edit modal with entity', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openEditModal('episode', mockEpisode);
      });

      expect(result.current.showEditEpisode).toBe(true);
      expect(result.current.editingEpisode).toEqual(mockEpisode);
    });

    it('should open asset edit modal with entity', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openEditModal('asset', mockAsset);
      });

      expect(result.current.showEditAsset).toBe(true);
      expect(result.current.editingAsset).toEqual(mockAsset);
    });

    it('should open sequence edit modal with entity', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openEditModal('sequence', mockSequence);
      });

      expect(result.current.showEditSequence).toBe(true);
      expect(result.current.editingSequence).toEqual(mockSequence);
    });

    it('should open shot edit modal with entity', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openEditModal('shot', mockShot);
      });

      expect(result.current.showEditShot).toBe(true);
      expect(result.current.editingShot).toEqual(mockShot);
    });

    it('should open version edit modal with entity', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openEditModal('version', mockVersion);
      });

      expect(result.current.showEditVersion).toBe(true);
      expect(result.current.editingVersion).toEqual(mockVersion);
    });

    it('should open playlist edit modal with entity', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openEditModal('playlist', mockPlaylist);
      });

      expect(result.current.showEditPlaylist).toBe(true);
      expect(result.current.editingPlaylist).toEqual(mockPlaylist);
    });

    it('should open status edit modal with entity', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openEditModal('status', mockStatus);
      });

      expect(result.current.showEditStatus).toBe(true);
      expect(result.current.editingStatus).toEqual(mockStatus);
    });
  });

  describe('closeEditModal', () => {
    const mockProject: Project = {
      id: 1,
      code: 'PROJ-001',
      name: 'Test Project',
    } as Project;

    const mockEpisode: Episode = {
      id: 1,
      code: 'EP-001',
      name: 'Test Episode',
    } as Episode;

    const mockAsset: Asset = {
      id: 1,
      code: 'ASSET-001',
      name: 'Test Asset',
    } as Asset;

    const mockSequence: Sequence = {
      id: 1,
      code: 'SEQ-001',
      name: 'Test Sequence',
    } as Sequence;

    const mockShot: Shot = {
      id: 1,
      code: 'SHOT-001',
      name: 'Test Shot',
    } as Shot;

    const mockVersion: ApiVersion = {
      id: 1,
      code: 'VER-001',
    } as ApiVersion;

    const mockPlaylist: Playlist = {
      id: 1,
      code: 'PLAY-001',
      name: 'Test Playlist',
    } as Playlist;

    const mockStatus: Status = {
      id: 'status-1',
      code: 'STATUS-001',
      name: 'Test Status',
    } as Status;

    it('should close project edit modal and clear entity', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openEditModal('project', mockProject);
      });

      act(() => {
        result.current.closeEditModal('project');
      });

      expect(result.current.showEditProject).toBe(false);
      expect(result.current.editingProject).toBeNull();
    });

    it('should close episode edit modal and clear entity', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openEditModal('episode', mockEpisode);
      });

      act(() => {
        result.current.closeEditModal('episode');
      });

      expect(result.current.showEditEpisode).toBe(false);
      expect(result.current.editingEpisode).toBeNull();
    });

    it('should close asset edit modal and clear entity', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openEditModal('asset', mockAsset);
      });

      act(() => {
        result.current.closeEditModal('asset');
      });

      expect(result.current.showEditAsset).toBe(false);
      expect(result.current.editingAsset).toBeNull();
    });

    it('should close sequence edit modal and clear entity', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openEditModal('sequence', mockSequence);
      });

      act(() => {
        result.current.closeEditModal('sequence');
      });

      expect(result.current.showEditSequence).toBe(false);
      expect(result.current.editingSequence).toBeNull();
    });

    it('should close shot edit modal and clear entity', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openEditModal('shot', mockShot);
      });

      act(() => {
        result.current.closeEditModal('shot');
      });

      expect(result.current.showEditShot).toBe(false);
      expect(result.current.editingShot).toBeNull();
    });

    it('should close version edit modal and clear entity', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openEditModal('version', mockVersion);
      });

      act(() => {
        result.current.closeEditModal('version');
      });

      expect(result.current.showEditVersion).toBe(false);
      expect(result.current.editingVersion).toBeNull();
    });

    it('should close playlist edit modal and clear entity', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openEditModal('playlist', mockPlaylist);
      });

      act(() => {
        result.current.closeEditModal('playlist');
      });

      expect(result.current.showEditPlaylist).toBe(false);
      expect(result.current.editingPlaylist).toBeNull();
    });

    it('should close status edit modal and clear entity', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openEditModal('status', mockStatus);
      });

      act(() => {
        result.current.closeEditModal('status');
      });

      expect(result.current.showEditStatus).toBe(false);
      expect(result.current.editingStatus).toBeNull();
    });

    it('should close all edit modals and clear entities', () => {
      const { result } = renderHook(() => useShotGridModals());

      act(() => {
        result.current.openEditModal('project', mockProject);
        result.current.openEditModal('episode', mockEpisode);
        result.current.openEditModal('asset', mockAsset);
        result.current.openEditModal('sequence', mockSequence);
        result.current.openEditModal('shot', mockShot);
        result.current.openEditModal('version', mockVersion);
        result.current.openEditModal('playlist', mockPlaylist);
        result.current.openEditModal('status', mockStatus);
      });

      act(() => {
        result.current.closeEditModal('project');
        result.current.closeEditModal('episode');
        result.current.closeEditModal('asset');
        result.current.closeEditModal('sequence');
        result.current.closeEditModal('shot');
        result.current.closeEditModal('version');
        result.current.closeEditModal('playlist');
        result.current.closeEditModal('status');
      });

      expect(result.current.showEditProject).toBe(false);
      expect(result.current.showEditEpisode).toBe(false);
      expect(result.current.showEditAsset).toBe(false);
      expect(result.current.showEditSequence).toBe(false);
      expect(result.current.showEditShot).toBe(false);
      expect(result.current.showEditVersion).toBe(false);
      expect(result.current.showEditPlaylist).toBe(false);
      expect(result.current.showEditStatus).toBe(false);
      expect(result.current.editingProject).toBeNull();
      expect(result.current.editingEpisode).toBeNull();
      expect(result.current.editingAsset).toBeNull();
      expect(result.current.editingSequence).toBeNull();
      expect(result.current.editingShot).toBeNull();
      expect(result.current.editingVersion).toBeNull();
      expect(result.current.editingPlaylist).toBeNull();
      expect(result.current.editingStatus).toBeNull();
    });
  });

  describe('setNoteCreatorEntity', () => {
    it('should set note creator entity', () => {
      const { result } = renderHook(() => useShotGridModals());

      const entity = {
        linkId: '123',
        linkType: 'Project',
        linkName: 'Test Project',
      };

      act(() => {
        result.current.setNoteCreatorEntity(entity);
      });

      expect(result.current.noteCreatorEntity).toEqual(entity);
    });

    it('should clear note creator entity when set to null', () => {
      const { result } = renderHook(() => useShotGridModals());

      const entity = {
        linkId: '123',
        linkType: 'Project',
        linkName: 'Test Project',
      };

      act(() => {
        result.current.setNoteCreatorEntity(entity);
      });

      act(() => {
        result.current.setNoteCreatorEntity(null);
      });

      expect(result.current.noteCreatorEntity).toBeNull();
    });
  });

  describe('setViewingNotesFor', () => {
    it('should set viewing notes entity and open notes viewer', () => {
      const { result } = renderHook(() => useShotGridModals());

      const entity = {
        linkId: '123',
        linkType: 'Project',
        linkName: 'Test Project',
      };

      act(() => {
        result.current.setViewingNotesFor(entity);
      });

      expect(result.current.viewingNotesFor).toEqual(entity);
      expect(result.current.showNotesViewer).toBe(true);
    });

    it('should clear viewing notes entity and close notes viewer when set to null', () => {
      const { result } = renderHook(() => useShotGridModals());

      const entity = {
        linkId: '123',
        linkType: 'Project',
        linkName: 'Test Project',
      };

      act(() => {
        result.current.setViewingNotesFor(entity);
      });

      act(() => {
        result.current.setViewingNotesFor(null);
      });

      expect(result.current.viewingNotesFor).toBeNull();
      expect(result.current.showNotesViewer).toBe(false);
    });
  });
});

