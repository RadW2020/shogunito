import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from '../FileUpload';

describe('FileUpload', () => {
  const user = userEvent.setup();
  const defaultProps = {
    onUpload: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('should render file input', () => {
      render(<FileUpload {...defaultProps} />);
      const fileInput = screen.getByRole('button');
      expect(fileInput).toBeInTheDocument();
    });

    it('should render children when provided', () => {
      render(
        <FileUpload {...defaultProps}>
          <div>Custom Upload UI</div>
        </FileUpload>,
      );
      expect(screen.getByText('Custom Upload UI')).toBeInTheDocument();
    });

    it('should render default UI when no children provided', () => {
      render(<FileUpload {...defaultProps} />);
      // Should have a clickable area
      const uploadArea = screen.getByRole('button');
      expect(uploadArea).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<FileUpload {...defaultProps} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('File selection', () => {
    it('should call onUpload when file is selected', async () => {
      const onUpload = vi.fn().mockResolvedValue(undefined);
      render(<FileUpload onUpload={onUpload} />);

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(onUpload).toHaveBeenCalledWith(file);
      });
    });

    it('should accept files with default accept type (image/*)', async () => {
      const onUpload = vi.fn().mockResolvedValue(undefined);
      render(<FileUpload onUpload={onUpload} />);

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(onUpload).toHaveBeenCalled();
      });
    });

    it('should accept files with custom accept type', async () => {
      const onUpload = vi.fn().mockResolvedValue(undefined);
      render(<FileUpload onUpload={onUpload} accept="application/pdf" />);

      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(onUpload).toHaveBeenCalled();
      });
    });

    it('should reject files that exceed max size', async () => {
      const onUpload = vi.fn();
      render(<FileUpload onUpload={onUpload} maxSize={1} />); // 1MB max

      // Create a file larger than 1MB
      const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB
      const file = new File([largeContent], 'large.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(onUpload).not.toHaveBeenCalled();
        expect(screen.getByText(/File size must be less than 1MB/i)).toBeInTheDocument();
      });
    });

    it('should reject files with wrong type', async () => {
      const onUpload = vi.fn();
      render(<FileUpload onUpload={onUpload} accept="image/jpeg,image/png" />);

      // Crear un archivo con tipo incorrecto
      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Simular el evento change directamente ya que el navegador puede bloquear la selección
      await act(async () => {
        const changeEvent = new Event('change', { bubbles: true });
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false,
        });
        fileInput.dispatchEvent(changeEvent);
      });

      await waitFor(() => {
        expect(onUpload).not.toHaveBeenCalled();
        // Verificar que el error se muestra
        const errorDiv = document.querySelector('.mt-2');
        expect(errorDiv).toBeInTheDocument();
        expect(errorDiv?.textContent).toContain('File type');
        expect(errorDiv?.textContent).toContain('is not allowed');
      });
    });

    it('should accept files with wildcard type (image/*)', async () => {
      const onUpload = vi.fn().mockResolvedValue(undefined);
      render(<FileUpload onUpload={onUpload} accept="image/*" />);

      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(onUpload).toHaveBeenCalled();
      });
    });
  });

  describe('Upload state', () => {
    it('should show uploading state during upload', async () => {
      const onUpload = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 100))) as (
        file: File,
      ) => Promise<void>;
      render(<FileUpload onUpload={onUpload} />);

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, file);

      // Should show uploading state (case insensitive)
      await waitFor(() => {
        expect(screen.getByText(/Uploading/i)).toBeInTheDocument();
      });
    });

    it('should disable input during upload', async () => {
      const onUpload = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 100))) as (
        file: File,
      ) => Promise<void>;
      render(<FileUpload onUpload={onUpload} />);

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, file);

      expect(fileInput).toBeDisabled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<FileUpload {...defaultProps} disabled={true} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeDisabled();
    });
  });

  describe('Error handling', () => {
    it('should display error message when upload fails', async () => {
      const onUpload = vi.fn().mockRejectedValue(new Error('Upload failed'));
      render(<FileUpload onUpload={onUpload} />);

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });
    });

    it('should clear error when new file is selected', async () => {
      const onUpload = vi
        .fn()
        .mockRejectedValueOnce(new Error('Upload failed'))
        .mockResolvedValueOnce(undefined);
      render(<FileUpload onUpload={onUpload} />);

      const file1 = new File(['content'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['content'], 'test2.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // First upload fails
      await user.upload(fileInput, file1);
      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });

      // Second upload succeeds
      await user.upload(fileInput, file2);
      await waitFor(() => {
        expect(screen.queryByText('Upload failed')).not.toBeInTheDocument();
      });
    });

    it('should reset file input after upload', async () => {
      const onUpload = vi.fn().mockResolvedValue(undefined);
      render(<FileUpload onUpload={onUpload} />);

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(fileInput.value).toBe('');
      });
    });
  });

  describe('Click handling', () => {
    it('should trigger file input click when upload area is clicked', async () => {
      const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
      render(<FileUpload {...defaultProps} />);

      const uploadButton = screen.getByRole('button');
      await user.click(uploadButton);

      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('should not trigger click when disabled', async () => {
      const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
      render(<FileUpload {...defaultProps} disabled={true} />);

      const uploadButton = screen.getByRole('button');
      await user.click(uploadButton);

      expect(clickSpy).not.toHaveBeenCalled();
      clickSpy.mockRestore();
    });
  });
});
