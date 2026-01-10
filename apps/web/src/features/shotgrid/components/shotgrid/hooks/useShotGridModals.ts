import { useState } from 'react';
import type { Project, Episode, Asset, Sequence, Shot, Status } from '@shogun/shared';
import type { ApiVersion, Playlist } from '@shared/api/client';

interface NoteCreatorEntity {
  linkId: string;
  linkType: string;
  linkName: string;
}

interface UseShotGridModalsReturn {
  // Add modals
  showAddProject: boolean;
  showAddEpisode: boolean;
  showAddAsset: boolean;
  showAddSequence: boolean;
  showAddShot: boolean;
  showAddPlaylist: boolean;
  showAddVersion: boolean;
  showAddNote: boolean;
  showAddStatus: boolean;

  // Edit modals
  showEditProject: boolean;
  showEditEpisode: boolean;
  showEditAsset: boolean;
  showEditSequence: boolean;
  showEditShot: boolean;
  showEditVersion: boolean;
  showEditPlaylist: boolean;
  showEditStatus: boolean;

  // Other modals
  showNotesViewer: boolean;

  // Editing entities
  editingProject: Project | null;
  editingEpisode: Episode | null;
  editingAsset: Asset | null;
  editingSequence: Sequence | null;
  editingShot: Shot | null;
  editingVersion: ApiVersion | null;
  editingPlaylist: Playlist | null;
  editingStatus: Status | null;

  // Note creator
  noteCreatorEntity: NoteCreatorEntity | null;
  viewingNotesFor: {
    linkId: string;
    linkType: string;
    linkName: string;
  } | null;

  // Actions
  openAddModal: (
    type:
      | 'project'
      | 'episode'
      | 'asset'
      | 'sequence'
      | 'shot'
      | 'version'
      | 'playlist'
      | 'note'
      | 'status',
  ) => void;
  closeAddModal: (
    type:
      | 'project'
      | 'episode'
      | 'asset'
      | 'sequence'
      | 'shot'
      | 'version'
      | 'playlist'
      | 'note'
      | 'status',
  ) => void;
  openEditModal: (
    type: 'project' | 'episode' | 'asset' | 'sequence' | 'shot' | 'version' | 'playlist' | 'status',
    entity: any,
  ) => void;
  closeEditModal: (
    type: 'project' | 'episode' | 'asset' | 'sequence' | 'shot' | 'version' | 'playlist' | 'status',
  ) => void;
  setNoteCreatorEntity: (entity: NoteCreatorEntity | null) => void;
  setViewingNotesFor: (
    entity: { linkId: string; linkType: string; linkName: string } | null,
  ) => void;
}

/**
 * Hook to manage all modal states for ShotGrid component
 * Consolidates all modal open/close logic
 */
