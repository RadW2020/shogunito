import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FiltersBar, type FiltersBarProps } from '../FiltersBar';
import { useUiStore } from '@app/stores/uiStore';
import type { TabType, Project, Episode, Sequence, Shot } from '@shogun/shared';

// Mock the store
vi.mock('@app/stores/uiStore', () => ({
  useUiStore: vi.fn(),
}));

describe('FiltersBar', () => {
  const mockProjects = [
    {
      id: 1,
      code: 'PRJ001',
      name: 'Project 1',
      status: 'active' as const,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 2,
      code: 'PRJ002',
      name: 'Project 2',
      status: 'active' as const,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  const mockEpisodes = [
    { id: 1, code: 'EP001', name: 'Episode 1', projectId: 1 },
    { id: 2, code: 'EP002', name: 'Episode 2', projectId: 1 },
    { id: 3, code: 'EP003', name: 'Episode 3', projectId: 2 },
  ];

  const mockSequences = [
    { id: 1, code: 'SEQ001', name: 'Sequence 1', episodeId: 1 },
    { id: 2, code: 'SEQ002', name: 'Sequence 2', episodeId: 1 },
  ];

  const mockShots = [
    {
      id: 1,
      code: 'SH001',
      name: 'Shot 1',
      sequenceId: 1,
      sequence: { code: 'SEQ001' },
    },
    {
      id: 2,
      code: 'SH002',
      name: 'Shot 2',
      sequenceId: 1,
      sequence: { code: 'SEQ001' },
    },
  ];

  const defaultProps: FiltersBarProps = {
    activeTab: 'projects' as TabType,
    projects: mockProjects as Project[],
    episodes: mockEpisodes as Episode[],
    assets: [],
    sequences: mockSequences as Sequence[],
    shots: mockShots as Shot[],
    selectedProjectId: 'all',
    selectedEpisodeId: 'all',
    selectedAssetId: 'all',
    selectedSequenceId: 'all',
    selectedShotId: 'all',
    selectedFormat: 'all',
    onProjectChange: vi.fn() as (value: string) => void,
    onEpisodeChange: vi.fn() as (value: string) => void,
    onAssetChange: vi.fn() as (value: string) => void,
    onSequenceChange: vi.fn() as (value: string) => void,
    onShotChange: vi.fn() as (value: string) => void,
    onFormatChange: vi.fn() as (value: string) => void,
  };

  beforeEach(() => {
    vi.mocked(useUiStore).mockReturnValue({
      filters: {
        selectedEntityType: 'all',
      },
      setFilter: vi.fn(),
    } as any);
  });

  describe('Project filter', () => {
    it('should always show project filter', () => {
      render(<FiltersBar {...defaultProps} />);
      expect(screen.getByText('Project:')).toBeInTheDocument();
    });

    it('should call onProjectChange when project is selected', async () => {
      const user = userEvent.setup();
      const onProjectChange = vi.fn();
      render(<FiltersBar {...defaultProps} onProjectChange={onProjectChange} />);

      // Find select by finding the "Project:" text and getting the next select
      const projectLabel = screen.getByText('Project:');
      const projectSelect = projectLabel.parentElement?.querySelector('select');
      expect(projectSelect).toBeInTheDocument();

      if (projectSelect) {
        await user.selectOptions(projectSelect, '1');
        expect(onProjectChange).toHaveBeenCalledWith('1');
      }
    });

    it('should reset all filters when project changes', async () => {
      const user = userEvent.setup();
      const onEpisodeChange = vi.fn();
      const onSequenceChange = vi.fn();
      const onShotChange = vi.fn();
      const onFormatChange = vi.fn();
      const setFilter = vi.fn();

      vi.mocked(useUiStore).mockReturnValue({
        filters: { selectedEntityType: 'all' },
        setFilter,
      } as any);

      render(
        <FiltersBar
          {...defaultProps}
          onEpisodeChange={onEpisodeChange}
          onSequenceChange={onSequenceChange}
          onShotChange={onShotChange}
          onFormatChange={onFormatChange}
        />,
      );

      const projectLabel = screen.getByText('Project:');
      const projectSelect = projectLabel.parentElement?.querySelector('select');
      expect(projectSelect).toBeInTheDocument();

      if (projectSelect) {
        await user.selectOptions(projectSelect, '1');
      }

      expect(onEpisodeChange).toHaveBeenCalledWith('all');
      expect(onSequenceChange).toHaveBeenCalledWith('all');
      expect(onShotChange).toHaveBeenCalledWith('all');
      expect(onFormatChange).toHaveBeenCalledWith('all');
      expect(setFilter).toHaveBeenCalledWith('selectedEntityType', 'all');
    });
  });

  describe('Episode filter', () => {
    it('should show episode filter for episodes tab', () => {
      render(<FiltersBar {...defaultProps} activeTab="episodes" />);
      expect(screen.getByText('Episode:')).toBeInTheDocument();
    });

    it('should show episode filter for sequences tab', () => {
      render(<FiltersBar {...defaultProps} activeTab="sequences" />);
      expect(screen.getByText('Episode:')).toBeInTheDocument();
    });

    it('should show episode filter for shots tab', () => {
      render(<FiltersBar {...defaultProps} activeTab="shots" />);
      expect(screen.getByText('Episode:')).toBeInTheDocument();
    });

    it('should not show episode filter for projects tab', () => {
      render(<FiltersBar {...defaultProps} activeTab="projects" />);
      expect(screen.queryByText('Episode:')).not.toBeInTheDocument();
    });

    it('should filter episodes by selected project', () => {
      render(<FiltersBar {...defaultProps} activeTab="episodes" selectedProjectId="1" />);

      const episodeLabel = screen.getByText('Episode:');
      const episodeSelect = episodeLabel.parentElement?.querySelector('select');
      expect(episodeSelect).toBeInTheDocument();

      const options = episodeSelect
        ? Array.from(episodeSelect.querySelectorAll('option')).map((opt) => opt.textContent)
        : [];

      // Should only show episodes from project 1
      expect(options).toContain('EP001');
      expect(options).toContain('EP002');
      expect(options).not.toContain('EP003');
    });

    it('should use episode id as value for consistent filtering', () => {
      // Fixed: Episode filter now uses episode.id (as string) for value
      // This ensures consistency with ShotsTabWrapper and SequencesTabWrapper
      // which compare with episodeId (numeric)
      render(<FiltersBar {...defaultProps} activeTab="episodes" selectedProjectId="1" />);

      const episodeLabel = screen.getByText('Episode:');
      const episodeSelect = episodeLabel.parentElement?.querySelector('select');
      expect(episodeSelect).toBeInTheDocument();

      if (episodeSelect) {
        // Value should be episode.id (string), not episode.code
        const firstEpisodeOption = episodeSelect.querySelector('option[value="1"]');
        expect(firstEpisodeOption).toBeInTheDocument();
        expect(firstEpisodeOption?.textContent).toBe('EP001');
      }
    });
  });

  describe('Sequence filter', () => {
    it('should show sequence filter for sequences tab', () => {
      render(<FiltersBar {...defaultProps} activeTab="sequences" />);
      expect(screen.getByText('Sequence:')).toBeInTheDocument();
    });

    it('should filter sequences by selected episode', () => {
      render(<FiltersBar {...defaultProps} activeTab="sequences" selectedEpisodeId="1" />);

      const sequenceLabel = screen.getByText('Sequence:');
      const sequenceSelect = sequenceLabel.parentElement?.querySelector('select');
      expect(sequenceSelect).toBeInTheDocument();

      const options = sequenceSelect
        ? Array.from(sequenceSelect.querySelectorAll('option')).map((opt) => opt.textContent)
        : [];

      // Should only show sequences from episode 1
      expect(options).toContain('SEQ001');
      expect(options).toContain('SEQ002');
    });
  });

  describe('Shot filter', () => {
    it('should show shot filter for shots tab', () => {
      render(<FiltersBar {...defaultProps} activeTab="shots" />);
      expect(screen.getByText('Shot:')).toBeInTheDocument();
    });

    it('should filter shots by selected sequence', () => {
      render(<FiltersBar {...defaultProps} activeTab="shots" selectedSequenceId="1" />);

      const shotLabel = screen.getByText('Shot:');
      const shotSelect = shotLabel.parentElement?.querySelector('select');
      expect(shotSelect).toBeInTheDocument();

      const options = shotSelect
        ? Array.from(shotSelect.querySelectorAll('option')).map((opt) => opt.textContent)
        : [];

      expect(options).toContain('SH001');
      expect(options).toContain('SH002');
    });
  });

  describe('Format filter', () => {
    it('should show format filter for versions tab', () => {
      render(<FiltersBar {...defaultProps} activeTab="versions" />);
      expect(screen.getByText('Format:')).toBeInTheDocument();
    });

    it('should not show format filter for other tabs', () => {
      render(<FiltersBar {...defaultProps} activeTab="projects" />);
      expect(screen.queryByText('Format:')).not.toBeInTheDocument();
    });
  });

  describe('Entity type filter', () => {
    it('should show entity type filter for notes tab', () => {
      render(<FiltersBar {...defaultProps} activeTab="notes" />);
      expect(screen.getByText('Entity Type:')).toBeInTheDocument();
    });

    it('should call setFilter when entity type changes', async () => {
      const user = userEvent.setup();
      const setFilter = vi.fn();

      vi.mocked(useUiStore).mockReturnValue({
        filters: { selectedEntityType: 'all' },
        setFilter,
      } as any);

      render(<FiltersBar {...defaultProps} activeTab="notes" />);

      const entityTypeLabel = screen.getByText('Entity Type:');
      const entityTypeSelect = entityTypeLabel.parentElement?.querySelector('select');
      expect(entityTypeSelect).toBeInTheDocument();

      if (entityTypeSelect) {
        await user.selectOptions(entityTypeSelect, 'Project');
      }

      expect(setFilter).toHaveBeenCalledWith('selectedEntityType', 'Project');
    });
  });
});
