import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VersionFileUpload } from '../VersionFileUpload';
import type { ApiVersion } from '@shared/api/client';

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
const mockUploadVersionFile = vi.fn();
const mockUploadThumbnail = vi.fn();
vi.mock('@shared/api/client', () => ({
  apiService: {
    uploadVersionFile: (...args: any[]) => mockUploadVersionFile(...args),
    uploadThumbnail: (...args: any[]) => mockUploadThumbnail(...args),
  },
}));

describe('VersionFileUpload', () => {
  const mockVersion = {
    id: 1,
    code: 'V001',
    name: 'Test Version',
    entityId: 1,
    entityType: 'shot' as const,
    versionNumber: 1,
    status: 'wip' as const,
    latest: true,
    lineage: {
      prompt: '',
      seed: 0,
      model_name: '',
    },
    assets: [],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  } as unknown as ApiVersion;

  const defaultProps = {
    version: mockVersion,
    fileType: 'file' as const,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadVersionFile.mockResolvedValue({
      ...mockVersion,
      filePath: 'https://example.com/test.mov',
    });
    mockUploadThumbnail.mockResolvedValue({
      ...mockVersion,
      thumbnailPath: 'https://example.com/thumb.jpg',
    });
  });

  describe('Basic rendering', () => {
    it('should render FileUpload component', () => {
      render(<VersionFileUpload {...defaultProps} />);
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });

    it('should have correct accept types for video files when fileType is file', () => {
      render(<VersionFileUpload {...defaultProps} fileType="file" />);
      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toHaveAttribute('accept', expect.stringContaining('video'));
    });

    it('should have correct accept types for images when fileType is thumbnail', () => {
      render(<VersionFileUpload {...defaultProps} fileType="thumbnail" />);
      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toHaveAttribute('accept', expect.stringContaining('image'));
    });

    it('should apply custom className', () => {
      const { container } = render(
        <VersionFileUpload {...defaultProps} className="custom-class" />,
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('File upload', () => {
    it('should call apiService.uploadVersionFile when file is selected (fileType=file)', async () => {
      const user = userEvent.setup();
      render(<VersionFileUpload {...defaultProps} fileType="file" />);

      const file = new File(['content'], 'test.mov', {
        type: 'video/quicktime',
      });
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        // VersionFileUpload uses version.id or Number(version.code) depending on type
        expect(mockUploadVersionFile).toHaveBeenCalled();
        const callArgs = mockUploadVersionFile.mock.calls[0];
        expect(callArgs[0]).toBe(mockVersion.id);
        expect(callArgs[1]).toBe(file);
      });
    });

    it('should call apiService.uploadThumbnail when file is selected (fileType=thumbnail)', async () => {
      const user = userEvent.setup();
      render(<VersionFileUpload {...defaultProps} fileType="thumbnail" />);

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(mockUploadThumbnail).toHaveBeenCalled();
        const callArgs = mockUploadThumbnail.mock.calls[0];
        expect(callArgs[0]).toBe(mockVersion.id);
        expect(callArgs[1]).toBe(file);
      });
    });

    it('should call onSuccess with updated version after successful upload', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const updatedVersion = {
        ...mockVersion,
        filePath: 'https://example.com/test.mov',
      };
      mockUploadVersionFile.mockResolvedValue(updatedVersion);

      render(<VersionFileUpload {...defaultProps} fileType="file" onSuccess={onSuccess} />);

      const file = new File(['content'], 'test.mov', {
        type: 'video/quicktime',
      });
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(updatedVersion);
      });
    });

    it('should call onError when upload fails', async () => {
      const user = userEvent.setup();
      const onError = vi.fn();
      const error = new Error('Upload failed');
      mockUploadVersionFile.mockRejectedValue(error);

      render(<VersionFileUpload {...defaultProps} fileType="file" onError={onError} />);

      const file = new File(['content'], 'test.mov', {
        type: 'video/quicktime',
      });
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Upload failed');
      });
    });

    it('should be disabled during upload', async () => {
      const user = userEvent.setup();
      mockUploadVersionFile.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      render(<VersionFileUpload {...defaultProps} fileType="file" />);

      const file = new File(['content'], 'test.mov', {
        type: 'video/quicktime',
      });
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      await user.upload(fileInput, file);

      // Should be disabled during upload
      await waitFor(() => {
        expect(fileInput).toBeDisabled();
      });
    });
  });
});
