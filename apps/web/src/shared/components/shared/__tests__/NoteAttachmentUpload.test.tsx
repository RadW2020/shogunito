import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteAttachmentUpload } from '../NoteAttachmentUpload';

// Mock FileUpload
vi.mock('../FileUpload', () => ({
  FileUpload: ({ children, onUpload, accept, disabled }: any) => (
    <div data-testid="file-upload">
      <input
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            // Handle promise rejection to avoid unhandled rejection warnings
            Promise.resolve(onUpload(file)).catch(() => {
              // Expected rejection, component throws error after calling onError
            });
          }
        }}
        disabled={disabled}
        data-testid="file-input"
      />
      {children}
    </div>
  ),
}));

// Mock apiService
const mockUploadNoteAttachment = vi.fn();
vi.mock('@shared/api/client', () => ({
  apiService: {
    uploadNoteAttachment: (...args: any[]) => mockUploadNoteAttachment(...args),
  },
}));

describe('NoteAttachmentUpload', () => {
  const mockNote = {
    id: 1,
    linkId: '1',
    linkType: 'Project',
    subject: 'Test Note',
    content: 'Test Content',
    noteType: 'note',
    isRead: false,
    attachments: [],
  };

  const defaultProps = {
    note: mockNote,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadNoteAttachment.mockResolvedValue({
      id: 1,
      noteId: 1,
      fileName: 'test.pdf',
      fileUrl: 'https://example.com/test.pdf',
    });
  });

  describe('Basic rendering', () => {
    it('should render FileUpload component', () => {
      render(<NoteAttachmentUpload {...defaultProps} />);
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });

    it('should have correct accept types for attachments', () => {
      render(<NoteAttachmentUpload {...defaultProps} />);
      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toHaveAttribute('accept', expect.stringContaining('application/pdf'));
    });

    it('should apply custom className', () => {
      const { container } = render(
        <NoteAttachmentUpload {...defaultProps} className="custom-class" />,
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('File upload', () => {
    it('should call apiService.uploadNoteAttachment when file is selected', async () => {
      const user = userEvent.setup();
      render(<NoteAttachmentUpload {...defaultProps} />);

      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      });
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(mockUploadNoteAttachment).toHaveBeenCalledWith(mockNote.id, file);
      });
    });

    it('should call onSuccess with updated note after successful upload', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const updatedNote = {
        id: 1,
        noteId: 1,
        fileName: 'test.pdf',
        fileUrl: 'https://example.com/test.pdf',
      };
      mockUploadNoteAttachment.mockResolvedValue(updatedNote);

      render(<NoteAttachmentUpload {...defaultProps} onSuccess={onSuccess} />);

      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      });
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(updatedNote);
      });
    });

    it('should call onError when upload fails', async () => {
      const user = userEvent.setup();
      const onError = vi.fn();
      const error = new Error('Upload failed');
      mockUploadNoteAttachment.mockRejectedValue(error);

      render(<NoteAttachmentUpload {...defaultProps} onError={onError} />);

      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      });
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Upload failed');
      });
    });

    it('should handle error without error message', async () => {
      const user = userEvent.setup();
      const onError = vi.fn();
      mockUploadNoteAttachment.mockRejectedValue({});

      render(<NoteAttachmentUpload {...defaultProps} onError={onError} />);

      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      });
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Upload failed');
      });
    });

    it('should be disabled during upload', async () => {
      const user = userEvent.setup();
      mockUploadNoteAttachment.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      render(<NoteAttachmentUpload {...defaultProps} />);

      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      });
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      await user.upload(fileInput, file);

      // Should be disabled during upload
      expect(fileInput).toBeDisabled();
    });
  });
});
