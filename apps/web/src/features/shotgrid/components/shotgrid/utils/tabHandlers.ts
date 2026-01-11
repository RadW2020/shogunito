import type { Project, Episode, Asset, Sequence, Status } from '@shogunito/shared';
import type { ApiVersion } from '@shared/api/client';

interface ModalActions {
  openEditModal: (
    type: 'project' | 'episode' | 'asset' | 'sequence' | 'version' | 'status',
    entity: any,
  ) => void;
  setNoteCreatorEntity: (
    entity: { linkId: string; linkType: string; linkName: string } | null,
  ) => void;
}

/**
 * Factory function to create edit handlers for different entity types
 */
export function createEditHandler<T extends { id?: any }>(
  type: 'project' | 'episode' | 'asset' | 'sequence' | 'version' | 'status',
  modalActions: ModalActions,
) {
  return (entity: T) => {
    modalActions.openEditModal(type, entity);
  };
}

/**
 * Factory function to create "add note" handlers for different entity types
 */
export function createAddNoteHandler<T extends { id?: any; name?: any }>(
  type: 'Project' | 'Episode' | 'Asset' | 'Sequence' | 'Version',
  modalActions: ModalActions,
) {
  return (entity: T) => {
    if (!entity.id) {
      console.error(`${type} missing id:`, entity);
      alert(`Error: ${type} missing required id field`);
      return;
    }
    modalActions.setNoteCreatorEntity({
      linkId: String(entity.id),
      linkType: type,
      linkName: entity.name || `${type} ${entity.id}`,
    });
  };
}

/**
 * Creates all edit handlers for ShotGrid
 */
export function createEditHandlers(modalActions: ModalActions) {
  return {
    handleEditProject: createEditHandler<Project>('project', modalActions),
    handleEditEpisode: createEditHandler<Episode>('episode', modalActions),
    handleEditAsset: createEditHandler<Asset>('asset', modalActions),
    handleEditSequence: createEditHandler<Sequence>('sequence', modalActions),
    handleEditVersion: createEditHandler<ApiVersion>('version', modalActions),
    handleEditStatus: createEditHandler<Status>('status', modalActions),
  };
}

/**
 * Creates all "add note" handlers for ShotGrid
 */
export function createAddNoteHandlers(modalActions: ModalActions) {
  return {
    handleAddNoteToProject: createAddNoteHandler<Project>('Project', modalActions),
    handleAddNoteToEpisode: createAddNoteHandler<Episode>('Episode', modalActions),
    handleAddNoteToAsset: createAddNoteHandler<Asset>('Asset', modalActions),
    handleAddNoteToSequence: createAddNoteHandler<Sequence>('Sequence', modalActions),
    handleAddNoteToVersion: createAddNoteHandler<ApiVersion>('Version', modalActions),
  };
}
