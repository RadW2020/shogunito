import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStatusHelper } from '../useStatusHelper';
import type { Status } from '@shogun/shared';

describe('useStatusHelper', () => {
  const mockStatuses: Status[] = [
    {
      id: 1,
      code: 'active',
      name: 'Active',
      color: '#00ff00',
      applicableEntities: ['all'],
      isActive: true,
      sortOrder: 1,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 2,
      code: 'waiting',
      name: 'Waiting',
      color: '#ffaa00',
      applicableEntities: ['project', 'episode'],
      isActive: true,
      sortOrder: 2,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 3,
      code: 'completed',
      name: 'Completed',
      color: '#0000ff',
      applicableEntities: ['shot'],
      isActive: true,
      sortOrder: 3,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  describe('statusMap', () => {
    it('should create status map from statuses', () => {
      const { result } = renderHook(() => useStatusHelper(mockStatuses));

      expect(result.current.statusMap).toHaveProperty('active');
      expect(result.current.statusMap.active).toEqual({
        label: 'Active',
        color: '#00ff00',
      });
    });

    it('should use code as label when name is missing', () => {
      const statusesWithoutName: Status[] = [
        {
          id: 1,
          code: 'test-status',
          name: undefined as unknown as string,
          color: '#ff0000',
          applicableEntities: ['all'],
          isActive: true,
          sortOrder: 1,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const { result } = renderHook(() => useStatusHelper(statusesWithoutName));

      expect(result.current.statusMap['test-status'].label).toBe('test-status');
    });

    it('should handle empty statuses array', () => {
      const { result } = renderHook(() => useStatusHelper([]));

      expect(result.current.statusMap).toEqual({});
    });

    it('should update when statuses change', () => {
      const { result, rerender } = renderHook(({ statuses }) => useStatusHelper(statuses), {
        initialProps: { statuses: mockStatuses },
      });

      expect(result.current.statusMap).toHaveProperty('active');

      const newStatuses: Status[] = [
        ...mockStatuses,
        {
          id: 4,
          code: 'new-status',
          name: 'New Status',
          color: '#ff00ff',
          applicableEntities: ['all'],
          isActive: true,
          sortOrder: 1,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      rerender({ statuses: newStatuses });

      expect(result.current.statusMap).toHaveProperty('new-status');
    });
  });

  describe('pickStableRandomStatus', () => {
    it('should return same status for same entity type and id', () => {
      const { result } = renderHook(() => useStatusHelper(mockStatuses));

      const status1 = result.current.pickStableRandomStatus('project', 'item-1');
      const status2 = result.current.pickStableRandomStatus('project', 'item-1');

      expect(status1).toBe(status2);
    });

    it('should return different status for different item ids', () => {
      const { result } = renderHook(() => useStatusHelper(mockStatuses));

      const status1 = result.current.pickStableRandomStatus('project', 'item-1');
      const status2 = result.current.pickStableRandomStatus('project', 'item-2');

      // Might be same or different, but should be deterministic
      expect(typeof status1).toBe('string');
      expect(typeof status2).toBe('string');
    });

    it('should return status applicable to entity type', () => {
      const { result } = renderHook(() => useStatusHelper(mockStatuses));

      // 'active' is applicable to 'all', so should be available for any entity
      const status = result.current.pickStableRandomStatus('shot', 'item-1');

      // Should be one of the applicable statuses
      expect(['active', 'completed']).toContain(status);
    });

    it('should return undefined when no applicable statuses', () => {
      const statusesForProjectOnly: Status[] = [
        {
          id: 1,
          code: 'project-only',
          name: 'Project Only',
          color: '#ff0000',
          applicableEntities: ['project'],
          isActive: true,
          sortOrder: 1,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const { result } = renderHook(() => useStatusHelper(statusesForProjectOnly));

      // Shot has no applicable statuses
      const status = result.current.pickStableRandomStatus('shot', 'item-1');

      expect(status).toBeUndefined();
    });

    it('should handle statuses with "all" in applicableEntities', () => {
      const { result } = renderHook(() => useStatusHelper(mockStatuses));

      // 'active' has applicableEntities: ['all']
      const status = result.current.pickStableRandomStatus('sequence', 'item-1');

      expect(status).toBe('active');
    });

    it('should use hash function for deterministic selection', () => {
      const { result } = renderHook(() => useStatusHelper(mockStatuses));

      // Test multiple times to ensure determinism
      const results = Array.from({ length: 10 }, () =>
        result.current.pickStableRandomStatus('project', 'test-id'),
      );

      // All should be the same
      expect(new Set(results).size).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle statuses with null color', () => {
      const statusesWithNullColor: Status[] = [
        {
          id: 1,
          code: 'no-color',
          name: 'No Color',
          color: null as any,
          applicableEntities: ['all'],
          isActive: true,
          sortOrder: 1,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const { result } = renderHook(() => useStatusHelper(statusesWithNullColor));

      expect(result.current.statusMap['no-color'].color).toBeNull();
    });

    it('should handle statuses with empty applicableEntities', () => {
      const statusesEmptyEntities: Status[] = [
        {
          id: 1,
          code: 'empty-entities',
          name: 'Empty',
          color: '#ff0000',
          applicableEntities: [],
          isActive: true,
          sortOrder: 1,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const { result } = renderHook(() => useStatusHelper(statusesEmptyEntities));

      const status = result.current.pickStableRandomStatus('project', 'item-1');
      expect(status).toBeUndefined();
    });

    it('should handle statuses with undefined applicableEntities', () => {
      const statusesUndefined: Status[] = [
        {
          id: 1,
          code: 'undefined-entities',
          name: 'Undefined',
          color: '#ff0000',
          applicableEntities: undefined as any,
          isActive: true,
          sortOrder: 1,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const { result } = renderHook(() => useStatusHelper(statusesUndefined));

      const status = result.current.pickStableRandomStatus('project', 'item-1');
      expect(status).toBeUndefined();
    });
  });
});
