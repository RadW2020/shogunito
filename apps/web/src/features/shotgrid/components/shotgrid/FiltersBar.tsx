import React from 'react';
import type { Project, Episode, Asset, Sequence, TabType } from '@shogunito/shared';
import { useUiStore } from '@app/stores/uiStore';

export interface FiltersBarProps {
  activeTab: TabType;
  projects: Project[];
  episodes: Episode[];
  assets: Asset[];
  sequences: Sequence[];
  selectedProjectId: string;
  selectedEpisodeId: string;
  selectedAssetId: string;
  selectedSequenceId: string;
  selectedFormat: string;
  onProjectChange: (value: string) => void;
  onEpisodeChange: (value: string) => void;
  onAssetChange: (value: string) => void;
  onSequenceChange: (value: string) => void;
  onFormatChange: (value: string) => void;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  activeTab,
  projects,
  episodes,
  assets,
  sequences,
  selectedProjectId,
  selectedEpisodeId,
  selectedAssetId,
  selectedSequenceId,
  selectedFormat,
  onProjectChange,
  onEpisodeChange,
  onAssetChange,
  onSequenceChange,
  onFormatChange,
}) => {
  const { filters: uiFilters, setFilter } = useUiStore();

  const handleProjectChange = (value: string) => {
    onProjectChange(value);
    onEpisodeChange('all');
    onAssetChange('all');
    onSequenceChange('all');
    onFormatChange('all');
    setFilter('selectedEntityType', 'all');
  };

  // Filter data based on selections
  const filteredEpisodes = episodes.filter((ep) => {
    // Always filter by project if selected
    if (selectedProjectId !== 'all' && String(ep.projectId) !== selectedProjectId) {
      return false;
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

    // Episode filter - show for episodes, sequences, versions
    if (['episodes', 'sequences', 'versions'].includes(activeTab)) {
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

    // Sequence filter - show for sequences, versions
    if (['sequences', 'versions'].includes(activeTab)) {
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

    // Entity type filter - show for notes or versions
    if (['notes', 'versions'].includes(activeTab)) {
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
            <option value="Asset">Asset</option>
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
