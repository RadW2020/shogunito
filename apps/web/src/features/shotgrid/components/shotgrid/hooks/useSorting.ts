import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

export interface CustomSortFunction<T> {
  (a: T, b: T): number;
}

export const useSorting = <T extends Record<string, unknown>>(
  data: T[],
  initialSort?: SortConfig,
  customSortFunctions?: Record<string, CustomSortFunction<T>>,
) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>(
    initialSort || { field: '', direction: null },
  );

  const sortedData = useMemo(() => {
    if (!sortConfig.field || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      // Check if there's a custom sort function for this field
      if (customSortFunctions && customSortFunctions[sortConfig.field]) {
        const customSort = customSortFunctions[sortConfig.field];
        const result = customSort(a, b);
        return sortConfig.direction === 'asc' ? result : -result;
      }

      // Default sorting logic
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Fallback to string comparison
      const comparison = String(aValue).toLowerCase().localeCompare(String(bValue).toLowerCase());
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig, customSortFunctions]);

  const handleSort = (field: string) => {
    setSortConfig((current) => {
      if (current.field === field) {
        // Cycle through: asc -> desc -> null -> asc
        if (current.direction === 'asc') {
          return { field, direction: 'desc' };
        } else if (current.direction === 'desc') {
          return { field, direction: null };
        } else {
          return { field, direction: 'asc' };
        }
      } else {
        // New field, start with asc
        return { field, direction: 'asc' };
      }
    });
  };

  const getSortIcon = (field: string) => {
    if (sortConfig.field !== field) {
      return '↕️'; // Neutral icon
    }

    switch (sortConfig.direction) {
      case 'asc':
        return '↑';
      case 'desc':
        return '↓';
      default:
        return '↕️';
    }
  };

  return {
    sortedData,
    sortConfig,
    handleSort,
    getSortIcon,
  };
};
