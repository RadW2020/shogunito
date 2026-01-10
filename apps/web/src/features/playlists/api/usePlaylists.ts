import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Playlist } from '@shared/api/client';
import { apiService } from '@shared/api/client';

export function usePlaylists() {
  return useQuery<Playlist[], Error>({
    queryKey: ['playlists'],
    queryFn: () => apiService.getPlaylists(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playlist: Partial<Playlist>) => apiService.createPlaylist(playlist),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

export function useUpdatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Playlist> }) =>
      apiService.updatePlaylist(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

export function useDeletePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiService.deletePlaylist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

export interface CreatePlaylistFromVersionsData {
  code: string;
  name: string;
  description?: string;
  projectId: number;
  versionCodes: string[];
  status?: string;
  createdBy?: number;
  assignedTo?: number;
}

export function useCreatePlaylistFromVersions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePlaylistFromVersionsData) =>
      apiService.createPlaylistFromVersions(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

export function useReorderPlaylistVersions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, versionCodes }: { playlistId: number; versionCodes: string[] }) =>
      apiService.reorderPlaylistVersions(playlistId, versionCodes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}
