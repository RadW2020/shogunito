import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShotGridDetailPanel } from '../ShotGridDetailPanel';
import type { TabType } from '@shogun/shared';
import type { ApiVersion } from '@shared/api/client';

// Mock JsonViewer
vi.mock('@shared/components/JsonViewer', () => ({
  JsonViewer: ({ data }: { data: any }) => (
    <div data-testid="json-viewer">{JSON.stringify(data)}</div>
  ),
}));

describe('ShotGridDetailPanel', () => {
  const defaultProps = {
    showDetailPanel: true,
    selectedDetail: {
      type: 'projects' as TabType,
      item: { id: 1, name: 'Test Project', code: 'PROJ-001' },
    },
    onClose: vi.fn(),
    apiShots: [],
    apiSequences: [],
    apiEpisodes: [],
    apiProjects: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when showDetailPanel is false', () => {
      render(<ShotGridDetailPanel {...defaultProps} showDetailPanel={false} />);
      expect(screen.queryByTestId('detail-panel')).not.toBeInTheDocument();
    });

    it('should not render when selectedDetail is null', () => {
      render(<ShotGridDetailPanel {...defaultProps} selectedDetail={null} />);
      expect(screen.queryByTestId('detail-panel')).not.toBeInTheDocument();
    });

    it('should render when showDetailPanel is true and selectedDetail exists', () => {
      render(<ShotGridDetailPanel {...defaultProps} />);
      expect(screen.getByTestId('detail-panel')).toBeInTheDocument();
    });

    it('should display item name in header', () => {
      render(<ShotGridDetailPanel {...defaultProps} />);
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    it('should display item code when name is not available', () => {
      render(
        <ShotGridDetailPanel
          {...defaultProps}
          selectedDetail={{
            type: 'projects' as TabType,
            item: { id: 1, code: 'PROJ-001' },
          }}
        />,
      );
      expect(screen.getByText('PROJ-001')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<ShotGridDetailPanel {...defaultProps} />);
      const closeButton = screen.getByLabelText('Close detail panel');
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<ShotGridDetailPanel {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close detail panel');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Version hierarchy', () => {
    it('should build hierarchy for version with shot', () => {
      const apiShots = [
        {
          id: 1,
          code: 'SHOT-001',
          name: 'Test Shot',
          sequence: { code: 'SEQ-001' },
        },
      ];

      const apiSequences = [
        {
          id: 1,
          code: 'SEQ-001',
          name: 'Test Sequence',
          episodeId: 1,
        },
      ];

      const apiEpisodes = [
        {
          id: 1,
          code: 'EP-001',
          name: 'Test Episode',
          projectId: 1,
        },
      ];

      const apiProjects = [
        {
          id: 1,
          code: 'PROJ-001',
          name: 'Test Project',
        },
      ];

      const version: ApiVersion = {
        id: 1,
        code: 'VER-001',
        entityCode: 'SHOT-001',
        entityType: 'shot',
      } as ApiVersion;

      render(
        <ShotGridDetailPanel
          {...defaultProps}
          selectedDetail={{
            type: 'versions' as TabType,
            item: version,
          }}
          apiShots={apiShots}
          apiSequences={apiSequences}
          apiEpisodes={apiEpisodes}
          apiProjects={apiProjects}
        />,
      );

      expect(screen.getByTestId('json-viewer')).toBeInTheDocument();
    });

    it('should handle version without matching shot', () => {
      const version: ApiVersion = {
        id: 1,
        code: 'VER-001',
        entityCode: 'SHOT-999',
        entityType: 'shot',
      } as ApiVersion;

      render(
        <ShotGridDetailPanel
          {...defaultProps}
          selectedDetail={{
            type: 'versions' as TabType,
            item: version,
          }}
          apiShots={[]}
          apiSequences={[]}
          apiEpisodes={[]}
          apiProjects={[]}
        />,
      );

      expect(screen.getByTestId('json-viewer')).toBeInTheDocument();
    });

    it('should handle version with incomplete hierarchy', () => {
      const apiShots = [
        {
          id: 1,
          code: 'SHOT-001',
          name: 'Test Shot',
          sequence: { code: 'SEQ-001' },
        },
      ];

      const apiSequences = [
        {
          id: 1,
          code: 'SEQ-001',
          name: 'Test Sequence',
          episodeId: null,
        },
      ];

      render(
        <ShotGridDetailPanel
          {...defaultProps}
          selectedDetail={{
            type: 'versions' as TabType,
            item: {
              id: 1,
              code: 'VER-001',
              entityCode: 'SHOT-001',
              entityType: 'shot',
            } as ApiVersion,
          }}
          apiShots={apiShots}
          apiSequences={apiSequences}
          apiEpisodes={[]}
          apiProjects={[]}
        />,
      );

      expect(screen.getByTestId('json-viewer')).toBeInTheDocument();
    });

    it('should handle version without entityCode', () => {
      const version: ApiVersion = {
        id: 1,
        code: 'VER-001',
        entityType: 'shot',
      } as ApiVersion;

      render(
        <ShotGridDetailPanel
          {...defaultProps}
          selectedDetail={{
            type: 'versions' as TabType,
            item: version,
          }}
          apiShots={[]}
          apiSequences={[]}
          apiEpisodes={[]}
          apiProjects={[]}
        />,
      );

      expect(screen.getByTestId('json-viewer')).toBeInTheDocument();
    });
  });

  describe('Non-version items', () => {
    it('should render project item without hierarchy', () => {
      render(
        <ShotGridDetailPanel
          {...defaultProps}
          selectedDetail={{
            type: 'projects' as TabType,
            item: { id: 1, name: 'Test Project', code: 'PROJ-001' },
          }}
        />,
      );

      expect(screen.getByTestId('json-viewer')).toBeInTheDocument();
    });

    it('should render episode item', () => {
      render(
        <ShotGridDetailPanel
          {...defaultProps}
          selectedDetail={{
            type: 'episodes' as TabType,
            item: { id: 1, name: 'Test Episode', code: 'EP-001' },
          }}
        />,
      );

      expect(screen.getByTestId('json-viewer')).toBeInTheDocument();
    });
  });
});

