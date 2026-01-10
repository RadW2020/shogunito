import type { Shot } from '@shogun/shared';
import { apiService } from '@shared/api/client';
import {
  useOptimisticCreate,
  useOptimisticUpdate,
  useOptimisticDelete,
} from '@shared/hooks/useOptimisticMutation';

/**
 * Optimistic create shot hook
 */
export function useCreateShotOptimistic() {
  return useOptimisticCreate<Shot, Partial<Shot>>({
    mutationFn: (shotData) => apiService.createShot(shotData),
    queryKey: ['shots'],
    successMessage: 'Shot created successfully',
    errorMessage: 'Failed to create shot',
  });
}

/**
 * Optimistic update shot hook
 */
export function useUpdateShotOptimistic() {
  return useOptimisticUpdate<Shot, { id: number; data: Partial<Shot> }>({
    mutationFn: ({ id, data }) => apiService.updateShot(id, data),
    queryKey: ['shots'],
    getId: (vars) => String(vars.id),
    successMessage: (data) => `Shot "${data.code}" updated successfully`,
    errorMessage: 'Failed to update shot',
  });
}

/**
 * Optimistic delete shot hook
 */
export function useDeleteShotOptimistic() {
  return useOptimisticDelete<Shot>({
    mutationFn: (id: number) => apiService.deleteShot(id),
    queryKey: ['shots'],
    successMessage: 'Shot deleted successfully',
    errorMessage: 'Failed to delete shot',
  });
}

/**
 * Optimistic update shot status
 */
export function useUpdateShotStatus() {
  return useOptimisticUpdate<Shot, { id: number; status: string }>({
    mutationFn: ({ id, status }) => apiService.updateShot(id, { status: { name: status } as any }),
    queryKey: ['shots'],
    getId: (vars) => String(vars.id),
    successMessage: (_data, vars) => `Status changed to "${vars.status}"`,
    errorMessage: 'Failed to update status',
  });
}
