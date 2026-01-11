import type { TabType } from '@shogunito/shared';

interface ModalActions {
  openAddModal: (
    type:
      | 'project'
      | 'episode'
      | 'asset'
      | 'sequence'
      | 'version'
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
      versions: 'version',
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
