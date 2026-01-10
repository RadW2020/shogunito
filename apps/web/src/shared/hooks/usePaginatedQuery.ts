import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import type { PaginatedResponse, InfiniteScrollParams } from '../utils/pagination';
import {
  getNextPageParam,
  getPreviousPageParam,
  flattenInfiniteQueryData,
} from '../utils/pagination';

export interface UsePaginatedQueryOptions<TData> {
  queryKey: unknown[];
  queryFn: (params: InfiniteScrollParams) => Promise<PaginatedResponse<TData>>;
  initialPageParam?: number;
  limit?: number;
  enabled?: boolean;
  staleTime?: number;
}

export interface UsePaginatedQueryResult<TData> {
  flatData: TData[];
  totalItems: number;
  hasMore: boolean;
  loadMore: () => void;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  error: Error | null;
  refetch: () => void;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  data: InfiniteData<PaginatedResponse<TData>> | undefined;
}

/**
 * Generic hook for paginated queries with infinite scroll support
 *
 * @example
 * const { flatData, hasMore, loadMore, isLoading } = usePaginatedQuery({
 *   queryKey: ['projects'],
 *   queryFn: ({ pageParam = 1, limit = 50 }) => apiService.getProjectsPaginated(pageParam, limit),
 *   limit: 50,
 * });
 */
export function usePaginatedQuery<TData>({
  queryKey,
  queryFn,
  initialPageParam = 1,
  limit = 50,
  enabled = true,
  staleTime = 5 * 60 * 1000,
}: UsePaginatedQueryOptions<TData>): UsePaginatedQueryResult<TData> {
  const infiniteQuery = useInfiniteQuery<
    PaginatedResponse<TData>,
    Error,
    InfiniteData<PaginatedResponse<TData>>,
    unknown[],
    number
  >({
    queryKey,
    queryFn: ({ pageParam }) => queryFn({ pageParam: pageParam as number, limit }),
    initialPageParam,
    getNextPageParam,
    getPreviousPageParam,
    enabled,
    staleTime,
  });

  const flatData = flattenInfiniteQueryData(infiniteQuery.data?.pages);
  const totalItems = infiniteQuery.data?.pages[0]?.meta.total ?? flatData.length;
  const hasMore = infiniteQuery.hasNextPage ?? false;

  const loadMore = () => {
    if (hasMore && !infiniteQuery.isFetchingNextPage) {
      infiniteQuery.fetchNextPage();
    }
  };

  return {
    flatData,
    totalItems,
    hasMore,
    loadMore,
    isLoading: infiniteQuery.isLoading,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    error: infiniteQuery.error,
    refetch: infiniteQuery.refetch as () => void,
    hasNextPage: infiniteQuery.hasNextPage ?? false,
    fetchNextPage: infiniteQuery.fetchNextPage,
    data: infiniteQuery.data,
  };
}
