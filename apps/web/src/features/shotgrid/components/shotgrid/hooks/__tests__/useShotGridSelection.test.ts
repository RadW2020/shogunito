import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShotGridSelection } from '../useShotGridSelection';

describe('useShotGridSelection', () => {
  const mockSetSelectedItems = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleItemSelect', () => {
    it('should add item to selection when checked is true', () => {
      const { result } = renderHook(() =>
        useShotGridSelection({
          selectedItems: new Set<string>(),
          setSelectedItems: mockSetSelectedItems,
        }),
      );

      act(() => {
        result.current.handleItemSelect('item-1', true);
      });

      expect(mockSetSelectedItems).toHaveBeenCalledWith(new Set(['item-1']));
    });

    it('should remove item from selection when checked is false', () => {
      const { result } = renderHook(() =>
        useShotGridSelection({
          selectedItems: new Set(['item-1', 'item-2']),
          setSelectedItems: mockSetSelectedItems,
        }),
      );

      act(() => {
        result.current.handleItemSelect('item-1', false);
      });

      expect(mockSetSelectedItems).toHaveBeenCalledWith(new Set(['item-2']));
    });

    it('should handle multiple selections', () => {
      const { result } = renderHook(() =>
        useShotGridSelection({
          selectedItems: new Set(['item-1']),
          setSelectedItems: mockSetSelectedItems,
        }),
      );

      act(() => {
        result.current.handleItemSelect('item-2', true);
      });

      expect(mockSetSelectedItems).toHaveBeenCalledWith(new Set(['item-1', 'item-2']));
    });

    it('should not add duplicate items', () => {
      const { result } = renderHook(() =>
        useShotGridSelection({
          selectedItems: new Set(['item-1']),
          setSelectedItems: mockSetSelectedItems,
        }),
      );

      act(() => {
        result.current.handleItemSelect('item-1', true);
      });

      expect(mockSetSelectedItems).toHaveBeenCalledWith(new Set(['item-1']));
    });
  });

  describe('handleSelectAll', () => {
    it('should select all items when checked is true', () => {
      const { result } = renderHook(() =>
        useShotGridSelection({
          selectedItems: new Set<string>(),
          setSelectedItems: mockSetSelectedItems,
        }),
      );

      const items = [
        { id: 1, code: 'ITEM-1' },
        { id: 2, code: 'ITEM-2' },
        { id: 3, code: 'ITEM-3' },
      ];

      act(() => {
        result.current.handleSelectAll(items, true);
      });

      expect(mockSetSelectedItems).toHaveBeenCalledWith(new Set(['1', '2', '3']));
    });

    it('should deselect all items when checked is false', () => {
      const { result } = renderHook(() =>
        useShotGridSelection({
          selectedItems: new Set(['1', '2', '3']),
          setSelectedItems: mockSetSelectedItems,
        }),
      );

      const items = [
        { id: 1, code: 'ITEM-1' },
        { id: 2, code: 'ITEM-2' },
        { id: 3, code: 'ITEM-3' },
      ];

      act(() => {
        result.current.handleSelectAll(items, false);
      });

      expect(mockSetSelectedItems).toHaveBeenCalledWith(new Set());
    });

    it('should handle items with string ids', () => {
      const { result } = renderHook(() =>
        useShotGridSelection({
          selectedItems: new Set<string>(),
          setSelectedItems: mockSetSelectedItems,
        }),
      );

      const items = [
        { id: 'item-1', code: 'ITEM-1' },
        { id: 'item-2', code: 'ITEM-2' },
      ];

      act(() => {
        result.current.handleSelectAll(items, true);
      });

      expect(mockSetSelectedItems).toHaveBeenCalledWith(new Set(['item-1', 'item-2']));
    });

    it('should handle items with number ids', () => {
      const { result } = renderHook(() =>
        useShotGridSelection({
          selectedItems: new Set<string>(),
          setSelectedItems: mockSetSelectedItems,
        }),
      );

      const items = [
        { id: 100, code: 'ITEM-1' },
        { id: 200, code: 'ITEM-2' },
      ];

      act(() => {
        result.current.handleSelectAll(items, true);
      });

      expect(mockSetSelectedItems).toHaveBeenCalledWith(new Set(['100', '200']));
    });

    it('should skip items without id', () => {
      const { result } = renderHook(() =>
        useShotGridSelection({
          selectedItems: new Set<string>(),
          setSelectedItems: mockSetSelectedItems,
        }),
      );

      const items = [
        { id: 1, code: 'ITEM-1' },
        { code: 'ITEM-2' }, // No id
        { id: 3, code: 'ITEM-3' },
      ];

      act(() => {
        result.current.handleSelectAll(items, true);
      });

      expect(mockSetSelectedItems).toHaveBeenCalledWith(new Set(['1', '3']));
    });

    it('should handle empty items array', () => {
      const { result } = renderHook(() =>
        useShotGridSelection({
          selectedItems: new Set(['1', '2']),
          setSelectedItems: mockSetSelectedItems,
        }),
      );

      act(() => {
        result.current.handleSelectAll([], false);
      });

      expect(mockSetSelectedItems).toHaveBeenCalledWith(new Set(['1', '2']));
    });

    it('should merge with existing selection when selecting all', () => {
      const { result } = renderHook(() =>
        useShotGridSelection({
          selectedItems: new Set(['existing-1']),
          setSelectedItems: mockSetSelectedItems,
        }),
      );

      const items = [
        { id: 1, code: 'ITEM-1' },
        { id: 2, code: 'ITEM-2' },
      ];

      act(() => {
        result.current.handleSelectAll(items, true);
      });

      expect(mockSetSelectedItems).toHaveBeenCalledWith(new Set(['existing-1', '1', '2']));
    });
  });
});

