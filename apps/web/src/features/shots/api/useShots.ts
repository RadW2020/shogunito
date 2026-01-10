import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Shot } from '@shogun/shared';
import { apiService } from '@shared/api/client';

export function useShots() {
  return useQuery<Shot[], Error>({
    queryKey: ['shots'],
    queryFn: () => apiService.getShots(),
    staleTime: 0, // Always refetch when invalidated to ensure fresh data
    refetchOnWindowFocus: false,
  });
}

export function useCreateShot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shot: Partial<Shot>) => apiService.createShot(shot),
    onSuccess: async (newShot) => {
      // Optimistically update the cache with the new shot
      queryClient.setQueryData<Shot[]>(['shots'], (oldShots = []) => {
        // Check if shot already exists (avoid duplicates)
        const exists = oldShots.some((s) => s.id === newShot.id);
        if (exists) {
          return oldShots;
        }
        return [...oldShots, newShot];
      });

      // Refetch to ensure we have the latest data and wait for it to complete
      await queryClient.refetchQueries({
        queryKey: ['shots'],
        type: 'active',
      });
    },
    onError: (error) => {
      console.error('Failed to create shot:', error);
      // On error, refetch to get correct state
      queryClient.invalidateQueries({ queryKey: ['shots'] });
    },
  });
}

export function useUpdateShot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Shot> }) =>
      apiService.updateShot(id, data),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['shots'],
        type: 'active',
      });
    },
  });
}

export function useDeleteShot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiService.deleteShot(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['shots'],
        type: 'active',
      });
    },
  });
}
