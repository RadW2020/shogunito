import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Episode } from '@shogun/shared';
import { apiService } from '@shared/api/client';

export function useEpisodes() {
  return useQuery<Episode[], Error>({
    queryKey: ['episodes'],
    queryFn: () => apiService.getEpisodes(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEpisode(id: number) {
  return useQuery<Episode, Error>({
    queryKey: ['episodes', id],
    queryFn: () => apiService.getEpisode(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (episode: Partial<Episode>) => apiService.createEpisode(episode),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['episodes'],
        type: 'active',
      });
    },
  });
}

export function useUpdateEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Episode> }) =>
      apiService.updateEpisode(id, data),
    onSuccess: async (_, { id }) => {
      await queryClient.refetchQueries({
        queryKey: ['episodes'],
        type: 'active',
      });
      await queryClient.refetchQueries({
        queryKey: ['episodes', id],
        type: 'active',
      });
    },
  });
}

export function useDeleteEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiService.deleteEpisode(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['episodes'],
        type: 'active',
      });
    },
  });
}
