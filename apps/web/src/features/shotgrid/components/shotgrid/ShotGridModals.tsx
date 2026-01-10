import React from 'react';
import {
  AddProjectModal,
  AddEpisodeModal,
  AddAssetModal,
  AddSequenceModal,
  AddShotModal,
  AddVersionModal,
  AddPlaylistModal,
  AddStatusModal,
  ProjectEditModal,
  EpisodeEditModal,
  AssetEditModal,
  SequenceEditModal,
  ShotEditModal,
  VersionEditModal,
  PlaylistEditModal,
  StatusEditModal,
  NotesViewerModal,
} from '@shared/components/modals';
import { GeneralNoteCreatorModal } from '@shared/components/modals/GeneralNoteCreatorModal';
import { NoteCreator } from '@shared/components/shared/NoteCreator';
import type { Project, Episode, Asset, Sequence, Shot, Status } from '@shogun/shared';
import type { ApiVersion, Playlist } from '@shared/api/client';

interface ShotGridModalsProps {
  modals: {
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
    noteCreatorEntity: {
      linkId: string;
      linkType: string;
      linkName: string;
    } | null;
    viewingNotesFor: {
      linkId: string;
      linkType: string;
      linkName: string;
    } | null;

    // Actions
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
    closeEditModal: (
      type:
        | 'project'
        | 'episode'
        | 'asset'
        | 'sequence'
        | 'shot'
        | 'version'
        | 'playlist'
        | 'status',
    ) => void;
    setNoteCreatorEntity: (
      entity: { linkId: string; linkType: string; linkName: string } | null,
    ) => void;
    setViewingNotesFor: (
      entity: { linkId: string; linkType: string; linkName: string } | null,
    ) => void;
  };
  onRefresh: () => Promise<void>;
  projects: Project[];
  episodes: Episode[];
  assets: Asset[];
  sequences: Sequence[];
  shots: Shot[];
  versions: ApiVersion[];
  playlists: Playlist[];
}

/**
 * Component for rendering all modals in ShotGrid
 */
export const ShotGridModals: React.FC<ShotGridModalsProps> = ({
  modals,
  onRefresh,
  projects,
  episodes,
  assets,
  sequences,
  shots,
  versions,
  playlists,
}) => {
  return (
    <>
      <AddProjectModal
        isOpen={modals.showAddProject}
        onClose={() => modals.closeAddModal('project')}
        onSuccess={onRefresh}
      />

      <ProjectEditModal
        project={modals.editingProject}
        isOpen={modals.showEditProject && modals.editingProject !== null}
        onClose={() => modals.closeEditModal('project')}
        onSuccess={onRefresh}
      />

      <EpisodeEditModal
        episode={modals.editingEpisode}
        isOpen={modals.showEditEpisode && modals.editingEpisode !== null}
        onClose={() => modals.closeEditModal('episode')}
        onSuccess={onRefresh}
      />

      <AssetEditModal
        asset={modals.editingAsset}
        isOpen={modals.showEditAsset && modals.editingAsset !== null}
        onClose={() => modals.closeEditModal('asset')}
        onSuccess={onRefresh}
      />

      <SequenceEditModal
        sequence={modals.editingSequence}
        isOpen={modals.showEditSequence && modals.editingSequence !== null}
        onClose={() => modals.closeEditModal('sequence')}
        onSuccess={onRefresh}
      />

      <ShotEditModal
        shot={modals.editingShot}
        isOpen={modals.showEditShot && modals.editingShot !== null}
        onClose={() => modals.closeEditModal('shot')}
        onSuccess={onRefresh}
      />

      <VersionEditModal
        version={modals.editingVersion}
        isOpen={modals.showEditVersion && modals.editingVersion !== null}
        onClose={() => modals.closeEditModal('version')}
        onSuccess={onRefresh}
      />

      <PlaylistEditModal
        playlist={modals.editingPlaylist}
        isOpen={modals.showEditPlaylist && modals.editingPlaylist !== null}
        onClose={() => modals.closeEditModal('playlist')}
        onSuccess={onRefresh}
      />

      <NotesViewerModal
        isOpen={modals.showNotesViewer && modals.viewingNotesFor !== null}
        onClose={() => modals.setViewingNotesFor(null)}
        linkId={modals.viewingNotesFor?.linkId || ''}
        linkType={
          (modals.viewingNotesFor?.linkType || 'Project') as
            | 'Project'
            | 'Episode'
            | 'Asset'
            | 'Sequence'
            | 'Shot'
            | 'Playlist'
            | 'Version'
        }
        linkName={modals.viewingNotesFor?.linkName || ''}
        onRefresh={onRefresh}
      />

      <AddEpisodeModal
        isOpen={modals.showAddEpisode}
        onClose={() => modals.closeAddModal('episode')}
        onSuccess={onRefresh}
        projects={projects}
      />

      <AddAssetModal
        isOpen={modals.showAddAsset}
        onClose={() => modals.closeAddModal('asset')}
        onSuccess={onRefresh}
        projects={projects}
      />

      <AddSequenceModal
        isOpen={modals.showAddSequence}
        onClose={() => modals.closeAddModal('sequence')}
        onSuccess={onRefresh}
        episodes={episodes}
      />

      <AddShotModal
        isOpen={modals.showAddShot}
        onClose={() => modals.closeAddModal('shot')}
        onSuccess={onRefresh}
        sequences={sequences}
      />

      <AddPlaylistModal
        isOpen={modals.showAddPlaylist}
        onClose={() => modals.closeAddModal('playlist')}
        onSuccess={onRefresh}
      />

      <AddVersionModal
        isOpen={modals.showAddVersion}
        onClose={() => modals.closeAddModal('version')}
        onSuccess={onRefresh}
        shots={shots}
        assets={assets}
        sequences={sequences}
        episodes={episodes}
      />

      <GeneralNoteCreatorModal
        isOpen={modals.showAddNote}
        onClose={() => modals.closeAddModal('note')}
        projects={projects}
        episodes={episodes}
        assets={assets}
        sequences={sequences}
        shots={shots}
        playlists={playlists}
        versions={versions}
      />

      <AddStatusModal
        isOpen={modals.showAddStatus}
        onClose={() => modals.closeAddModal('status')}
        onSuccess={onRefresh}
      />

      <StatusEditModal
        status={modals.editingStatus}
        isOpen={modals.showEditStatus && modals.editingStatus !== null}
        onClose={() => modals.closeEditModal('status')}
        onSuccess={onRefresh}
      />

      {/* Direct Note Creator Modal */}
      {modals.noteCreatorEntity && (
        <div
          className="modal fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="note-creator-modal-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => {
              modals.setNoteCreatorEntity(null);
            }}
          />

          {/* Modal */}
          <div
            className="relative w-full max-w-2xl max-h-[80vh] rounded-lg shadow-xl flex flex-col overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              <h2
                id="note-creator-modal-title"
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Add Note to {modals.noteCreatorEntity.linkType}
              </h2>
              <button
                onClick={() => {
                  modals.setNoteCreatorEntity(null);
                }}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                style={{ color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <NoteCreator
                linkId={modals.noteCreatorEntity.linkId}
                linkType={
                  modals.noteCreatorEntity.linkType as
                    | 'Project'
                    | 'Episode'
                    | 'Asset'
                    | 'Sequence'
                    | 'Shot'
                    | 'Playlist'
                    | 'Version'
                }
                linkName={modals.noteCreatorEntity.linkName}
                onNoteCreated={() => {
                  modals.setNoteCreatorEntity(null);
                  onRefresh();
                }}
                onCancel={() => {
                  modals.setNoteCreatorEntity(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
