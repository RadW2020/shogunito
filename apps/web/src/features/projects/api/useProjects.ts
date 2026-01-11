import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Project } from '@shogunito/shared';
import { apiService } from '@shared/api/client';

export function useProjects() {
  return useQuery<Project[], Error>({
    queryKey: ['projects'],
    queryFn: () => apiService.getProjects(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectData: Partial<Project>) => apiService.createProject(projectData),
    onSuccess: async (newProject) => {
      // Optimistically update the cache with the new project
      queryClient.setQueryData<Project[]>(['projects'], (oldProjects = []) => {
        // Check if project already exists (avoid duplicates)
        const exists = oldProjects.some((p) => p.id === newProject.id);
        if (exists) {
          return oldProjects;
        }
        return [...oldProjects, newProject];
      });

      // Refetch to ensure we have the latest data and wait for it to complete
      await queryClient.refetchQueries({
        queryKey: ['projects'],
        type: 'active', // Only refetch active queries
      });
    },
    onError: (error) => {
      console.error('Failed to create project:', error);
      // On error, refetch to get correct state
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, projectData }: { id: number; projectData: Partial<Project> }) =>
      apiService.updateProject(id, projectData),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['projects'],
        type: 'active',
      });
    },
    onError: (error) => {
      console.error('Failed to update project:', error);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiService.deleteProject(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['projects'],
        type: 'active',
      });
    },
    onError: (error) => {
      console.error('Failed to delete project:', error);
    },
  });
}
