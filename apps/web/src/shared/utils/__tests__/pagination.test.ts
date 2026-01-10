import { describe, it, expect } from 'vitest';
import {
  calculateTotalPages,
  getPaginationParams,
  hasNextPage,
  hasPreviousPage,
  getDisplayRange,
  paginateArray,
  flattenInfiniteQueryData,
  getNextPageParam,
  getPreviousPageParam,
  DEFAULT_PAGE_SIZE,
} from '../pagination';

describe('pagination utilities', () => {
  describe('calculateTotalPages', () => {
    it('should calculate total pages correctly', () => {
      expect(calculateTotalPages(100, 10)).toBe(10);
      expect(calculateTotalPages(101, 10)).toBe(11);
      expect(calculateTotalPages(99, 10)).toBe(10);
      expect(calculateTotalPages(0, 10)).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(calculateTotalPages(1, 1)).toBe(1);
      expect(calculateTotalPages(1, 10)).toBe(1);
    });
  });

  describe('getPaginationParams', () => {
    it('should return valid pagination params', () => {
      expect(getPaginationParams(1, 10)).toEqual({ page: 1, limit: 10 });
      expect(getPaginationParams(5, 20)).toEqual({ page: 5, limit: 20 });
    });

    it('should use default page size when limit not provided', () => {
      expect(getPaginationParams(1)).toEqual({
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
      });
    });

    it('should enforce minimum page of 1', () => {
      expect(getPaginationParams(0, 10)).toEqual({ page: 1, limit: 10 });
      expect(getPaginationParams(-5, 10)).toEqual({ page: 1, limit: 10 });
    });

    it('should enforce minimum limit of 1', () => {
      expect(getPaginationParams(1, 0)).toEqual({ page: 1, limit: 1 });
      expect(getPaginationParams(1, -5)).toEqual({ page: 1, limit: 1 });
    });

    it('should cap limit at 1000', () => {
      expect(getPaginationParams(1, 2000)).toEqual({ page: 1, limit: 1000 });
      expect(getPaginationParams(1, 5000)).toEqual({ page: 1, limit: 1000 });
    });
  });

  describe('hasNextPage', () => {
    it('should return true when there is a next page', () => {
      expect(hasNextPage(1, 5)).toBe(true);
      expect(hasNextPage(4, 5)).toBe(true);
    });

    it('should return false when on last page', () => {
      expect(hasNextPage(5, 5)).toBe(false);
      expect(hasNextPage(10, 10)).toBe(false);
    });

    it('should return false when page exceeds total', () => {
      expect(hasNextPage(6, 5)).toBe(false);
    });
  });

  describe('hasPreviousPage', () => {
    it('should return false for first page', () => {
      expect(hasPreviousPage(1)).toBe(false);
    });

    it('should return true for pages after first', () => {
      expect(hasPreviousPage(2)).toBe(true);
      expect(hasPreviousPage(10)).toBe(true);
    });
  });

  describe('getDisplayRange', () => {
    it('should calculate display range correctly', () => {
      expect(getDisplayRange(1, 10, 100)).toEqual({
        start: 1,
        end: 10,
        total: 100,
      });
      expect(getDisplayRange(2, 10, 100)).toEqual({
        start: 11,
        end: 20,
        total: 100,
      });
      expect(getDisplayRange(10, 10, 100)).toEqual({
        start: 91,
        end: 100,
        total: 100,
      });
    });

    it('should handle last page correctly', () => {
      expect(getDisplayRange(10, 10, 95)).toEqual({
        start: 91,
        end: 95,
        total: 95,
      });
    });
  });

  describe('paginateArray', () => {
    const testData = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
    }));

    it('should paginate array correctly', () => {
      const result = paginateArray(testData, 1, 10);
      expect(result.data).toHaveLength(10);
      expect(result.meta.total).toBe(25);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPreviousPage).toBe(false);
    });

    it('should handle last page correctly', () => {
      const result = paginateArray(testData, 3, 10);
      expect(result.data).toHaveLength(5);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(true);
    });

    it('should handle empty array', () => {
      const result = paginateArray([], 1, 10);
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('flattenInfiniteQueryData', () => {
    it('should flatten paginated pages into single array', () => {
      const pages = [
        {
          data: [{ id: 1 }, { id: 2 }],
          meta: {
            total: 5,
            page: 1,
            limit: 2,
            totalPages: 3,
            hasNextPage: true,
            hasPreviousPage: false,
          },
        },
        {
          data: [{ id: 3 }, { id: 4 }],
          meta: {
            total: 5,
            page: 2,
            limit: 2,
            totalPages: 3,
            hasNextPage: true,
            hasPreviousPage: true,
          },
        },
        {
          data: [{ id: 5 }],
          meta: {
            total: 5,
            page: 3,
            limit: 2,
            totalPages: 3,
            hasNextPage: false,
            hasPreviousPage: true,
          },
        },
      ];
      const result = flattenInfiniteQueryData(pages);
      expect(result).toHaveLength(5);
      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
    });

    it('should return empty array for undefined', () => {
      expect(flattenInfiniteQueryData(undefined)).toEqual([]);
    });
  });

  describe('getNextPageParam', () => {
    it('should return next page number when hasNextPage is true', () => {
      const lastPage = {
        data: [],
        meta: {
          total: 100,
          page: 1,
          limit: 10,
          totalPages: 10,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      };
      expect(getNextPageParam(lastPage)).toBe(2);
    });

    it('should return undefined when hasNextPage is false', () => {
      const lastPage = {
        data: [],
        meta: {
          total: 100,
          page: 10,
          limit: 10,
          totalPages: 10,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      };
      expect(getNextPageParam(lastPage)).toBeUndefined();
    });
  });

  describe('getPreviousPageParam', () => {
    it('should return previous page number when hasPreviousPage is true', () => {
      const firstPage = {
        data: [],
        meta: {
          total: 100,
          page: 2,
          limit: 10,
          totalPages: 10,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      };
      expect(getPreviousPageParam(firstPage)).toBe(1);
    });

    it('should return undefined when hasPreviousPage is false', () => {
      const firstPage = {
        data: [],
        meta: {
          total: 100,
          page: 1,
          limit: 10,
          totalPages: 10,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      };
      expect(getPreviousPageParam(firstPage)).toBeUndefined();
    });
  });
});
