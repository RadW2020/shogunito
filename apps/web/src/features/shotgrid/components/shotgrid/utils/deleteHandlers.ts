import type { TabType } from '@shogunito/shared';
import { apiService } from '@shared/api/client';
import { useQueryClient } from '@tanstack/react-query';

interface DeleteHandlerParams {
  activeTab: TabType;
  selectedItems: Set<string>;
  queryClient: ReturnType<typeof useQueryClient>;
  deleteSequenceMutation?: { mutateAsync: (id: number) => Promise<any> };
  onSuccess: () => Promise<void>;
  onClearSelection: () => void;
}

/**
 * Factory function to create delete handlers for different entity types
 */
export async function handleDeleteSelected({
  activeTab,
  selectedItems,
  queryClient,
  deleteSequenceMutation,
  onSuccess,
  onClearSelection,
}: DeleteHandlerParams): Promise<void> {
  if (selectedItems.size === 0) return;

  const ids = Array.from(selectedItems);
  const confirmMsg = `Delete ${ids.length} item(s) from ${activeTab}? This cannot be undone.`;

  if (typeof window !== 'undefined' && !window.confirm(confirmMsg)) {
    return;
  }

  try {
    // Handle deletion based on active tab
    switch (activeTab) {
      case 'projects':
        for (const id of ids) {
          await apiService.deleteProject(Number(id));
        }
        break;

      case 'episodes':
        for (const id of ids) {
          await apiService.deleteEpisode(Number(id));
        }
        break;

      case 'assets':
        for (const id of ids) {
          await apiService.deleteAsset(Number(id));
        }
        await queryClient.refetchQueries({ queryKey: ['assets'], type: 'all' });
        break;

      case 'sequences':
        if (!deleteSequenceMutation) {
          throw new Error('deleteSequenceMutation is required for sequences');
        }
        for (const id of ids) {
          await deleteSequenceMutation.mutateAsync(Number(id));
        }

        // Invalidate sequences query
        await queryClient.invalidateQueries({ queryKey: ['sequences'] });

        // Refetch sequences after invalidation
        await queryClient.refetchQueries({
          queryKey: ['sequences'],
          type: 'active',
        });
        break;


      case 'versions':
        for (const id of ids) {
          await apiService.deleteVersion(Number(id));
        }
        break;


      default:
        console.log(`Delete functionality for ${activeTab} not implemented yet`);
        return;
    }

    // Refresh data after deletion
    await onSuccess();
    onClearSelection();
  } catch (e) {
    console.error('Error deleting selected items:', e);
    alert('Error deleting items. See console for details.');
  }
}
