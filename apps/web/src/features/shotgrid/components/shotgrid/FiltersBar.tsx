import React from 'react';
import type { Project, Episode, Asset, Sequence, Shot, TabType } from '@shogun/shared';
import { useUiStore } from '@app/stores/uiStore';

export interface FiltersBarProps {
  activeTab: TabType;
  projects: Project[];
  episodes: Episode[];
  assets: Asset[];
  sequences: Sequence[];
  shots: Shot[];
  selectedProjectId: string;
  selectedEpisodeId: string;
  selectedAssetId: string;
  selectedSequenceId: string;
  selectedShotId: string;
  selectedFormat: string;
  onProjectChange: (value: string) => void;
  onEpisodeChange: (value: string) => void;
  onAssetChange: (value: string) => void;
  onSequenceChange: (value: string) => void;
  onShotChange: (value: string) => void;
  onFormatChange: (value: string) => void;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  activeTab,
  projects,
  episodes,
  assets,
  sequences,
  shots,
  selectedProjectId,
  selectedEpisodeId,
  selectedAssetId,
  selectedSequenceId,
  selectedShotId,
  selectedFormat,
  onProjectChange,
  onEpisodeChange,
  onAssetChange,
  onSequenceChange,
  onShotChange,
  onFormatChange,
}) => {
  const { filters: uiFilters, setFilter } = useUiStore();

  const handleProjectChange = (value: string) => {
    onProjectChange(value);
    onEpisodeChange('all');
    onAssetChange('all');
    onSequenceChange('all');
    onShotChange('all');
    onFormatChange('all');
    setFilter('selectedEntityType', 'all');
  };

  // Filter data based on selections
  const filteredEpisodes = episodes.filter((ep) => {
    // Always filter by project if selected
    if (selectedProjectId !== 'all' && String(ep.projectId) !== selectedProjectId) {
      return false;
    }

    // For versions tab, only show episodes that have versions through shots
    // NOTE: This checks for shots, not actual versions, because versions are loaded
    // dynamically by VersionsTabWrapper based on selected filters. This is intentional
    // to provide a reasonable filter list without requiring all versions to be loaded upfront.
    if (activeTab === 'versions') {
      // Find sequences for this episode
      const episodeSequences = sequences.filter((seq) => seq.episodeId === ep.id);

      // Check if any of these sequences have shots (which may have versions)
      // VersionsTabWrapper will handle the actual version filtering
      return episodeSequences.some((sequence) => {
        const sequenceShots = shots.filter(
          // Fixed Bug #9: Compare IDs instead of codes for correct filtering
          (shot) => shot.sequenceId === sequence.id,
        );
        return sequenceShots.length > 0;
      });
    }

    // For notes tab, show all episodes (no additional filtering needed)
    if (activeTab === 'notes') {
      return true;
    }

    return true;
  });

  const filteredAssets = assets.filter(
    (asset) => selectedProjectId === 'all' || String(asset.projectId) === selectedProjectId,
  );
  const filteredSequences = sequences.filter((sequence) => {
    // Filter by episode if selected
    if (selectedEpisodeId !== 'all' && String(sequence.episodeId) !== selectedEpisodeId) {
      return false;
    }

    // For versions tab, only show sequences that have shots (which may have versions)
    // NOTE: This checks for shots, not actual versions, because versions are loaded
    // dynamically by VersionsTabWrapper. This is intentional to provide a reasonable
    // filter list without requiring all versions to be loaded upfront.
    if (activeTab === 'versions') {
      const sequenceShots = shots.filter(
        // Fixed Bug #9: Compare IDs instead of codes for correct filtering
        (shot) => shot.sequenceId === sequence.id,
      );
      return sequenceShots.length > 0;
    }

    // For notes tab, show all sequences (no additional filtering needed)
    if (activeTab === 'notes') {
      return true;
    }

    return true;
  });
  const filteredShots = shots.filter((shot) => {
    // Filter by sequence if selected
    if (selectedSequenceId !== 'all' && String(shot.sequenceId) !== selectedSequenceId) {
      return false;
    }

    // Filter by episode if selected
    if (selectedEpisodeId !== 'all') {
      const sequence = sequences.find((s) => s.id === shot.sequenceId);
      if (!sequence || String(sequence.episodeId) !== selectedEpisodeId) {
        return false;
      }
    }

    // For versions tab, only show shots that have versions
    if (activeTab === 'versions') {
      // This will be handled by the VersionsTabWrapper component
      // which loads versions based on shotId
      return true;
    }

    return true;
  });

  // Determine which filters to show based on active tab
  const getVisibleFilters = () => {
    const filters = [];

    // Project filter - always show
    filters.push(
      <div key="project" className="flex items-center space-x-2">
        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
          Project:
        </span>
        <select
          value={selectedProjectId}
          onChange={(e) => handleProjectChange(e.target.value)}
          className="select-primary px-2 py-1 text-sm min-w-0"
        >
          <option value="all">All</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.code}
            </option>
          ))}
        </select>
      </div>,
    );

    // Episode filter - show for episodes, sequences, shots, versions, playlists
    if (['episodes', 'sequences', 'shots', 'versions', 'playlists'].includes(activeTab)) {
      filters.push(
        <div
          key="episode"
          className="flex items-center space-x-2"
          style={{ position: 'relative', zIndex: 1000 }}
        >
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
            Episode:
          </span>
          <select
            value={selectedEpisodeId}
            onChange={(e) => onEpisodeChange(e.target.value)}
            className="select-primary px-2 py-1 text-sm min-w-0"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
              minHeight: '32px',
              zIndex: 1000,
            }}
          >
            <option
              value="all"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                padding: '8px',
              }}
            >
              All
            </option>
            {filteredEpisodes.map((episode) => (
              <option
                key={episode.code}
                value={String(episode.id)}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  padding: '8px',
                }}
              >
                {episode.code}
              </option>
            ))}
          </select>
        </div>,
      );
    }

    // Asset filter - show for assets
    if (activeTab === 'assets') {
      filters.push(
        <div key="asset" className="flex items-center space-x-2">
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
            Asset:
          </span>
          <select
            value={selectedAssetId}
            onChange={(e) => onAssetChange(e.target.value)}
            className="select-primary px-2 py-1 text-sm min-w-0"
          >
            <option value="all">All</option>
            {filteredAssets.map((asset) => (
              <option key={asset.code} value={asset.code}>
                {asset.code}
              </option>
            ))}
          </select>
        </div>,
      );
    }

    // Sequence filter - show for sequences, shots, versions, playlists
    if (['sequences', 'shots', 'versions', 'playlists'].includes(activeTab)) {
      filters.push(
        <div key="sequence" className="flex items-center space-x-2">
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
            Sequence:
          </span>
          <select
            value={selectedSequenceId}
            onChange={(e) => onSequenceChange(e.target.value)}
            className="select-primary px-2 py-1 text-sm min-w-0"
          >
            <option value="all">All</option>
            {filteredSequences.map((sequence) => (
              <option key={sequence.id} value={String(sequence.id)}>
                {sequence.code}
              </option>
            ))}
          </select>
        </div>,
      );
    }

    // Shot filter - show for shots, versions
    if (['shots', 'versions'].includes(activeTab)) {
      filters.push(
        <div key="shot" className="flex items-center space-x-2">
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
            Shot:
          </span>
          <select
            value={selectedShotId}
            onChange={(e) => onShotChange(e.target.value)}
            className="select-primary px-2 py-1 text-sm min-w-0"
          >
            <option value="all">All</option>
            {filteredShots.map((shot) => (
              <option key={shot.code} value={String(shot.id)}>
                {shot.code}
              </option>
            ))}
          </select>
        </div>,
      );
    }

    // Entity type filter - show for notes
    if (activeTab === 'notes') {
      filters.push(
        <div key="entityType" className="flex items-center space-x-2">
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
            Entity Type:
          </span>
          <select
            value={uiFilters.selectedEntityType || 'all'}
            onChange={(e) => setFilter('selectedEntityType', e.target.value)}
            className="select-primary px-2 py-1 text-sm min-w-0"
          >
            <option value="all">All</option>
            <option value="Project">Project</option>
            <option value="Episode">Episode</option>
            <option value="Sequence">Sequence</option>
            <option value="Shot">Shot</option>
            <option value="Asset">Asset</option>
            <option value="Playlist">Playlist</option>
            <option value="Version">Version</option>
          </select>
        </div>,
      );
    }

    // Format filter - show for versions
    if (['versions'].includes(activeTab)) {
      filters.push(
        <div key="format" className="flex items-center space-x-2">
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
            Format:
          </span>
          <select
            value={selectedFormat}
            onChange={(e) => onFormatChange(e.target.value)}
            className="select-primary px-2 py-1 text-sm min-w-0"
          >
            <option value="all">All</option>
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
            <option value="custom">Custom</option>
          </select>
        </div>,
      );
    }

    return filters;
  };

  return (
    <div
      className="px-6 py-2 filters"
      data-testid="filters"
      style={{
        backgroundColor: 'var(--bg-tertiary)',
        borderBottom: '1px solid var(--border-primary)',
      }}
    >
      <div className="flex items-center gap-4 text-sm flex-wrap">{getVisibleFilters()}</div>
    </div>
  );
};
