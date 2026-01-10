import type { Project } from '@shogun/shared';
import { apiService } from '@shared/api/client';
import {
  useOptimisticCreate,
  useOptimisticUpdate,
  useOptimisticDelete,
} from '@shared/hooks/useOptimisticMutation';

/**
 * Optimistic create project hook
 *
 * @example
 * ```tsx
 * const createProject = useCreateProjectOptimistic();
 *
 * <button onClick={() => createProject.mutate({ name: 'New Project', code: 'PROJ' })}>
 *   Create Project
 * </button>
 * ```
 */
export function useCreateProjectOptimistic() {
  return useOptimisticCreate<Project, Partial<Project>>({
    mutationFn: (projectData) => apiService.createProject(projectData),
    queryKey: ['projects'],
    successMessage: 'Project created successfully',
    errorMessage: 'Failed to create project',
    // Also invalidate paginated queries if they exist
    invalidateKeys: [['projects', 'paginated']],
  });
}

/**
 * Optimistic update project hook
 *
 * @example
 * ```tsx
 * const updateProject = useUpdateProjectOptimistic();
 *
 * <button onClick={() => updateProject.mutate({
 *   id: project.id,
 *   data: { name: 'Updated Name' }
 * })}>
 *   Update Project
 * </button>
 * ```
 */
export function useUpdateProjectOptimistic() {
  return useOptimisticUpdate<Project, { id: number; data: Partial<Project> }>({
    mutationFn: ({ id, data }) => apiService.updateProject(id, data),
    queryKey: ['projects'],
    getId: (vars) => String(vars.id),
    successMessage: (data) => `Project "${data.name}" updated successfully`,
    errorMessage: 'Failed to update project',
    invalidateKeys: [['projects', 'paginated']],
  });
}

/**
 * Optimistic delete project hook
 *
 * @example
 * ```tsx
 * const deleteProject = useDeleteProjectOptimistic();
 *
 * <button onClick={() => deleteProject.mutate(project.id)}>
 *   Delete Project
 * </button>
 * ```
 */
export function useDeleteProjectOptimistic() {
  return useOptimisticDelete<Project>({
    mutationFn: (id: number) => apiService.deleteProject(id),
    queryKey: ['projects'],
    successMessage: 'Project deleted successfully',
    errorMessage: 'Failed to delete project',
    invalidateKeys: [['projects', 'paginated']],
  });
}