export function useShotGridModals(): UseShotGridModalsReturn {
  // Add modals
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddEpisode, setShowAddEpisode] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddSequence, setShowAddSequence] = useState(false);
  const [showAddShot, setShowAddShot] = useState(false);
  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [showAddVersion, setShowAddVersion] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddStatus, setShowAddStatus] = useState(false);

  // Edit modals
  const [showEditProject, setShowEditProject] = useState(false);
  const [showEditEpisode, setShowEditEpisode] = useState(false);
  const [showEditAsset, setShowEditAsset] = useState(false);
  const [showEditSequence, setShowEditSequence] = useState(false);
  const [showEditShot, setShowEditShot] = useState(false);
  const [showEditVersion, setShowEditVersion] = useState(false);
  const [showEditPlaylist, setShowEditPlaylist] = useState(false);
  const [showEditStatus, setShowEditStatus] = useState(false);

  // Other modals
  const [showNotesViewer, setShowNotesViewer] = useState(false);

  // Editing entities
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingSequence, setEditingSequence] = useState<Sequence | null>(null);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [editingVersion, setEditingVersion] = useState<ApiVersion | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);

  // Note creator
  const [noteCreatorEntity, setNoteCreatorEntity] = useState<NoteCreatorEntity | null>(null);
  const [viewingNotesFor, setViewingNotesFor] = useState<{
    linkId: string;
    linkType: string;
    linkName: string;
  } | null>(null);

  const openAddModal = (
    type:
      | 'project'
      | 'episode'
      | 'asset'
      | 'sequence'
      | 'shot'
      | 'version'
      | 'playlist'
      | 'note'
      | 'status',
  ) => {
    switch (type) {
      case 'project':
        setShowAddProject(true);
        break;
      case 'episode':
        setShowAddEpisode(true);
        break;
      case 'asset':
        setShowAddAsset(true);
        break;
      case 'sequence':
        setShowAddSequence(true);
        break;
      case 'shot':
        setShowAddShot(true);
        break;
      case 'version':
        setShowAddVersion(true);
        break;
      case 'playlist':
        setShowAddPlaylist(true);
        break;
      case 'note':
        setShowAddNote(true);
        break;
      case 'status':
        setShowAddStatus(true);
        break;
    }
  };

  const closeAddModal = (
    type:
      | 'project'
      | 'episode'
      | 'asset'
      | 'sequence'
      | 'shot'
      | 'version'
      | 'playlist'
      | 'note'
      | 'status',
  ) => {
    switch (type) {
      case 'project':
        setShowAddProject(false);
        break;
      case 'episode':
        setShowAddEpisode(false);
        break;
      case 'asset':
        setShowAddAsset(false);
        break;
      case 'sequence':
        setShowAddSequence(false);
        break;
      case 'shot':
        setShowAddShot(false);
        break;
      case 'version':
        setShowAddVersion(false);
        break;
      case 'playlist':
        setShowAddPlaylist(false);
        break;
      case 'note':
        setShowAddNote(false);
        break;
      case 'status':
        setShowAddStatus(false);
        break;
    }
  };

  const openEditModal = (
    type: 'project' | 'episode' | 'asset' | 'sequence' | 'shot' | 'version' | 'playlist' | 'status',
    entity: any,
  ) => {
    switch (type) {
      case 'project':
        setEditingProject(entity);
        setShowEditProject(true);
        break;
      case 'episode':
        setEditingEpisode(entity);
        setShowEditEpisode(true);
        break;
      case 'asset':
        setEditingAsset(entity);
        setShowEditAsset(true);
        break;
      case 'sequence':
        setEditingSequence(entity);
        setShowEditSequence(true);
        break;
      case 'shot':
        setEditingShot(entity);
        setShowEditShot(true);
        break;
      case 'version':
        setEditingVersion(entity);
        setShowEditVersion(true);
        break;
      case 'playlist':
        setEditingPlaylist(entity);
        setShowEditPlaylist(true);
        break;
      case 'status':
        setEditingStatus(entity);
        setShowEditStatus(true);
        break;
    }
  };

  const closeEditModal = (
    type: 'project' | 'episode' | 'asset' | 'sequence' | 'shot' | 'version' | 'playlist' | 'status',
  ) => {
    switch (type) {
      case 'project':
        setShowEditProject(false);
        setEditingProject(null);
        break;
      case 'episode':
        setShowEditEpisode(false);
        setEditingEpisode(null);
        break;
      case 'asset':
        setShowEditAsset(false);
        setEditingAsset(null);
        break;
      case 'sequence':
        setShowEditSequence(false);
        setEditingSequence(null);
        break;
      case 'shot':
        setShowEditShot(false);
        setEditingShot(null);
        break;
      case 'version':
        setShowEditVersion(false);
        setEditingVersion(null);
        break;
      case 'playlist':
        setShowEditPlaylist(false);
        setEditingPlaylist(null);
        break;
      case 'status':
        setShowEditStatus(false);
        setEditingStatus(null);
        break;
    }
  };

  return {
    // Add modals
    showAddProject,
    showAddEpisode,
    showAddAsset,
    showAddSequence,
    showAddShot,
    showAddPlaylist,
    showAddVersion,
    showAddNote,
    showAddStatus,

    // Edit modals
    showEditProject,
    showEditEpisode,
    showEditAsset,
    showEditSequence,
    showEditShot,
    showEditVersion,
    showEditPlaylist,
    showEditStatus,

    // Other modals
    showNotesViewer,

    // Editing entities
    editingProject,
    editingEpisode,
    editingAsset,
    editingSequence,
    editingShot,
    editingVersion,
    editingPlaylist,
    editingStatus,

    // Note creator
    noteCreatorEntity,
    viewingNotesFor,

    // Actions
    openAddModal,
    closeAddModal,
    openEditModal,
    closeEditModal,
    setNoteCreatorEntity,
    setViewingNotesFor: (entity) => {
      setViewingNotesFor(entity);
      setShowNotesViewer(entity !== null);
    },
  };
}
