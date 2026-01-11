import { usePaginatedQuery, type UsePaginatedQueryResult } from '@shared/hooks/usePaginatedQuery';
import { paginateArray, type InfiniteScrollParams } from '@shared/utils/pagination';
import type { Project } from '@shogunito/shared';
import { apiService } from '@shared/api/client';

/**
 * Hook for paginated projects with infinite scroll support
 *
 * Uses client-side pagination until the backend API supports pagination.
 * Once the API supports pagination, replace the queryFn with a direct API call.
 *
 * @example
 * const { flatData, hasMore, loadMore, isLoading } = useProjectsPaginated({ limit: 50 });
 */
export function useProjectsPaginated(options?: {
  limit?: number;
  enabled?: boolean;
}): UsePaginatedQueryResult<Project> {
  return usePaginatedQuery<Project>({
    queryKey: ['projects', 'paginated'],
    queryFn: async ({ pageParam = 1, limit = 50 }: InfiniteScrollParams) => {
      // Fetch all projects from API
      const allProjects = await apiService.getProjects();

      // Apply client-side pagination
      // TODO: Replace with API pagination when backend supports it
      // return apiService.getProjectsPaginated(pageParam, limit);
      return paginateArray(allProjects, pageParam as number, limit as number);
    },
    limit: options?.limit,
    enabled: options?.enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Check if projects are being loaded for the first time
 */
export function useIsProjectsInitialLoading(query: UsePaginatedQueryResult<Project>): boolean {
  return query.isLoading && query.flatData.length === 0;
}
