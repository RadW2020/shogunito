import type { TabType } from '@shogun/shared';

interface ModalActions {
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
}

/**
 * Factory function to create "Add" click handler based on active tab
 */
export function createAddClickHandler(activeTab: TabType, modalActions: ModalActions): () => void {
  return () => {
    const tabToModalType: Record<string, string> = {
      projects: 'project',
      episodes: 'episode',
      assets: 'asset',
      sequences: 'sequence',
      shots: 'shot',
      versions: 'version',
      playlists: 'playlist',
      notes: 'note',
      status: 'status',
    };

    const modalType = tabToModalType[activeTab];
    if (modalType) {
      modalActions.openAddModal(modalType as any);
    } else {
      console.log(`Add functionality not implemented for ${activeTab}`);
    }
  };
}
