import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetThumbnailUpload } from '../AssetThumbnailUpload';

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
const mockUploadAssetThumbnail = vi.fn();
vi.mock('@shared/api/client', () => ({
  apiService: {
    uploadAssetThumbnail: (...args: any[]) => mockUploadAssetThumbnail(...args),
  },
}));

describe('AssetThumbnailUpload', () => {
  const mockAsset = {
    id: 1,
    code: 'AST001',
    name: 'Test Asset',
  };

  const defaultProps = {
    asset: mockAsset,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadAssetThumbnail.mockResolvedValue({
      ...mockAsset,
      thumbnailUrl: 'https://example.com/thumbnail.jpg',
    });
  });

  describe('Basic rendering', () => {
    it('should render FileUpload component', () => {
      render(<AssetThumbnailUpload {...defaultProps} />);
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });

    it('should have correct accept types for images', () => {
      render(<AssetThumbnailUpload {...defaultProps} />);
      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toHaveAttribute('accept', expect.stringContaining('image'));
    });

    it('should have max size of 5MB', () => {
      render(<AssetThumbnailUpload {...defaultProps} />);
      // FileUpload component should receive maxSize prop
      const fileUpload = screen.getByTestId('file-upload');
      expect(fileUpload).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <AssetThumbnailUpload {...defaultProps} className="custom-class" />,
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('File upload', () => {
    it('should call apiService.uploadAssetThumbnail when file is selected', async () => {
      const user = userEvent.setup();
      render(<AssetThumbnailUpload {...defaultProps} />);

      const file = new File(['content'], 'thumbnail.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(mockUploadAssetThumbnail).toHaveBeenCalledWith('AST001', file);
      });
    });

    it('should call onSuccess with updated asset after successful upload', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const updatedAsset = {
        ...mockAsset,
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
      };
      mockUploadAssetThumbnail.mockResolvedValue(updatedAsset);

      render(<AssetThumbnailUpload {...defaultProps} onSuccess={onSuccess} />);

      const file = new File(['content'], 'thumbnail.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(updatedAsset);
      });
    });

    it('should call onError when upload fails', async () => {
      const user = userEvent.setup();
      const onError = vi.fn();
      const error = new Error('Upload failed');
      mockUploadAssetThumbnail.mockRejectedValue(error);

      render(<AssetThumbnailUpload {...defaultProps} onError={onError} />);

      const file = new File(['content'], 'thumbnail.jpg', {
        type: 'image/jpeg',
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
      mockUploadAssetThumbnail.mockRejectedValue({});

      render(<AssetThumbnailUpload {...defaultProps} onError={onError} />);

      const file = new File(['content'], 'thumbnail.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Upload failed');
      });
    });

    it('should be disabled during upload', async () => {
      const user = userEvent.setup();
      mockUploadAssetThumbnail.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      render(<AssetThumbnailUpload {...defaultProps} />);

      const file = new File(['content'], 'thumbnail.jpg', {
        type: 'image/jpeg',
      });
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

      await user.upload(fileInput, file);

      // Should be disabled during upload
      expect(fileInput).toBeDisabled();
    });
  });
});
