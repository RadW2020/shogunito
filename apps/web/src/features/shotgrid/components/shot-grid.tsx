import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { TabType } from '@shogunito/shared';
import { FiltersBar } from './shotgrid/FiltersBar';
import { Toolbar } from './shotgrid/Toolbar';
import { ShotGridTabs } from './shotgrid/ShotGridTabs';
import { ShotGridContent } from './shotgrid/ShotGridContent';
import { ShotGridDetailPanel } from './shotgrid/ShotGridDetailPanel';
import { ShotGridModals } from './shotgrid/ShotGridModals';
import { useStatusHelper } from './shotgrid/hooks/useStatusHelper';
import { useShotGridData } from './shotgrid/hooks/useShotGridData';
import { useShotGridModals } from './shotgrid/hooks/useShotGridModals';
import { useShotGridSelection } from './shotgrid/hooks/useShotGridSelection';
import { createEditHandlers, createAddNoteHandlers } from './shotgrid/utils/tabHandlers';
import { handleDeleteSelected as deleteSelectedItems } from './shotgrid/utils/deleteHandlers';
import { createAddClickHandler } from './shotgrid/utils/modalHandlers';
// Tab wrappers are now used in ShotGridContent component
import { useDeleteSequence } from '@features/sequences/api/useSequences';
import { useUiStore } from '@app/stores/uiStore';
// Modals are now handled by ShotGridModals component

