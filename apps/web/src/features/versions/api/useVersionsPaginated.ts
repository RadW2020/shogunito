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
 *   entityId: 123,
 *   entityType: 'sequence',
 *   limit: 100,
 * });
 */
export function useVersionsPaginated(options?: {
  entityId?: number;
  entityType?: string;
  limit?: number;
  enabled?: boolean;
}): UsePaginatedQueryResult<ApiVersion> {
  const { entityId, entityType, ...queryOptions } = options || {};

  return usePaginatedQuery<ApiVersion>({
    queryKey: entityId
      ? ['versions', 'paginated', { entityId, entityType }]
      : ['versions', 'paginated'],
    queryFn: async ({ pageParam = 1, limit = 100 }: InfiniteScrollParams) => {
      // Fetch versions from API (filtered by entity if provided)
      const allVersions = await apiService.getVersions(entityId, entityType);

      // Apply client-side pagination
      // TODO: Replace with API pagination when backend supports it
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
