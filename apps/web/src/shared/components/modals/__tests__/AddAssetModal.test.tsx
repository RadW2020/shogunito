import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddAssetModal } from '../AddAssetModal';

// Mock useCreateAsset
const mockMutateAsync = vi.fn();
const mockUseCreateAsset = vi.fn();
vi.mock('@features/assets/api/useAssets', () => ({
  useCreateAsset: () => mockUseCreateAsset(),
}));

// Mock showToast
vi.mock('@shared/components/feedback', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Modal components
vi.mock('../../shared/Modal', () => ({
  Modal: ({ isOpen, children, title, onClose }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <button onClick={onClose} data-testid="modal-close">
          Close
        </button>
        <div data-testid="modal-content">{children}</div>
      </div>
    ) : null,
}));

// Mock FormField
vi.mock('../../shared/FormField', () => ({
  FormField: ({
    label,
    name,
    value,
    onChange,
    error,
    required,
    type,
    options,
    placeholder,
    rows,
  }: any) => {
    if (type === 'select') {
      return (
        <div>
          <label htmlFor={name}>{label}</label>
          <select
            id={name}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            data-testid={`field-${name}`}
            required={required}
          >
            <option value="">Select...</option>
            {options?.map((opt: any) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && (
            <div data-testid={`error-${name}`} role="alert">
              {error}
            </div>
          )}
        </div>
      );
    }
    if (type === 'textarea') {
      return (
        <div>
          <label htmlFor={name}>{label}</label>
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            placeholder={placeholder}
            rows={rows}
            data-testid={`field-${name}`}
          />
          {error && (
            <div data-testid={`error-${name}`} role="alert">
              {error}
            </div>
          )}
        </div>
      );
    }
    return (
      <div>
        <label htmlFor={name}>{label}</label>
        <input
          id={name}
          name={name}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          data-testid={`field-${name}`}
        />
        {error && (
          <div data-testid={`error-${name}`} role="alert">
            {error}
          </div>
        )}
      </div>
    );
  },
}));

describe('AddAssetModal', () => {
  const mockProjects = [
    { id: 1, name: 'Project One', code: 'PRJ001' },
    { id: 2, name: 'Project Two', code: 'PRJ002' },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    projects: mockProjects,
  };

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
    mockMutateAsync.mockResolvedValue({
      id: 1,
      code: 'CHAR001',
      name: 'New Asset',
      projectId: 1,
      assetType: 'character',
      status: 'waiting',
    });
    mockUseCreateAsset.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  describe('Basic rendering', () => {
    it('should render modal when isOpen is true', () => {
      renderWithQueryClient(<AddAssetModal {...defaultProps} />);
      const modal = screen.queryByTestId('modal');
      expect(modal).toBeInTheDocument();
      if (modal) {
        expect(screen.getByTestId('modal-title')).toHaveTextContent(/Add New Asset/i);
      }
    });

    it('should not render modal when isOpen is false', () => {
      renderWithQueryClient(<AddAssetModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('should render all required form fields', () => {
      renderWithQueryClient(<AddAssetModal {...defaultProps} />);

      expect(screen.getByTestId('field-code')).toBeInTheDocument();
      expect(screen.getByTestId('field-name')).toBeInTheDocument();
      expect(screen.getByTestId('field-projectId')).toBeInTheDocument();
      expect(screen.getByTestId('field-assetType')).toBeInTheDocument();
      expect(screen.getByTestId('field-status')).toBeInTheDocument();
    });

    it('should render optional form fields', () => {
      renderWithQueryClient(<AddAssetModal {...defaultProps} />);

      expect(screen.getByTestId('field-description')).toBeInTheDocument();
      expect(screen.getByTestId('field-thumbnailPath')).toBeInTheDocument();
      expect(screen.getByTestId('field-assignedTo')).toBeInTheDocument();
    });
  });

  describe('Form validation', () => {
    it('should not submit when code is empty', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddAssetModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', {
        name: /Create Asset/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });
    });

    it('should not submit when name is empty', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddAssetModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      await user.type(codeField, 'CHAR001');

      const submitButton = screen.getByRole('button', {
        name: /Create Asset/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });
    });

    it('should not submit when project is not selected', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddAssetModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      await user.type(codeField, 'CHAR001');
      await user.type(nameField, 'New Asset');

      const submitButton = screen.getByRole('button', {
        name: /Create Asset/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });
    });

    it('should not submit when assetType is not selected', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddAssetModal {...defaultProps} />);

      // Clear default assetType by selecting empty option
      const assetTypeField = screen.getByTestId('field-assetType');
      await user.selectOptions(assetTypeField, '');

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const projectField = screen.getByTestId('field-projectId');
      await user.type(codeField, 'CHAR001');
      await user.type(nameField, 'New Asset');
      await user.selectOptions(projectField, '1');

      const submitButton = screen.getByRole('button', {
        name: /Create Asset/i,
      });
      await user.click(submitButton);

      // Wait a bit to ensure mutation is not called
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Form submission', () => {
    it('should call mutateAsync with correct data when form is valid', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddAssetModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const projectField = screen.getByTestId('field-projectId');
      const assetTypeField = screen.getByTestId('field-assetType');
      const statusField = screen.getByTestId('field-status');

      await user.type(codeField, 'CHAR001');
      await user.type(nameField, 'New Asset');
      await user.selectOptions(projectField, '1');
      await user.selectOptions(assetTypeField, 'character');
      await user.selectOptions(statusField, 'waiting');

      const submitButton = screen.getByRole('button', {
        name: /Create Asset/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'CHAR001',
            name: 'New Asset',
            projectId: 1,
            assetType: 'character',
            status: 'waiting',
          }),
        );
      });
    });

    it('should call onSuccess after successful creation', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      renderWithQueryClient(<AddAssetModal {...defaultProps} onSuccess={onSuccess} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const projectField = screen.getByTestId('field-projectId');
      const assetTypeField = screen.getByTestId('field-assetType');
      const statusField = screen.getByTestId('field-status');

      await user.type(codeField, 'CHAR001');
      await user.type(nameField, 'New Asset');
      await user.selectOptions(projectField, '1');
      await user.selectOptions(assetTypeField, 'character');
      await user.selectOptions(statusField, 'waiting');

      const submitButton = screen.getByRole('button', {
        name: /Create Asset/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should call onClose after successful creation', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithQueryClient(<AddAssetModal {...defaultProps} onClose={onClose} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const projectField = screen.getByTestId('field-projectId');
      const assetTypeField = screen.getByTestId('field-assetType');
      const statusField = screen.getByTestId('field-status');

      await user.type(codeField, 'CHAR001');
      await user.type(nameField, 'New Asset');
      await user.selectOptions(projectField, '1');
      await user.selectOptions(assetTypeField, 'character');
      await user.selectOptions(statusField, 'waiting');

      const submitButton = screen.getByRole('button', {
        name: /Create Asset/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should reset form after successful submission', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddAssetModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code') as HTMLInputElement;
      const nameField = screen.getByTestId('field-name') as HTMLInputElement;
      const projectField = screen.getByTestId('field-projectId');
      const assetTypeField = screen.getByTestId('field-assetType');
      const statusField = screen.getByTestId('field-status');

      await user.type(codeField, 'CHAR001');
      await user.type(nameField, 'New Asset');
      await user.selectOptions(projectField, '1');
      await user.selectOptions(assetTypeField, 'character');
      await user.selectOptions(statusField, 'waiting');

      const submitButton = screen.getByRole('button', {
        name: /Create Asset/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(codeField.value).toBe('');
        expect(nameField.value).toBe('');
      });
    });
  });

  describe('Optional fields', () => {
    it('should include optional fields when provided', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddAssetModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const projectField = screen.getByTestId('field-projectId');
      const assetTypeField = screen.getByTestId('field-assetType');
      const statusField = screen.getByTestId('field-status');
      const descriptionField = screen.getByTestId('field-description');
      const thumbnailField = screen.getByTestId('field-thumbnailPath');

      await user.type(codeField, 'CHAR001');
      await user.type(nameField, 'New Asset');
      await user.selectOptions(projectField, '1');
      await user.selectOptions(assetTypeField, 'character');
      await user.selectOptions(statusField, 'waiting');
      await user.type(descriptionField, 'Asset description');
      await user.type(thumbnailField, '/path/to/thumbnail.jpg');

      const submitButton = screen.getByRole('button', {
        name: /Create Asset/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'CHAR001',
            name: 'New Asset',
            description: 'Asset description',
            thumbnailPath: '/path/to/thumbnail.jpg',
          }),
        );
      });
    });

    it('should not include empty optional fields', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddAssetModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const projectField = screen.getByTestId('field-projectId');
      const assetTypeField = screen.getByTestId('field-assetType');
      const statusField = screen.getByTestId('field-status');

      await user.type(codeField, 'CHAR001');
      await user.type(nameField, 'New Asset');
      await user.selectOptions(projectField, '1');
      await user.selectOptions(assetTypeField, 'character');
      await user.selectOptions(statusField, 'waiting');

      const submitButton = screen.getByRole('button', {
        name: /Create Asset/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.not.objectContaining({
            description: expect.anything(),
            thumbnailPath: expect.anything(),
          }),
        );
      });
    });
  });

  describe('Loading state', () => {
    it('should disable submit button when isSubmitting is true', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      renderWithQueryClient(<AddAssetModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const projectField = screen.getByTestId('field-projectId');
      const assetTypeField = screen.getByTestId('field-assetType');
      const statusField = screen.getByTestId('field-status');

      await user.type(codeField, 'CHAR001');
      await user.type(nameField, 'New Asset');
      await user.selectOptions(projectField, '1');
      await user.selectOptions(assetTypeField, 'character');
      await user.selectOptions(statusField, 'waiting');

      const submitButton = screen.getByRole('button', {
        name: /Create Asset/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(submitButton).toHaveTextContent('Creating...');
      });
    });
  });

  describe('Error handling', () => {
    it('should show error message when submission fails', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));

      renderWithQueryClient(<AddAssetModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const projectField = screen.getByTestId('field-projectId');
      const assetTypeField = screen.getByTestId('field-assetType');
      const statusField = screen.getByTestId('field-status');

      await user.type(codeField, 'CHAR001');
      await user.type(nameField, 'New Asset');
      await user.selectOptions(projectField, '1');
      await user.selectOptions(assetTypeField, 'character');
      await user.selectOptions(statusField, 'waiting');

      const submitButton = screen.getByRole('button', {
        name: /Create Asset/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to create asset/i)).toBeInTheDocument();
      });
    });
  });
});
