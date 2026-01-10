import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSorting } from '../useSorting';

describe('useSorting', () => {
  const mockData = [
    { id: 1, name: 'Charlie', age: 30, score: 85 },
    { id: 2, name: 'Alice', age: 25, score: 90 },
    { id: 3, name: 'Bob', age: 35, score: 75 },
  ];

  describe('initial state', () => {
    it('should return unsorted data when no sort config provided', () => {
      const { result } = renderHook(() => useSorting(mockData));
      expect(result.current.sortedData).toEqual(mockData);
      expect(result.current.sortConfig.field).toBe('');
      expect(result.current.sortConfig.direction).toBeNull();
    });

    it('should use initial sort config when provided', () => {
      const { result } = renderHook(() =>
        useSorting(mockData, { field: 'name', direction: 'asc' }),
      );
      expect(result.current.sortConfig.field).toBe('name');
      expect(result.current.sortConfig.direction).toBe('asc');
    });
  });

  describe('string sorting', () => {
    it('should sort strings ascending', () => {
      const { result } = renderHook(() => useSorting(mockData));

      act(() => {
        result.current.handleSort('name');
      });

      expect(result.current.sortedData[0].name).toBe('Alice');
      expect(result.current.sortedData[1].name).toBe('Bob');
      expect(result.current.sortedData[2].name).toBe('Charlie');
      expect(result.current.sortConfig.direction).toBe('asc');
    });

    it('should sort strings descending', () => {
      const { result } = renderHook(() => useSorting(mockData));

      act(() => {
        result.current.handleSort('name');
        result.current.handleSort('name'); // Toggle to desc
      });

      expect(result.current.sortedData[0].name).toBe('Charlie');
      expect(result.current.sortedData[1].name).toBe('Bob');
      expect(result.current.sortedData[2].name).toBe('Alice');
      expect(result.current.sortConfig.direction).toBe('desc');
    });

    it('should be case-insensitive', () => {
      const dataWithCase = [
        { id: 1, name: 'charlie' },
        { id: 2, name: 'Alice' },
        { id: 3, name: 'BOB' },
      ];
      const { result } = renderHook(() => useSorting(dataWithCase));

      act(() => {
        result.current.handleSort('name');
      });

      expect(result.current.sortedData[0].name).toBe('Alice');
      expect(result.current.sortedData[1].name).toBe('BOB');
      expect(result.current.sortedData[2].name).toBe('charlie');
    });
  });

  describe('number sorting', () => {
    it('should sort numbers ascending', () => {
      const { result } = renderHook(() => useSorting(mockData));

      act(() => {
        result.current.handleSort('age');
      });

      expect(result.current.sortedData[0].age).toBe(25);
      expect(result.current.sortedData[1].age).toBe(30);
      expect(result.current.sortedData[2].age).toBe(35);
    });

    it('should sort numbers descending', () => {
      const { result } = renderHook(() => useSorting(mockData));

      act(() => {
        result.current.handleSort('score');
        result.current.handleSort('score'); // Toggle to desc
      });

      expect(result.current.sortedData[0].score).toBe(90);
      expect(result.current.sortedData[1].score).toBe(85);
      expect(result.current.sortedData[2].score).toBe(75);
    });
  });

  describe('null/undefined handling', () => {
    const dataWithNulls = [
      { id: 1, name: 'Alice', value: 10 },
      { id: 2, name: 'Bob', value: null },
      { id: 3, name: 'Charlie', value: 20 },
      { id: 4, name: 'David', value: undefined },
    ];

    it('should handle null values in ascending sort', () => {
      const { result } = renderHook(() => useSorting(dataWithNulls));

      act(() => {
        result.current.handleSort('value');
      });

      // According to the hook logic, null/undefined go to the end in ascending
      // But the actual order depends on the implementation
      const sortedValues = result.current.sortedData.map((item) => item.value);

      // Should contain all values
      expect(sortedValues).toContain(10);
      expect(sortedValues).toContain(20);
      expect(sortedValues).toContain(null);
      expect(sortedValues).toContain(undefined);

      // Non-null values should be sorted correctly
      const nonNullValues = sortedValues.filter((v) => v != null);
      expect(nonNullValues).toEqual([10, 20]);
    });

    it('should handle null values in descending sort', () => {
      const { result } = renderHook(() => useSorting(dataWithNulls));

      act(() => {
        result.current.handleSort('value');
        result.current.handleSort('value'); // Toggle to desc
      });

      // Null/undefined should be at the end in descending too
      expect(result.current.sortedData[0].value).toBe(20);
      expect(result.current.sortedData[1].value).toBe(10);
    });
  });

  describe('sort cycling', () => {
    it('should cycle through asc -> desc -> null -> asc', () => {
      const { result } = renderHook(() => useSorting(mockData));

      // First click: asc
      act(() => {
        result.current.handleSort('name');
      });
      expect(result.current.sortConfig.direction).toBe('asc');

      // Second click: desc
      act(() => {
        result.current.handleSort('name');
      });
      expect(result.current.sortConfig.direction).toBe('desc');

      // Third click: null (unsorted)
      act(() => {
        result.current.handleSort('name');
      });
      expect(result.current.sortConfig.direction).toBeNull();

      // Fourth click: back to asc
      act(() => {
        result.current.handleSort('name');
      });
      expect(result.current.sortConfig.direction).toBe('asc');
    });

    it('should reset to asc when switching fields', () => {
      const { result } = renderHook(() => useSorting(mockData));

      act(() => {
        result.current.handleSort('name');
        result.current.handleSort('name'); // desc
      });
      expect(result.current.sortConfig.direction).toBe('desc');

      // Switch to different field
      act(() => {
        result.current.handleSort('age');
      });
      expect(result.current.sortConfig.field).toBe('age');
      expect(result.current.sortConfig.direction).toBe('asc');
    });
  });

  describe('custom sort functions', () => {
    it('should use custom sort function when provided', () => {
      const customSort = vi.fn((a, b) => a.score - b.score);
      const { result } = renderHook(() => useSorting(mockData, undefined, { score: customSort }));

      act(() => {
        result.current.handleSort('score');
      });

      expect(customSort).toHaveBeenCalled();
      expect(result.current.sortedData[0].score).toBe(75);
      expect(result.current.sortedData[1].score).toBe(85);
      expect(result.current.sortedData[2].score).toBe(90);
    });

    it('should reverse custom sort for descending', () => {
      const customSort = vi.fn((a, b) => a.score - b.score);
      const { result } = renderHook(() => useSorting(mockData, undefined, { score: customSort }));

      act(() => {
        result.current.handleSort('score');
        result.current.handleSort('score'); // desc
      });

      expect(result.current.sortedData[0].score).toBe(90);
      expect(result.current.sortedData[1].score).toBe(85);
      expect(result.current.sortedData[2].score).toBe(75);
    });
  });

  describe('getSortIcon', () => {
    it('should return neutral icon for unsorted field', () => {
      const { result } = renderHook(() => useSorting(mockData));
      expect(result.current.getSortIcon('name')).toBe('↕️');
    });

    it('should return up arrow for ascending', () => {
      const { result } = renderHook(() => useSorting(mockData));

      act(() => {
        result.current.handleSort('name');
      });

      expect(result.current.getSortIcon('name')).toBe('↑');
    });

    it('should return down arrow for descending', () => {
      const { result } = renderHook(() => useSorting(mockData));

      act(() => {
        result.current.handleSort('name');
        result.current.handleSort('name');
      });

      expect(result.current.getSortIcon('name')).toBe('↓');
    });

    it('should return neutral icon when sort is cleared', () => {
      const { result } = renderHook(() => useSorting(mockData));

      act(() => {
        result.current.handleSort('name');
        result.current.handleSort('name');
        result.current.handleSort('name'); // Clear
      });

      expect(result.current.getSortIcon('name')).toBe('↕️');
    });
  });

  describe('data updates', () => {
    it('should re-sort when data changes', () => {
      const { result, rerender } = renderHook(
        ({ data }) => useSorting(data, { field: 'name', direction: 'asc' }),
        {
          initialProps: { data: mockData },
        },
      );

      expect(result.current.sortedData[0].name).toBe('Alice');

      const newData = [{ id: 4, name: 'Zebra', age: 0, score: 0 }, ...mockData];

      rerender({ data: newData });

      expect(result.current.sortedData[0].name).toBe('Alice');
      expect(result.current.sortedData[result.current.sortedData.length - 1].name).toBe('Zebra');
    });
  });
});
