import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TabType } from '@shogun/shared';

interface ViewMode {
  versions: 'table' | 'thumbnails';
}

interface FilterState {
  selectedProjectId: string;
  selectedEpisodeId: string;
  selectedAssetId: string;
  selectedSequenceId: string;
  selectedFormat: string;
  selectedVersionStatus: string;
  selectedEntityType: string;
  latestOnly: boolean;
}

interface UiState {
  // Tab and navigation
  activeTab: TabType;
  showFilters: boolean;
  showDetailPanel: boolean;

  // Selection
  selectedItems: Set<string>;

  // View modes
  viewModes: ViewMode;

  // Filters
  filters: FilterState;

  // Detail panel
  selectedDetail: {
    type: TabType;
    item: any;
  } | null;

  // Actions
  setActiveTab: (tab: TabType) => void;
  setShowFilters: (show: boolean) => void;
  toggleFilters: () => void;
  setShowDetailPanel: (show: boolean) => void;
  setSelectedItems: (items: Set<string>) => void;
  clearSelectedItems: () => void;
  addSelectedItem: (id: string) => void;
  removeSelectedItem: (id: string) => void;
  setViewMode: (tab: keyof ViewMode, mode: ViewMode[keyof ViewMode]) => void;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  setSelectedDetail: (detail: { type: TabType; item: any } | null) => void;
}

const initialFilters: FilterState = {
  selectedProjectId: 'all',
  selectedEpisodeId: 'all',
  selectedAssetId: 'all',
  selectedSequenceId: 'all',
  selectedFormat: 'all',
  selectedVersionStatus: 'all',
  selectedEntityType: 'all',
  latestOnly: false,
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      // Initial state
      activeTab: 'projects',
      showFilters: false,
      showDetailPanel: false,
      selectedItems: new Set<string>(),
      viewModes: {
        versions: 'table',
      },
      filters: initialFilters,
      selectedDetail: null,

      // Actions
      setActiveTab: (tab) => {
        set({ activeTab: tab });
        // Update URL to reflect tab change
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('tab', tab);
          window.history.replaceState({}, '', url.toString());
        }
      },

      setShowFilters: (show) => set({ showFilters: show }),
      toggleFilters: () => set((state) => ({ showFilters: !state.showFilters })),
      setShowDetailPanel: (show) => set({ showDetailPanel: show }),

      setSelectedItems: (items) => set({ selectedItems: items }),
      clearSelectedItems: () => set({ selectedItems: new Set<string>() }),

      addSelectedItem: (id) =>
        set((state) => ({
          selectedItems: new Set([...state.selectedItems, id]),
        })),

      removeSelectedItem: (id) =>
        set((state) => {
          const newItems = new Set(state.selectedItems);
          newItems.delete(id);
          return { selectedItems: newItems };
        }),

      setViewMode: (tab, mode) =>
        set((state) => ({
          viewModes: { ...state.viewModes, [tab]: mode },
        })),

      setFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        })),

      resetFilters: () => set({ filters: initialFilters }),

      setSelectedDetail: (detail) =>
        set({
          selectedDetail: detail,
          showDetailPanel: detail !== null,
        }),
    }),
    {
      name: 'shogun-ui-state',
      partialize: (state) => ({
        activeTab: state.activeTab,
        viewModes: state.viewModes,
        filters: state.filters,
      }),
    },
  ),
);
