import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Asset } from '@shogun/shared';
import { apiService } from '@shared/api/client';

export function useAssets() {
  return useQuery<Asset[], Error>({
    queryKey: ['assets'],
    queryFn: () => apiService.getAssets(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (asset: Partial<Asset>) => apiService.createAsset(asset),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['assets'],
        type: 'active',
      });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Asset> }) =>
      apiService.updateAsset(id, data),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['assets'],
        type: 'active',
      });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiService.deleteAsset(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['assets'],
        type: 'active',
      });
    },
  });
}

export function useUploadAssetThumbnail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assetId, file }: { assetId: number; file: File }) =>
      apiService.uploadAssetThumbnail(assetId, file),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['assets'],
        type: 'active',
      });
    },
  });
}
