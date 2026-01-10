import React, { memo, useMemo } from 'react';
import type { TabType } from '@shogun/shared';
import type { ApiVersion } from '@shared/api/client';
import { JsonViewer } from '@shared/components/JsonViewer';

interface ShotGridDetailPanelProps {
  showDetailPanel: boolean;
  selectedDetail: {
    type: TabType;
    item: { id: string | number; name?: string; code?: string };
  } | null;
  onClose: () => void;
  apiShots: Array<{
    id: number;
    code: string;
    name: string;
    sequence?: { code: string };
  }>;
  apiSequences: Array<{
    id: number;
    code: string;
    name: string;
    episodeId?: number;
  }>;
  apiEpisodes: Array<{
    id: number;
    code: string;
    name: string;
    projectId?: number;
  }>;
  apiProjects: Array<{ id: number; code: string; name: string }>;
}

// Memoized component for detail panel content to avoid recalculating hierarchy on every render
const DetailPanelContent: React.FC<{
  selectedDetail: {
    type: TabType;
    item: { id: string | number; name?: string; code?: string };
  };
  apiShots: Array<{
    id: number;
    code: string;
    name: string;
    sequence?: { code: string };
  }>;
  apiSequences: Array<{
    id: number;
    code: string;
    name: string;
    episodeId?: number;
  }>;
  apiEpisodes: Array<{
    id: number;
    code: string;
    name: string;
    projectId?: number;
  }>;
  apiProjects: Array<{ id: number; code: string; name: string }>;
}> = memo(({ selectedDetail, apiShots, apiSequences, apiEpisodes, apiProjects }) => {
  const itemToShow = useMemo(() => {
    let item = selectedDetail.item;

    // Add fromEntity field for versions
    if (selectedDetail.type === 'versions' && (selectedDetail.item as ApiVersion).entityCode) {
      const version = selectedDetail.item as ApiVersion;
      const shot = apiShots.find((s) => s.code === version.entityCode);

      if (shot) {
        const sequence = apiSequences.find((seq) => seq.code === shot.sequence?.code);
        const episode = apiEpisodes.find((ep) => sequence && ep.id === sequence.episodeId);
        const project = apiProjects.find((proj) => episode && proj.id === episode.projectId);

        // Create enhanced shot object with hierarchy
        const enhancedShot = {
          ...shot,
          hierarchy: project
            ? {
                project: {
                  id: project.id,
                  code: project.code,
                  name: project.name,
                  episode: episode
                    ? {
                        code: episode.code,
                        name: episode.name,
                        sequence: sequence
                          ? {
                              code: sequence.code,
                              name: sequence.name,
                              shot: {
                                code: shot.code,
                                name: shot.name,
                              },
                            }
                          : null,
                      }
                    : null,
                },
              }
            : null,
        };

        // Remove duplicate sequence field from shot if it exists
        delete (enhancedShot as any).sequence;

        item = {
          ...version,
          fromEntity: enhancedShot,
        } as any;
      }
    }

    return item;
  }, [selectedDetail, apiShots, apiSequences, apiEpisodes, apiProjects]);

  return (
    <div className="p-4">
      <JsonViewer data={itemToShow} defaultExpanded={true} />
    </div>
  );
});

DetailPanelContent.displayName = 'DetailPanelContent';

/**
 * Component for rendering the detail panel in ShotGrid
 * Memoized to prevent unnecessary re-renders when parent re-renders
 */
export const ShotGridDetailPanel: React.FC<ShotGridDetailPanelProps> = memo(
  ({
    showDetailPanel,
    selectedDetail,
    onClose,
    apiShots,
    apiSequences,
    apiEpisodes,
    apiProjects,
  }) => {
    if (!showDetailPanel || !selectedDetail) {
      return null;
    }

    return (
      <div
        className="lg:w-1/3 overflow-auto border-t lg:border-t-0 lg:border-l max-h-[50vh] lg:max-h-none detail-panel"
        data-testid="detail-panel"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <div
          className="p-4 border-b flex justify-between items-center sticky top-0 z-10"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderBottomColor: 'var(--border-primary)',
          }}
        >
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {selectedDetail.item.name || selectedDetail.item.code}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close detail panel"
          >
            ✕
          </button>
        </div>

        <DetailPanelContent
          selectedDetail={selectedDetail}
          apiShots={apiShots}
          apiSequences={apiSequences}
          apiEpisodes={apiEpisodes}
          apiProjects={apiProjects}
        />
      </div>
    );
  },
);

ShotGridDetailPanel.displayName = 'ShotGridDetailPanel';
