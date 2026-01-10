import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, type ApiVersion } from '@shared/api/client';

export function useVersions(shotId?: number) {
  return useQuery<ApiVersion[], Error>({
    queryKey: shotId ? ['versions', { shotId }] : ['versions'],
    queryFn: () => apiService.getVersions(shotId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useVersion(id: number) {
  return useQuery<ApiVersion, Error>({
    queryKey: ['versions', id],
    queryFn: () => apiService.getVersion(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (version: Partial<ApiVersion>) => apiService.createVersion(version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
    },
  });
}

export function useUpdateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ApiVersion> }) =>
      apiService.updateVersion(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
      queryClient.invalidateQueries({ queryKey: ['versions', id] });
    },
  });
}

export function useDeleteVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiService.deleteVersion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
    },
  });
}

export function useUploadThumbnail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, file }: { versionId: number; file: File }) =>
      apiService.uploadThumbnail(versionId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
    },
  });
}

export function useUploadVersionFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, file }: { versionId: number; file: File }) =>
      apiService.uploadVersionFile(versionId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
    },
  });
}
