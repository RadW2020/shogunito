import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SequencesTabWrapper } from '../SequencesTabWrapper';
import { useUiStore } from '@app/stores/uiStore';
import * as useEpisodesModule from '@features/episodes/api/useEpisodes';

// Mock the Zustand store
vi.mock('@app/stores/uiStore', () => ({
  useUiStore: vi.fn(),
}));

// Mock useSequences
const mockUseSequences = vi.fn();
vi.mock('../../api/useSequences', () => ({
  useSequences: () => mockUseSequences(),
}));

// Mock useEpisodes
vi.mock('@features/episodes/api/useEpisodes', () => ({
  useEpisodes: vi.fn(),
}));

// Mock SequencesTab
vi.mock('@features/shotgrid/components/shotgrid/tabs/SequencesTab', () => ({
  SequencesTab: ({ sequences }: any) => (
    <div data-testid="sequences-tab">
      {sequences.map((s: any) => (
        <div key={s.id}>{s.name}</div>
      ))}
    </div>
  ),
}));

// Mock LoadingSpinner and EmptyState
vi.mock('@shared/ui', () => ({
  LoadingSpinner: ({ size }: any) => <div data-testid="loading-spinner">{size}</div>,
  EmptyState: ({ title, description, action }: any) => (
    <div data-testid="empty-state">
      <div>{title}</div>
      <div>{description}</div>
      {action}
    </div>
  ),
}));

describe('SequencesTabWrapper', () => {
  const defaultProps = {
    statusMap: {
      active: { label: 'Active', color: '#00FF00' },
      waiting: { label: 'Waiting', color: '#FF0000' },
    },
    selectedItems: new Set<string>(),
    onItemSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onItemClick: vi.fn(),
    onEditSequence: vi.fn(),
    onAddNoteToSequence: vi.fn(),
    onViewNotes: vi.fn(),
  };

  const mockSequences = [
    {
      id: 1,
      code: 'SEQ001',
      name: 'Sequence One',
      episodeId: 101,
      status: 'waiting',
      cutOrder: 1,
      description: 'First sequence',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      code: 'SEQ002',
      name: 'Sequence Two',
      episodeId: 101,
      status: 'active',
      cutOrder: 2,
      description: 'Second sequence',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      code: 'SEQ003',
      name: 'Sequence Three',
      episodeId: 102,
      status: 'waiting',
      cutOrder: 1,
      description: 'Third sequence',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockEpisodes = [
    {
      id: 101,
      code: 'EP001',
      name: 'Episode One',
      projectId: 1,
      status: 'active',
      epNumber: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 102,
      code: 'EP002',
      name: 'Episode Two',
      projectId: 2,
      status: 'waiting',
      epNumber: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const renderWithQueryClient = (ui: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useUiStore as any).mockReturnValue({
      filters: {
        selectedProjectId: 'all',
        selectedEpisodeId: 'all',
        selectedSequenceId: 'all',
      },
    });
    mockUseSequences.mockReturnValue({
      data: mockSequences,
      isLoading: false,
      error: null,
    });
    (useEpisodesModule.useEpisodes as any).mockReturnValue({
      data: mockEpisodes,
      isLoading: false,
    });
  });

  describe('Basic rendering', () => {
    it('should render SequencesTab with sequences', () => {
      renderWithQueryClient(<SequencesTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('sequences-tab')).toBeInTheDocument();
      expect(screen.getByText('Sequence One')).toBeInTheDocument();
      expect(screen.getByText('Sequence Two')).toBeInTheDocument();
      expect(screen.getByText('Sequence Three')).toBeInTheDocument();
    });

    it('should show loading spinner when loading', () => {
      mockUseSequences.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      });

      renderWithQueryClient(<SequencesTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should show error state when there is an error', () => {
      mockUseSequences.mockReturnValue({
        data: [],
        isLoading: false,
        error: { message: 'Failed to load sequences' },
      });

      renderWithQueryClient(<SequencesTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('Error loading sequences')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter by selected project', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '1',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
        },
      });

      renderWithQueryClient(<SequencesTabWrapper {...defaultProps} />);

      // Only sequences from episodes in project 1 should be shown
      expect(screen.getByText('Sequence One')).toBeInTheDocument();
      expect(screen.getByText('Sequence Two')).toBeInTheDocument();
      expect(screen.queryByText('Sequence Three')).not.toBeInTheDocument();
    });

    it('should filter by selected episode', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: '101',
          selectedSequenceId: 'all',
        },
      });

      renderWithQueryClient(<SequencesTabWrapper {...defaultProps} />);

      // Only sequences from episode 101 should be shown
      expect(screen.getByText('Sequence One')).toBeInTheDocument();
      expect(screen.getByText('Sequence Two')).toBeInTheDocument();
      expect(screen.queryByText('Sequence Three')).not.toBeInTheDocument();
    });

    it('should filter by selected sequence', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'SEQ001',
        },
      });

      renderWithQueryClient(<SequencesTabWrapper {...defaultProps} />);

      // Only sequence with code SEQ001 should be shown
      expect(screen.getByText('Sequence One')).toBeInTheDocument();
      expect(screen.queryByText('Sequence Two')).not.toBeInTheDocument();
      expect(screen.queryByText('Sequence Three')).not.toBeInTheDocument();
    });

    it('should filter by search term', () => {
      renderWithQueryClient(<SequencesTabWrapper {...defaultProps} searchTerm="One" />);

      expect(screen.getByText('Sequence One')).toBeInTheDocument();
      expect(screen.queryByText('Sequence Two')).not.toBeInTheDocument();
      expect(screen.queryByText('Sequence Three')).not.toBeInTheDocument();
    });

    it('should combine multiple filters', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '1',
          selectedEpisodeId: '101',
          selectedSequenceId: 'all',
        },
      });

      renderWithQueryClient(<SequencesTabWrapper {...defaultProps} />);

      // Should show sequences from episode 101 in project 1
      expect(screen.getByText('Sequence One')).toBeInTheDocument();
      expect(screen.getByText('Sequence Two')).toBeInTheDocument();
      expect(screen.queryByText('Sequence Three')).not.toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no sequences match filters', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '999',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
        },
      });

      renderWithQueryClient(<SequencesTabWrapper {...defaultProps} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No sequences found')).toBeInTheDocument();
    });

    it('should show clear filters button when filters are active', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '1',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
        },
      });
      const setFilter = vi.fn();
      (useUiStore.getState as any) = vi.fn(() => ({
        setFilter,
      }));

      mockUseSequences.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<SequencesTabWrapper {...defaultProps} />);

      const clearButton = screen.getByText('Clear filters');
      expect(clearButton).toBeInTheDocument();
    });

    it('should not show clear filters button when no filters are active', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
        },
      });

      mockUseSequences.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<SequencesTabWrapper {...defaultProps} />);

      expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
    });
  });

  describe('Sequence without episode', () => {
    it('should exclude sequences without episodeId when filtering by project', () => {
      const sequencesWithoutEpisode = [
        ...mockSequences,
        {
          id: 4,
          code: 'SEQ004',
          name: 'Sequence Four',
          episodeId: null,
          status: 'waiting',
          cutOrder: 1,
        },
      ];

      mockUseSequences.mockReturnValue({
        data: sequencesWithoutEpisode,
        isLoading: false,
        error: null,
      });

      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '1',
          selectedEpisodeId: 'all',
          selectedSequenceId: 'all',
        },
      });

      renderWithQueryClient(<SequencesTabWrapper {...defaultProps} />);

      // Sequence without episode should not be shown
      expect(screen.queryByText('Sequence Four')).not.toBeInTheDocument();
    });
  });
});
