import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Sequence } from '@shogun/shared';
import { apiService } from '@shared/api/client';

export function useSequences() {
  return useQuery<Sequence[], Error>({
    queryKey: ['sequences'],
    queryFn: () => apiService.getSequences(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sequence: Partial<Sequence>) => apiService.createSequence(sequence),
    onSuccess: async () => {
      // Invalidate all sequence-related queries to force a complete refresh
      // This ensures the new sequence appears even if filters are active
      await queryClient.invalidateQueries({
        queryKey: ['sequences'],
      });
      // Also refetch to ensure immediate update
      await queryClient.refetchQueries({
        queryKey: ['sequences'],
        type: 'active',
      });
    },
  });
}

export function useUpdateSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Sequence> }) =>
      apiService.updateSequence(id, data),
    onSuccess: async () => {
      // Invalidate all sequence-related queries to force a complete refresh
      await queryClient.invalidateQueries({
        queryKey: ['sequences'],
      });
      await queryClient.refetchQueries({
        queryKey: ['sequences'],
        type: 'active',
      });
    },
  });
}

export function useDeleteSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiService.deleteSequence(id),
    onSuccess: async () => {
      // Invalidate all sequence-related queries to force a complete refresh
      await queryClient.invalidateQueries({
        queryKey: ['sequences'],
      });
      await queryClient.refetchQueries({
        queryKey: ['sequences'],
        type: 'active',
      });
    },
  });
}
