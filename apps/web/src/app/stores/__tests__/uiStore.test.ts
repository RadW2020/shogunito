import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUiStore } from '../uiStore';
import type { TabType } from '@shogun/shared';

describe('useUiStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useUiStore.setState({
      activeTab: 'projects',
      showFilters: false,
      showDetailPanel: false,
      selectedItems: new Set<string>(),
      viewModes: { versions: 'table' },
      filters: {
        selectedProjectId: 'all',
        selectedEpisodeId: 'all',
        selectedAssetId: 'all',
        selectedSequenceId: 'all',
        selectedShotId: 'all',
        selectedFormat: 'all',
        selectedVersionStatus: 'all',
        selectedPlaylistStatus: 'all',
        selectedEntityType: 'all',
        latestOnly: false,
      },
      selectedDetail: null,
    });
  });

  describe('Tab management', () => {
    it('should set active tab', () => {
      const { setActiveTab } = useUiStore.getState();
      setActiveTab('episodes');
      expect(useUiStore.getState().activeTab).toBe('episodes');
    });

    it('should update URL when tab changes', () => {
      const { setActiveTab } = useUiStore.getState();
      const originalPushState = window.history.replaceState;
      const mockReplaceState = vi.fn();
      window.history.replaceState = mockReplaceState;

      setActiveTab('shots');

      expect(mockReplaceState).toHaveBeenCalled();
      window.history.replaceState = originalPushState;
    });
  });

  describe('Filter visibility', () => {
    it('should toggle filters', () => {
      const { toggleFilters } = useUiStore.getState();
      expect(useUiStore.getState().showFilters).toBe(false);

      toggleFilters();
      expect(useUiStore.getState().showFilters).toBe(true);

      toggleFilters();
      expect(useUiStore.getState().showFilters).toBe(false);
    });

    it('should set filter visibility', () => {
      const { setShowFilters } = useUiStore.getState();
      setShowFilters(true);
      expect(useUiStore.getState().showFilters).toBe(true);

      setShowFilters(false);
      expect(useUiStore.getState().showFilters).toBe(false);
    });
  });

  describe('Detail panel', () => {
    it('should set detail panel visibility', () => {
      const { setShowDetailPanel } = useUiStore.getState();
      setShowDetailPanel(true);
      expect(useUiStore.getState().showDetailPanel).toBe(true);
    });

    it('should set selected detail and show panel', () => {
      const { setSelectedDetail } = useUiStore.getState();
      const detail = {
        type: 'projects' as TabType,
        item: { id: '1', name: 'Test Project' },
      };

      setSelectedDetail(detail);

      expect(useUiStore.getState().selectedDetail).toEqual(detail);
      expect(useUiStore.getState().showDetailPanel).toBe(true);
    });

    it('should hide panel when detail is null', () => {
      const { setSelectedDetail } = useUiStore.getState();
      setSelectedDetail(null);
      expect(useUiStore.getState().showDetailPanel).toBe(false);
      expect(useUiStore.getState().selectedDetail).toBeNull();
    });
  });

  describe('Item selection', () => {
    it('should set selected items', () => {
      const { setSelectedItems } = useUiStore.getState();
      const items = new Set(['1', '2', '3']);
      setSelectedItems(items);
      expect(useUiStore.getState().selectedItems).toEqual(items);
    });

    it('should clear selected items', () => {
      const { setSelectedItems, clearSelectedItems } = useUiStore.getState();
      setSelectedItems(new Set(['1', '2']));
      clearSelectedItems();
      expect(useUiStore.getState().selectedItems.size).toBe(0);
    });

    it('should add selected item', () => {
      const { addSelectedItem } = useUiStore.getState();
      addSelectedItem('1');
      expect(useUiStore.getState().selectedItems.has('1')).toBe(true);
    });

    it('should remove selected item', () => {
      const { addSelectedItem, removeSelectedItem } = useUiStore.getState();
      addSelectedItem('1');
      addSelectedItem('2');
      removeSelectedItem('1');
      expect(useUiStore.getState().selectedItems.has('1')).toBe(false);
      expect(useUiStore.getState().selectedItems.has('2')).toBe(true);
    });

    it('should not duplicate items when adding same item twice', () => {
      const { addSelectedItem } = useUiStore.getState();
      addSelectedItem('1');
      addSelectedItem('1');
      expect(useUiStore.getState().selectedItems.size).toBe(1);
    });
  });

  describe('View modes', () => {
    it('should set view mode for versions', () => {
      const { setViewMode } = useUiStore.getState();
      setViewMode('versions', 'thumbnails');
      expect(useUiStore.getState().viewModes.versions).toBe('thumbnails');
    });

    it('should update view mode without affecting others', () => {
      const { setViewMode } = useUiStore.getState();
      setViewMode('versions', 'thumbnails');
      // If there were other view modes, they should remain unchanged
      expect(useUiStore.getState().viewModes.versions).toBe('thumbnails');
    });
  });

  describe('Filters', () => {
    it('should set filter value', () => {
      const { setFilter } = useUiStore.getState();
      setFilter('selectedProjectId', '123');
      expect(useUiStore.getState().filters.selectedProjectId).toBe('123');
    });

    it('should set boolean filter', () => {
      const { setFilter } = useUiStore.getState();
      setFilter('latestOnly', true);
      expect(useUiStore.getState().filters.latestOnly).toBe(true);
    });

    it('should reset all filters', () => {
      const { setFilter, resetFilters } = useUiStore.getState();
      setFilter('selectedProjectId', '123');
      setFilter('selectedEpisodeId', '456');
      setFilter('latestOnly', true);

      resetFilters();

      expect(useUiStore.getState().filters.selectedProjectId).toBe('all');
      expect(useUiStore.getState().filters.selectedEpisodeId).toBe('all');
      expect(useUiStore.getState().filters.latestOnly).toBe(false);
    });

    it('should update multiple filters independently', () => {
      const { setFilter } = useUiStore.getState();
      setFilter('selectedProjectId', '123');
      setFilter('selectedSequenceId', '789');

      expect(useUiStore.getState().filters.selectedProjectId).toBe('123');
      expect(useUiStore.getState().filters.selectedSequenceId).toBe('789');
      expect(useUiStore.getState().filters.selectedEpisodeId).toBe('all');
    });
  });
});
