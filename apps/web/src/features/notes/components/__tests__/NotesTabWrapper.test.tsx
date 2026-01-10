import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotesTabWrapper } from '../NotesTabWrapper';
import { useUiStore } from '@app/stores/uiStore';

// Mock the Zustand store
vi.mock('@app/stores/uiStore', () => ({
  useUiStore: vi.fn(),
}));

// Mock useNotes
const mockUseNotes = vi.fn();
vi.mock('../../api/useNotes', () => ({
  useNotes: () => mockUseNotes(),
}));

// Mock NotesTab
vi.mock('@features/shotgrid/components/shotgrid/tabs/NotesTab', () => ({
  NotesTab: ({ notes }: any) => (
    <div data-testid="notes-tab">
      {notes.map((n: any) => (
        <div key={n.id}>{n.subject || n.content}</div>
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

describe('NotesTabWrapper', () => {
  const defaultProps = {
    statusMap: {
      active: { label: 'Active', color: '#00FF00' },
      waiting: { label: 'Waiting', color: '#FF0000' },
    },
    selectedItems: new Set<string>(),
    onItemSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onItemClick: vi.fn(),
    onRefresh: vi.fn(),
    onClearSearch: vi.fn(),
  };

  const mockNotes = [
    {
      id: 1,
      linkId: '1',
      linkType: 'Project',
      subject: 'Note One',
      content: 'Content of note one',
      project: { id: 1, name: 'Project One' },
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      linkId: '2',
      linkType: 'Episode',
      subject: 'Note Two',
      content: 'Content of note two',
      project: { id: 1, name: 'Project One' },
      isRead: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      linkId: '3',
      linkType: 'Project',
      subject: 'Note Three',
      content: 'Content of note three',
      project: { id: 2, name: 'Project Two' },
      isRead: false,
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
        selectedEntityType: 'all',
      },
    });
    mockUseNotes.mockReturnValue({
      data: mockNotes,
      isLoading: false,
      error: null,
    });
  });

  describe('Basic rendering', () => {
    it('should render NotesTab with notes', () => {
      renderWithQueryClient(<NotesTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('notes-tab')).toBeInTheDocument();
      expect(screen.getByText('Note One')).toBeInTheDocument();
      expect(screen.getByText('Note Two')).toBeInTheDocument();
      expect(screen.getByText('Note Three')).toBeInTheDocument();
    });

    it('should show loading spinner when loading', () => {
      mockUseNotes.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      });

      renderWithQueryClient(<NotesTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should show error state when there is an error', () => {
      mockUseNotes.mockReturnValue({
        data: [],
        isLoading: false,
        error: { message: 'Failed to load notes' },
      });

      renderWithQueryClient(<NotesTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('Error loading notes')).toBeInTheDocument();
    });
  });

  describe('Filtering by entity type', () => {
    it('should filter by selected entity type', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedEntityType: 'Project',
        },
      });

      renderWithQueryClient(<NotesTabWrapper {...defaultProps} />);

      // Only notes with linkType 'Project' should be shown
      expect(screen.getByText('Note One')).toBeInTheDocument();
      expect(screen.getByText('Note Three')).toBeInTheDocument();
      expect(screen.queryByText('Note Two')).not.toBeInTheDocument();
    });
  });

  describe('Filtering by project', () => {
    it('should filter by selected project', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '1',
          selectedEntityType: 'all',
        },
      });

      renderWithQueryClient(<NotesTabWrapper {...defaultProps} />);

      // Only notes from project 1 should be shown
      expect(screen.getByText('Note One')).toBeInTheDocument();
      expect(screen.getByText('Note Two')).toBeInTheDocument();
      expect(screen.queryByText('Note Three')).not.toBeInTheDocument();
    });

    it('should handle notes without project data', () => {
      const notesWithoutProject = [
        {
          id: 4,
          linkId: '4',
          linkType: 'Shot',
          subject: 'Note Without Project',
          content: 'Content',
          project: null,
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockUseNotes.mockReturnValue({
        data: notesWithoutProject,
        isLoading: false,
        error: null,
      });

      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '1',
          selectedEntityType: 'all',
        },
      });

      renderWithQueryClient(<NotesTabWrapper {...defaultProps} />);

      // Note without project should not be shown when filtering by project
      expect(screen.queryByText('Note Without Project')).not.toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('should filter by search term in subject', () => {
      renderWithQueryClient(<NotesTabWrapper {...defaultProps} searchTerm="One" />);

      expect(screen.getByText('Note One')).toBeInTheDocument();
      expect(screen.queryByText('Note Two')).not.toBeInTheDocument();
      expect(screen.queryByText('Note Three')).not.toBeInTheDocument();
    });

    it('should filter by search term in content', () => {
      renderWithQueryClient(<NotesTabWrapper {...defaultProps} searchTerm="note two" />);

      expect(screen.getByText('Note Two')).toBeInTheDocument();
      expect(screen.queryByText('Note One')).not.toBeInTheDocument();
    });

    it('should filter by search term in linkId', () => {
      renderWithQueryClient(<NotesTabWrapper {...defaultProps} searchTerm="1" />);

      expect(screen.getByText('Note One')).toBeInTheDocument();
      expect(screen.queryByText('Note Two')).not.toBeInTheDocument();
      expect(screen.queryByText('Note Three')).not.toBeInTheDocument();
    });

    it('should filter by search term in linkType', () => {
      renderWithQueryClient(<NotesTabWrapper {...defaultProps} searchTerm="Episode" />);

      expect(screen.getByText('Note Two')).toBeInTheDocument();
      expect(screen.queryByText('Note One')).not.toBeInTheDocument();
    });

    it('should be case insensitive', () => {
      renderWithQueryClient(<NotesTabWrapper {...defaultProps} searchTerm="NOTE" />);

      expect(screen.getByText('Note One')).toBeInTheDocument();
      expect(screen.getByText('Note Two')).toBeInTheDocument();
      expect(screen.getByText('Note Three')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no notes match filters', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '999',
          selectedEntityType: 'all',
        },
      });

      renderWithQueryClient(<NotesTabWrapper {...defaultProps} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No notes found')).toBeInTheDocument();
    });

    it('should show clear filters button when filters are active', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '1',
          selectedEntityType: 'all',
        },
      });
      const setFilter = vi.fn();
      (useUiStore.getState as any) = vi.fn(() => ({
        setFilter,
      }));

      mockUseNotes.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<NotesTabWrapper {...defaultProps} />);

      const clearButton = screen.getByText('Clear filters');
      expect(clearButton).toBeInTheDocument();
    });

    it('should call onClearSearch when clear filters is clicked', async () => {
      const user = userEvent.setup();
      const onClearSearch = vi.fn();
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '1',
          selectedEntityType: 'all',
        },
      });
      const setFilter = vi.fn();
      (useUiStore.getState as any) = vi.fn(() => ({
        setFilter,
      }));

      mockUseNotes.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<NotesTabWrapper {...defaultProps} onClearSearch={onClearSearch} />);

      const clearButton = screen.getByText('Clear filters');
      await user.click(clearButton);

      expect(onClearSearch).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty notes array', () => {
      mockUseNotes.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<NotesTabWrapper {...defaultProps} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No notes available in the system')).toBeInTheDocument();
    });

    it('should handle notes with missing optional fields', () => {
      const notesWithMissingFields = [
        {
          id: 5,
          linkId: '5',
          linkType: 'Shot',
          subject: null,
          content: 'Content only',
          project: null,
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockUseNotes.mockReturnValue({
        data: notesWithMissingFields,
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<NotesTabWrapper {...defaultProps} />);

      // Should render note with content only
      expect(screen.getByText('Content only')).toBeInTheDocument();
    });

    it('should handle non-array notes data gracefully', () => {
      mockUseNotes.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<NotesTabWrapper {...defaultProps} />);

      // Should not crash and show empty state
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });
});
