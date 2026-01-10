import { usePaginatedQuery, type UsePaginatedQueryResult } from '@shared/hooks/usePaginatedQuery';
import { paginateArray, type InfiniteScrollParams } from '@shared/utils/pagination';
import type { ApiVersion } from '@shared/api/client';
import { apiService } from '@shared/api/client';

/**
 * Hook for paginated versions with infinite scroll support
 *
 * Uses client-side pagination until the backend API supports pagination.
 * Once the API supports pagination, replace the queryFn with a direct API call.
 *
 * @example
 * const { flatData, hasMore, loadMore, isLoading } = useVersionsPaginated({
 *   shotId: 'SH_001',
 *   limit: 100,
 * });
 */
export function useVersionsPaginated(options?: {
  shotId?: number;
  limit?: number;
  enabled?: boolean;
}): UsePaginatedQueryResult<ApiVersion> {
  const { shotId, ...queryOptions } = options || {};

  return usePaginatedQuery<ApiVersion>({
    queryKey: shotId ? ['versions', 'paginated', { shotId }] : ['versions', 'paginated'],
    queryFn: async ({ pageParam = 1, limit = 100 }: InfiniteScrollParams) => {
      // Fetch versions from API (filtered by shotId if provided)
      const allVersions = await apiService.getVersions(shotId);

      // Apply client-side pagination
      // TODO: Replace with API pagination when backend supports it
      // return apiService.getVersionsPaginated(pageParam, limit, shotId);
      return paginateArray(allVersions, pageParam as number, limit as number);
    },
    limit: queryOptions.limit,
    enabled: queryOptions.enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Check if versions are being loaded for the first time
 */
export function useIsVersionsInitialLoading(query: UsePaginatedQueryResult<ApiVersion>): boolean {
  return query.isLoading && query.flatData.length === 0;
}