export function ShotGrid() {
  // UI Store
  const {
    activeTab,
    showFilters,
    selectedItems,
    showDetailPanel,
    selectedDetail,
    viewModes,
    filters,
    setActiveTab,
    toggleFilters,
    setSelectedItems,
    setSelectedDetail,
    setViewMode,
    setFilter,
  } = useUiStore();

  // Custom hooks for data, modals, and selection
  const {
    projects: apiProjects,
    episodes: apiEpisodes,
    assets: apiAssets,
    sequences: apiSequences,
    versions: apiVersions,
    statuses: apiStatuses,
    users: apiUsers,
    isRefreshing,
    lastRefreshTime,
    refreshData,
  } = useShotGridData();

  const modals = useShotGridModals();

  const { handleItemSelect, handleSelectAll } = useShotGridSelection({
    selectedItems,
    setSelectedItems,
  });

  // Local state
  const [searchTerm, setSearchTerm] = useState('');

  // Hook para manejo de status
  const { statusMap } = useStatusHelper(apiStatuses);

  // Hooks para mutaciones
  const deleteSequenceMutation = useDeleteSequence();

  // Modals are now managed by useShotGridModals hook

  // Función para cambiar pestaña - memoized para evitar recreación en cada render
  const handleTabChange = useCallback(
    (tabId: TabType) => {
      setActiveTab(tabId);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tabId);
        window.history.replaceState({}, '', url.toString());
      }
    },
    [setActiveTab],
  );

  // refreshData is now provided by useShotGridData hook

  // Delete handler using consolidated utility function
  const handleDeleteSelected = async () => {
    await deleteSelectedItems({
      activeTab,
      selectedItems,
      queryClient,
      deleteSequenceMutation,
      onSuccess: refreshData,
      onClearSelection: () => setSelectedItems(new Set()),
    });
  };

  // Data getters are now provided directly from useShotGridData hook
  // Using apiProjects, apiEpisodes, etc. directly

  // Selection handlers are now provided by useShotGridSelection hook
  // Memoized to prevent recreation on every render
  const openDetailPanel = useCallback(
    (type: TabType, item: { id: string | number; name?: string; code?: string }) => {
      setSelectedDetail({ type, item });
    },
    [setSelectedDetail],
  );

  // Create handlers using factory functions
  const editHandlers = createEditHandlers(modals);
  const addNoteHandlers = createAddNoteHandlers(modals);

  // Handler for viewing notes - memoized to prevent recreation on every render
  const handleViewNotes = useCallback(
    (linkId: string, linkType: string, linkName: string) => {
      console.log('handleViewNotes called:', { linkId, linkType, linkName });
      modals.setViewingNotesFor({ linkId, linkType, linkName });
    },
    [modals],
  );

  // Add click handler using factory function
  const handleAddClick = createAddClickHandler(activeTab, modals);

  // Memoized handlers to prevent recreation on every render
  const handleCloseDetailPanel = useCallback(() => setSelectedDetail(null), [setSelectedDetail]);
  const handleClearSearch = useCallback(() => setSearchTerm(''), []);

  // Data loading is now handled by useShotGridData hook

  // Force refetch when activeTab changes to ensure fresh data
  const queryClient = useQueryClient();

  // Memoize tab to query key mapping to avoid recreation
  const tabToQueryKey = useMemo(
    () => ({
      projects: 'projects',
      episodes: 'episodes',
      sequences: 'sequences',
      assets: 'assets',
      versions: 'versions',
    }),
    [],
  );

  useEffect(() => {
    const queryKey = tabToQueryKey[activeTab as keyof typeof tabToQueryKey];
    if (queryKey) {
      // Force refetch for the active tab (refreshData already invalidates all)
      queryClient.refetchQueries({
        queryKey: [queryKey],
        type: 'active',
      });
    }
  }, [activeTab, queryClient, tabToQueryKey]);

  // Tab content rendering is now handled by ShotGridContent component

  return (
    <div
      className="h-screen flex flex-col relative"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Tabs */}
      <ShotGridTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Toolbar */}
      <Toolbar
        activeTab={activeTab}
        selectedItems={selectedItems}
        isRefreshing={isRefreshing}
        lastRefreshTime={lastRefreshTime}
        showFilters={showFilters}
        versionsViewMode={viewModes.versions}
        selectedVersionStatus={filters.selectedVersionStatus}
        latestOnly={filters.latestOnly}
        searchTerm={searchTerm}
        onAddClick={handleAddClick}
        onDeleteSelected={handleDeleteSelected}
        onRefresh={refreshData}
        onToggleFilters={toggleFilters}
        onVersionsViewModeChange={
          activeTab === 'versions' ? (mode) => setViewMode('versions', mode) : undefined
        }
        onVersionStatusChange={
          activeTab === 'versions'
            ? (status) => setFilter('selectedVersionStatus', status)
            : undefined
        }
        onLatestOnlyChange={
          activeTab === 'versions' ? (latest) => setFilter('latestOnly', latest) : undefined
        }
        onSearchChange={setSearchTerm}
      />

      {/* Filters */}
      {showFilters && (
        <FiltersBar
          activeTab={activeTab}
          projects={apiProjects}
          episodes={apiEpisodes}
          assets={apiAssets}
          sequences={apiSequences}
          selectedProjectId={filters.selectedProjectId}
          selectedEpisodeId={filters.selectedEpisodeId}
          selectedAssetId={filters.selectedAssetId}
          selectedSequenceId={filters.selectedSequenceId}
          selectedFormat={filters.selectedFormat}
          onProjectChange={(id) => setFilter('selectedProjectId', id)}
          onEpisodeChange={(id) => setFilter('selectedEpisodeId', id)}
          onAssetChange={(id) => setFilter('selectedAssetId', id)}
          onSequenceChange={(id) => setFilter('selectedSequenceId', id)}
          onFormatChange={(format) => setFilter('selectedFormat', format)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div
          className={`${showDetailPanel ? 'lg:w-2/3' : 'w-full'} transition-all duration-300 overflow-auto p-3 sm:p-6 content`}
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <ShotGridContent
            activeTab={activeTab}
            statusMap={statusMap}
            selectedItems={selectedItems}
            searchTerm={searchTerm}
            onItemSelect={handleItemSelect}
            onSelectAll={handleSelectAll}
            onItemClick={openDetailPanel}
            onEditProject={editHandlers.handleEditProject}
            onEditEpisode={editHandlers.handleEditEpisode}
            onEditAsset={editHandlers.handleEditAsset}
            onEditSequence={editHandlers.handleEditSequence}
            onEditVersion={editHandlers.handleEditVersion}
            onEditStatus={editHandlers.handleEditStatus}
            onAddNoteToProject={addNoteHandlers.handleAddNoteToProject}
            onAddNoteToEpisode={addNoteHandlers.handleAddNoteToEpisode}
            onAddNoteToAsset={addNoteHandlers.handleAddNoteToAsset}
            onAddNoteToSequence={addNoteHandlers.handleAddNoteToSequence}
            onAddNoteToVersion={addNoteHandlers.handleAddNoteToVersion}
            onViewNotes={handleViewNotes}
            onRefresh={refreshData}
            onClearSearch={handleClearSearch}
            projects={apiProjects}
            episodes={apiEpisodes}
            assets={apiAssets}
            sequences={apiSequences}
            versions={apiVersions}
            statuses={apiStatuses}
            users={apiUsers}
          />
        </div>

        {/* Detail Panel */}
        <ShotGridDetailPanel
          showDetailPanel={showDetailPanel}
          selectedDetail={selectedDetail}
          onClose={handleCloseDetailPanel}
          apiSequences={apiSequences}
          apiEpisodes={apiEpisodes}
          apiProjects={apiProjects}
        />
      </div>

      {/* Modals */}
      <ShotGridModals
        modals={modals}
        onRefresh={refreshData}
        projects={apiProjects}
        episodes={apiEpisodes}
        assets={apiAssets}
        sequences={apiSequences}
        versions={apiVersions}
        statuses={apiStatuses}
      />
    </div>
  );
}
