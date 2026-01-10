import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NoteBadge } from '../NoteBadge';

// Mock useQuery directamente ya que useNotesByEntity lo usa internamente
const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: (...args: any[]) => mockUseQuery(...args),
  };
});

// Helper to render with QueryClientProvider
const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('NoteBadge', () => {
  const mockNotes = [
    {
      id: 1,
      linkId: '1',
      linkType: 'Project',
      subject: 'Note 1',
      content: 'Content 1',
      isRead: false,
    },
    {
      id: 2,
      linkId: '1',
      linkType: 'Project',
      subject: 'Note 2',
      content: 'Content 2',
      isRead: true,
    },
    {
      id: 3,
      linkId: '1',
      linkType: 'Project',
      subject: 'Note 3',
      content: 'Content 3',
      isRead: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Configurar mock por defecto para evitar estados inesperados
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    });
  });

  describe('Loading state', () => {
    it('should show loading indicator when loading', () => {
      mockUseQuery.mockReturnValueOnce({
        data: [],
        isLoading: true,
      });

      const { container } = renderWithQueryClient(<NoteBadge linkId="1" linkType="Project" />);
      const loadingIndicator = container.querySelector('.animate-pulse');
      expect(loadingIndicator).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should return null when no notes', () => {
      mockUseQuery.mockReturnValueOnce({
        data: [],
        isLoading: false,
      });

      const { container } = renderWithQueryClient(<NoteBadge linkId="1" linkType="Project" />);
      // When totalCount is 0, component returns null, but QueryClientProvider wrapper remains
      const badge = container.querySelector('[class*="inline-flex"]');
      expect(badge).toBeNull();
    });
  });

  describe('Basic rendering', () => {
    it('should render badge with unread count when showUnread is true (default) and unreadCount > 0', async () => {
      // El hook devuelve { data, isLoading } directamente
      // Usar mockReturnValueOnce para este test específico
      mockUseQuery.mockReturnValueOnce({
        data: mockNotes,
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
      });

      renderWithQueryClient(<NoteBadge linkId="1" linkType="Project" />);

      await waitFor(
        () => {
          // Cuando showUnread es true (default) y hay notas no leídas, muestra el conteo de no leídas (2)
          expect(screen.getByText('2')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it('should show unread count when unreadCount > 0', async () => {
      mockUseQuery.mockReturnValueOnce({
        data: mockNotes,
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
      });

      renderWithQueryClient(<NoteBadge linkId="1" linkType="Project" showUnread={true} />);

      await waitFor(() => {
        // Should show unread count (2 unread notes)
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should show total count when showUnread is false', async () => {
      mockUseQuery.mockReturnValueOnce({
        data: mockNotes,
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
      });

      renderWithQueryClient(<NoteBadge linkId="1" linkType="Project" showUnread={false} />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should apply custom className', async () => {
      mockUseQuery.mockReturnValueOnce({
        data: mockNotes,
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
      });

      const { container } = renderWithQueryClient(
        <NoteBadge linkId="1" linkType="Project" className="custom-class" />,
      );

      await waitFor(() => {
        const badge = container.firstChild as HTMLElement;
        expect(badge.className).toContain('custom-class');
      });
    });
  });

  describe('Icons', () => {
    it('should show red dot icon when unreadCount > 0', async () => {
      mockUseQuery.mockReturnValueOnce({
        data: mockNotes,
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
      });

      renderWithQueryClient(<NoteBadge linkId="1" linkType="Project" />);

      await waitFor(() => {
        expect(screen.getByText('🔴')).toBeInTheDocument();
      });
    });

    it('should show chat bubble icon when all notes are read', async () => {
      const allReadNotes = mockNotes.map((note) => ({ ...note, isRead: true }));
      mockUseQuery.mockReturnValueOnce({
        data: allReadNotes,
        isLoading: false,
      });

      renderWithQueryClient(<NoteBadge linkId="1" linkType="Project" />);

      await waitFor(() => {
        expect(screen.getByText('💬')).toBeInTheDocument();
      });
    });
  });

  describe('Count display', () => {
    it('should hide count when showCount is false', async () => {
      mockUseQuery.mockReturnValueOnce({
        data: mockNotes,
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
      });

      renderWithQueryClient(<NoteBadge linkId="1" linkType="Project" showCount={false} />);

      await waitFor(() => {
        // Icon should be visible but count should not
        expect(screen.getByText('🔴')).toBeInTheDocument();
        expect(screen.queryByText('3')).not.toBeInTheDocument();
      });
    });
  });

  describe('Click handler', () => {
    it('should call onClick when clicked', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      mockUseQuery.mockReturnValueOnce({
        data: mockNotes,
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
      });

      renderWithQueryClient(<NoteBadge linkId="1" linkType="Project" onClick={onClick} />);

      await waitFor(async () => {
        const badge = screen.getByText('🔴').closest('div');
        if (badge) {
          await user.click(badge);
          expect(onClick).toHaveBeenCalledTimes(1);
        }
      });
    });
  });

  describe('Title attribute', () => {
    it('should have correct title with total and unread count', async () => {
      mockUseQuery.mockReturnValueOnce({
        data: mockNotes,
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
      });

      renderWithQueryClient(<NoteBadge linkId="1" linkType="Project" />);

      await waitFor(() => {
        const badge = screen.getByText('🔴').closest('div');
        expect(badge).toHaveAttribute('title', '3 notes (2 unread) - Click to view notes');
      });
    });

    it('should have correct title when all notes are read', async () => {
      const allReadNotes = mockNotes.map((note) => ({ ...note, isRead: true }));
      mockUseQuery.mockReturnValueOnce({
        data: allReadNotes,
        isLoading: false,
      });

      renderWithQueryClient(<NoteBadge linkId="1" linkType="Project" />);

      await waitFor(() => {
        const badge = screen.getByText('💬').closest('div');
        expect(badge).toHaveAttribute('title', '3 notes - Click to view notes');
      });
    });

    it('should use singular "note" when count is 1', async () => {
      const singleNote = [mockNotes[0]];
      mockUseQuery.mockReturnValueOnce({
        data: singleNote,
        isLoading: false,
      });

      renderWithQueryClient(<NoteBadge linkId="1" linkType="Project" />);

      await waitFor(() => {
        const badge = screen.getByText('🔴').closest('div');
        expect(badge).toHaveAttribute('title', '1 note (1 unread) - Click to view notes');
      });
    });
  });
});
