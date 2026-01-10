import type { Asset } from '@shogun/shared';
import { apiService } from '@shared/api/client';
import {
  useOptimisticCreate,
  useOptimisticUpdate,
  useOptimisticDelete,
} from '@shared/hooks/useOptimisticMutation';

/**
 * Optimistic create asset hook
 */
export function useCreateAssetOptimistic() {
  return useOptimisticCreate<Asset, Partial<Asset>>({
    mutationFn: (assetData) => apiService.createAsset(assetData),
    queryKey: ['assets'],
    successMessage: 'Asset created successfully',
    errorMessage: 'Failed to create asset',
  });
}

/**
 * Optimistic update asset hook
 *
 * Note: Assets use 'code' instead of 'id' but we map it for compatibility
 */
export function useUpdateAssetOptimistic() {
  return useOptimisticUpdate<Asset, { id: number; data: Partial<Asset> }>({
    mutationFn: ({ id, data }) => apiService.updateAsset(id, data),
    queryKey: ['assets'],
    getId: (vars) => String(vars.id),
    successMessage: (data) => `Asset "${data.code}" updated successfully`,
    errorMessage: 'Failed to update asset',
  });
}

/**
 * Optimistic delete asset hook
 */
export function useDeleteAssetOptimistic() {
  return useOptimisticDelete<Asset>({
    mutationFn: (id) => apiService.deleteAsset(id),
    queryKey: ['assets'],
    successMessage: 'Asset deleted successfully',
    errorMessage: 'Failed to delete asset',
  });
}
