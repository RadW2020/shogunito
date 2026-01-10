import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NoteCreator } from '../NoteCreator';

// Mock useCreateNote
const mockUseCreateNote = vi.fn();
vi.mock('@features/notes/api/useNotes', () => ({
  useCreateNote: () => mockUseCreateNote(),
}));

// Helper to render with QueryClientProvider
const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('NoteCreator', () => {
  const defaultProps = {
    linkId: '1',
    linkType: 'Project' as const,
    linkName: 'Test Project',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Configurar mock por defecto
    mockUseCreateNote.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        id: 1,
        linkId: '1',
        linkType: 'Project',
        subject: 'Test Subject',
        content: 'Test Content',
        noteType: 'note',
        isRead: false,
      }),
      isPending: false,
      isError: false,
      error: null,
    });
  });

  describe('Basic rendering', () => {
    it('should render form with all fields', () => {
      renderWithQueryClient(<NoteCreator {...defaultProps} />);

      expect(screen.getByText(/Add Note to Project/i)).toBeInTheDocument();
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      // Los labels tienen "Subject *" y "Content *", buscar por texto
      expect(screen.getByText(/Subject/i)).toBeInTheDocument();
      expect(screen.getByText(/Content/i)).toBeInTheDocument();
      expect(screen.getByText(/Note Type/i)).toBeInTheDocument();
    });

    it('should show entity icon', () => {
      renderWithQueryClient(<NoteCreator {...defaultProps} linkType="Project" />);
      // Project icon should be present
      expect(screen.getByText('📁')).toBeInTheDocument();
    });

    it('should show different icons for different entity types', () => {
      const { rerender } = renderWithQueryClient(
        <NoteCreator {...defaultProps} linkType="Episode" />,
      );
      expect(screen.getByText('🎬')).toBeInTheDocument();

      rerender(<NoteCreator {...defaultProps} linkType="Shot" />);
      expect(screen.getByText('📸')).toBeInTheDocument();
    });
  });

  describe('Form fields', () => {
    it('should have required subject field', () => {
      renderWithQueryClient(<NoteCreator {...defaultProps} />);
      const subjectInput = screen.getByPlaceholderText(/Enter note subject/i);
      expect(subjectInput).toHaveAttribute('required');
      expect(subjectInput).toBeInTheDocument();
    });

    it('should have required content field', () => {
      renderWithQueryClient(<NoteCreator {...defaultProps} />);
      const contentTextarea = screen.getByPlaceholderText(/Enter note content/i);
      expect(contentTextarea).toHaveAttribute('required');
      expect(contentTextarea).toBeInTheDocument();
    });

    it('should allow typing in subject field', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<NoteCreator {...defaultProps} />);

      const subjectInput = screen.getByPlaceholderText(/Enter note subject/i);
      await user.type(subjectInput, 'My Note Subject');

      expect(subjectInput).toHaveValue('My Note Subject');
    });

    it('should allow typing in content field', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<NoteCreator {...defaultProps} />);

      const contentTextarea = screen.getByPlaceholderText(/Enter note content/i);
      await user.type(contentTextarea, 'My note content');

      expect(contentTextarea).toHaveValue('My note content');
    });

    it('should have note type options', () => {
      renderWithQueryClient(<NoteCreator {...defaultProps} />);

      // Note Type es un select, buscar por el texto del label
      const noteTypeLabel = screen.getByText(/Note Type/i);
      const noteTypeSelect =
        (noteTypeLabel.nextElementSibling as HTMLSelectElement) || screen.getByRole('combobox');
      expect(noteTypeSelect).toBeInTheDocument();

      // Check for note type options
      expect(screen.getByText(/📝 Note/i)).toBeInTheDocument();
      expect(screen.getByText(/✅ Approval/i)).toBeInTheDocument();
      expect(screen.getByText(/🔄 Revision/i)).toBeInTheDocument();
      expect(screen.getByText(/👤 Client Note/i)).toBeInTheDocument();
    });

    it('should allow changing note type', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<NoteCreator {...defaultProps} />);

      // Note Type es un select, buscar por el texto del label
      const noteTypeLabel = screen.getByText(/Note Type/i);
      const noteTypeSelect =
        (noteTypeLabel.nextElementSibling as HTMLSelectElement) || screen.getByRole('combobox');
      await user.selectOptions(noteTypeSelect, 'approval');

      expect(noteTypeSelect).toHaveValue('approval');
    });
  });

  describe('Form submission', () => {
    it('should disable submit button when subject is empty', () => {
      renderWithQueryClient(<NoteCreator {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /Create Note/i });
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when content is empty', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<NoteCreator {...defaultProps} />);

      const subjectInput = screen.getByPlaceholderText(/Enter note subject/i);
      await user.type(subjectInput, 'Subject only');

      const submitButton = screen.getByRole('button', { name: /Create Note/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when both fields are filled', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<NoteCreator {...defaultProps} />);

      const subjectInput = screen.getByPlaceholderText(/Enter note subject/i);
      const contentTextarea = screen.getByPlaceholderText(/Enter note content/i);

      await user.type(subjectInput, 'Test Subject');
      await user.type(contentTextarea, 'Test Content');

      const submitButton = screen.getByRole('button', { name: /Create Note/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('should call mutateAsync when form is submitted', async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn().mockResolvedValue({
        id: 1,
        linkId: '1',
        linkType: 'Project',
        subject: 'Test Subject',
        content: 'Test Content',
        noteType: 'note',
        isRead: false,
      });

      mockUseCreateNote.mockReturnValue({
        mutateAsync,
        isPending: false,
      });

      const onNoteCreated = vi.fn();
      renderWithQueryClient(<NoteCreator {...defaultProps} onNoteCreated={onNoteCreated} />);

      const subjectInput = screen.getByPlaceholderText(/Enter note subject/i);
      const contentTextarea = screen.getByPlaceholderText(/Enter note content/i);
      const submitButton = screen.getByRole('button', { name: /Create Note/i });

      await user.type(subjectInput, 'Test Subject');
      await user.type(contentTextarea, 'Test Content');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          linkId: '1',
          linkType: 'Project',
          subject: 'Test Subject',
          content: 'Test Content',
          noteType: 'note',
          isRead: false,
        });
      });
    });

    it('should call onNoteCreated after successful creation', async () => {
      const user = userEvent.setup();
      const newNote = {
        id: 1,
        linkId: '1',
        linkType: 'Project',
        subject: 'Test Subject',
        content: 'Test Content',
        noteType: 'note',
        isRead: false,
      };

      const mutateAsync = vi.fn().mockResolvedValue(newNote);
      mockUseCreateNote.mockReturnValue({
        mutateAsync,
        isPending: false,
      });

      const onNoteCreated = vi.fn();
      renderWithQueryClient(<NoteCreator {...defaultProps} onNoteCreated={onNoteCreated} />);

      const subjectInput = screen.getByPlaceholderText(/Enter note subject/i);
      const contentTextarea = screen.getByPlaceholderText(/Enter note content/i);
      const submitButton = screen.getByRole('button', { name: /Create Note/i });

      await user.type(subjectInput, 'Test Subject');
      await user.type(contentTextarea, 'Test Content');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onNoteCreated).toHaveBeenCalledWith(newNote);
      });
    });

    it('should reset form after successful submission', async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn().mockResolvedValue({
        id: 1,
        linkId: '1',
        linkType: 'Project',
        subject: 'Test Subject',
        content: 'Test Content',
        noteType: 'note',
        isRead: false,
      });

      mockUseCreateNote.mockReturnValue({
        mutateAsync,
        isPending: false,
      });

      renderWithQueryClient(<NoteCreator {...defaultProps} />);

      const subjectInput = screen.getByPlaceholderText(/Enter note subject/i);
      const contentTextarea = screen.getByPlaceholderText(/Enter note content/i);
      const submitButton = screen.getByRole('button', { name: /Create Note/i });

      await user.type(subjectInput, 'Test Subject');
      await user.type(contentTextarea, 'Test Content');
      await user.click(submitButton);

      await waitFor(() => {
        expect(subjectInput).toHaveValue('');
        expect(contentTextarea).toHaveValue('');
      });
    });

    it('should show loading state when submitting', () => {
      mockUseCreateNote.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      renderWithQueryClient(<NoteCreator {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /Creating.../i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Cancel button', () => {
    it('should not show cancel button when onCancel is not provided', () => {
      renderWithQueryClient(<NoteCreator {...defaultProps} />);
      expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();
    });

    it('should show cancel button when onCancel is provided', () => {
      renderWithQueryClient(<NoteCreator {...defaultProps} onCancel={vi.fn()} />);
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      renderWithQueryClient(<NoteCreator {...defaultProps} onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Validation', () => {
    it('should trim subject and content before submission', async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn().mockResolvedValue({
        id: 1,
        linkId: '1',
        linkType: 'Project',
        subject: 'Test Subject',
        content: 'Test Content',
        noteType: 'note',
        isRead: false,
      });

      mockUseCreateNote.mockReturnValue({
        mutateAsync,
        isPending: false,
      });

      renderWithQueryClient(<NoteCreator {...defaultProps} />);

      const subjectInput = screen.getByPlaceholderText(/Enter note subject/i);
      const contentTextarea = screen.getByPlaceholderText(/Enter note content/i);
      const submitButton = screen.getByRole('button', { name: /Create Note/i });

      await user.type(subjectInput, '  Test Subject  ');
      await user.type(contentTextarea, '  Test Content  ');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            subject: 'Test Subject',
            content: 'Test Content',
          }),
        );
      });
    });

    it('should not submit if linkId is invalid', async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      mockUseCreateNote.mockReturnValue({
        mutateAsync,
        isPending: false,
      });

      renderWithQueryClient(<NoteCreator {...defaultProps} linkId={'' as any} />);

      const subjectInput = screen.getByPlaceholderText(/Enter note subject/i);
      const contentTextarea = screen.getByPlaceholderText(/Enter note content/i);
      const submitButton = screen.getByRole('button', { name: /Create Note/i });

      await user.type(subjectInput, 'Test Subject');
      await user.type(contentTextarea, 'Test Content');
      await user.click(submitButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
        expect(mutateAsync).not.toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });
  });
});
