/**
 * Pagination Types and Utilities
 *
 * Provides types and helper functions for implementing pagination
 * across the application, including virtual scrolling and infinite scroll.
 */

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface InfiniteScrollParams {
  pageParam?: number;
  limit?: number;
}

export const DEFAULT_PAGE_SIZE = 50;
export const DEFAULT_INITIAL_PAGE = 1;

/**
 * Calculate total pages from total items and page size
 */
export function calculateTotalPages(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize);
}

/**
 * Get pagination parameters for API requests
 */
export function getPaginationParams(
  page: number,
  limit: number = DEFAULT_PAGE_SIZE,
): PaginationParams {
  return {
    page: Math.max(1, page),
    limit: Math.max(1, Math.min(limit, 1000)), // Cap at 1000
  };
}

/**
 * Check if there's a next page available
 */
export function hasNextPage(currentPage: number, totalPages: number): boolean {
  return currentPage < totalPages;
}

/**
 * Check if there's a previous page available
 */
export function hasPreviousPage(currentPage: number): boolean {
  return currentPage > 1;
}

/**
 * Get the range of items being displayed
 * Example: "Showing 1-50 of 234"
 */
export function getDisplayRange(
  page: number,
  limit: number,
  total: number,
): { start: number; end: number; total: number } {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return { start, end, total };
}

/**
 * Convert flat array data into paginated response format
 */
export function paginateArray<T>(data: T[], page: number, limit: number): PaginatedResponse<T> {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = data.slice(startIndex, endIndex);
  const totalPages = calculateTotalPages(data.length, limit);

  return {
    data: paginatedData,
    meta: {
      total: data.length,
      page,
      limit,
      totalPages,
      hasNextPage: hasNextPage(page, totalPages),
      hasPreviousPage: hasPreviousPage(page),
    },
  };
}

/**
 * Merge pages from infinite query into single array
 */
export function flattenInfiniteQueryData<T>(pages: PaginatedResponse<T>[] | undefined): T[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.data);
}

/**
 * Get next page parameter for infinite query
 */
export function getNextPageParam<T>(lastPage: PaginatedResponse<T>): number | undefined {
  return lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined;
}

/**
 * Get previous page parameter for infinite query
 */
export function getPreviousPageParam<T>(firstPage: PaginatedResponse<T>): number | undefined {
  return firstPage.meta.hasPreviousPage ? firstPage.meta.page - 1 : undefined;
}
