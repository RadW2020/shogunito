import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddProjectModal } from '../AddProjectModal';

// Mock useCreateProject
const mockMutateAsync = vi.fn();
const mockUseCreateProject = vi.fn();
vi.mock('@features/projects/api/useProjects', () => ({
  useCreateProject: () => mockUseCreateProject(),
}));

// Mock showToast
vi.mock('@shared/components/feedback', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch globally to intercept apiService calls
global.fetch = vi.fn();

// Mock apiService - must be before importing AddProjectModal
const mockStatuses = [
  {
    id: 1,
    name: 'Active',
    code: 'ACTIVE',
    isActive: true,
    applicableEntities: ['all', 'project'],
    sortOrder: 1,
  },
  {
    id: 2,
    name: 'Inactive',
    code: 'INACTIVE',
    isActive: true,
    applicableEntities: ['all', 'project'],
    sortOrder: 2,
  },
];

vi.mock('../../api/client', () => {
  const actual = vi.importActual('../../api/client');
  return {
    ...actual,
    apiService: {
      ...(actual as any).apiService,
      getStatuses: vi.fn().mockResolvedValue(mockStatuses),
    },
  };
});

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
  ModalContent: ({ children }: any) => <div data-testid="modal-content-inner">{children}</div>,
}));

vi.mock('../../shared/ModalFooter', () => ({
  ModalFooter: ({ children }: any) => <div data-testid="modal-footer">{children}</div>,
  ModalPrimaryButton: ({ children, onClick, disabled, type }: any) => (
    <button data-testid="modal-primary-button" onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  ),
  ModalSecondaryButton: ({ children, onClick }: any) => (
    <button data-testid="modal-secondary-button" onClick={onClick}>
      {children}
    </button>
  ),
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

describe('AddProjectModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
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
    (global.fetch as any).mockClear();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: async () => ({ success: true, data: mockStatuses, metadata: {} }),
      text: async () => JSON.stringify({ success: true, data: mockStatuses, metadata: {} }),
    });
    mockMutateAsync.mockResolvedValue({
      id: 1,
      code: 'PRJ001',
      name: 'New Project',
      status: 'active',
    });
    mockUseCreateProject.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  describe('Basic rendering', () => {
    it('should render modal when isOpen is true', () => {
      renderWithQueryClient(<AddProjectModal {...defaultProps} />);
      const modal = screen.queryByTestId('modal');
      expect(modal).toBeInTheDocument();
      if (modal) {
        expect(screen.getByTestId('modal-title')).toHaveTextContent(/Add New Project/i);
      }
    });

    it('should not render modal when isOpen is false', () => {
      renderWithQueryClient(<AddProjectModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('should render all form fields', () => {
      renderWithQueryClient(<AddProjectModal {...defaultProps} />);

      expect(screen.getByTestId('field-code')).toBeInTheDocument();
      expect(screen.getByTestId('field-name')).toBeInTheDocument();
      expect(screen.getByTestId('field-statusId')).toBeInTheDocument();
      expect(screen.getByTestId('field-description')).toBeInTheDocument();
      expect(screen.getByTestId('field-clientName')).toBeInTheDocument();
    });
  });

  describe('Form validation', () => {
    it('should not submit when code is empty', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddProjectModal {...defaultProps} />);

      const submitButton = screen.getByTestId('modal-primary-button');
      await user.click(submitButton);

      // Verify that mutateAsync was NOT called (validation failed)
      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });
    });

    it('should not submit when name is empty', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddProjectModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      await user.type(codeField, 'PRJ001');

      const submitButton = screen.getByTestId('modal-primary-button');
      await user.click(submitButton);

      // Verify that mutateAsync was NOT called (validation failed)
      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });
    });

    it('should not submit when form is invalid', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddProjectModal {...defaultProps} />);

      const submitButton = screen.getByTestId('modal-primary-button');
      await user.click(submitButton);

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Form submission', () => {
    it('should call mutateAsync with correct data when form is valid', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddProjectModal {...defaultProps} />);

      // Wait for statuses to load
      await waitFor(() => {
        expect(screen.getByTestId('field-statusId')).toBeInTheDocument();
      });

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const statusField = screen.getByTestId('field-statusId');

      await user.type(codeField, 'PRJ001');
      await user.type(nameField, 'New Project');
      await user.selectOptions(statusField, '1');

      const submitButton = screen.getByTestId('modal-primary-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'PRJ001',
            name: 'New Project',
            statusId: '1',
          }),
        );
      });
    });

    it('should call onSuccess after successful creation', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      renderWithQueryClient(<AddProjectModal {...defaultProps} onSuccess={onSuccess} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const statusField = screen.getByTestId('field-statusId');

      await user.type(codeField, 'PRJ001');
      await user.type(nameField, 'New Project');
      await user.selectOptions(statusField, '1');

      const submitButton = screen.getByTestId('modal-primary-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should call onClose after successful creation', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithQueryClient(<AddProjectModal {...defaultProps} onClose={onClose} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const statusField = screen.getByTestId('field-statusId');

      await user.type(codeField, 'PRJ001');
      await user.type(nameField, 'New Project');
      await user.selectOptions(statusField, '1');

      const submitButton = screen.getByTestId('modal-primary-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should reset form after successful submission', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddProjectModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code') as HTMLInputElement;
      const nameField = screen.getByTestId('field-name') as HTMLInputElement;

      await user.type(codeField, 'PRJ001');
      await user.type(nameField, 'New Project');

      const statusField = screen.getByTestId('field-statusId');
      await user.selectOptions(statusField, '1');

      const submitButton = screen.getByTestId('modal-primary-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(codeField.value).toBe('');
        expect(nameField.value).toBe('');
      });
    });
  });

  describe('Cancel button', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithQueryClient(<AddProjectModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByTestId('modal-secondary-button');
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Optional fields', () => {
    it('should include optional fields when provided', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddProjectModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const statusField = screen.getByTestId('field-statusId');
      const descriptionField = screen.getByTestId('field-description');
      const clientField = screen.getByTestId('field-clientName');

      await user.type(codeField, 'PRJ001');
      await user.type(nameField, 'New Project');
      await user.selectOptions(statusField, '1');
      await user.type(descriptionField, 'Project description');
      await user.type(clientField, 'Client Name');

      const submitButton = screen.getByTestId('modal-primary-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'PRJ001',
            name: 'New Project',
            statusId: '1',
            description: 'Project description',
            clientName: 'Client Name',
          }),
        );
      });
    });

    it('should not include empty optional fields', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddProjectModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const statusField = screen.getByTestId('field-statusId');

      await user.type(codeField, 'PRJ001');
      await user.type(nameField, 'New Project');
      await user.selectOptions(statusField, '1');

      const submitButton = screen.getByTestId('modal-primary-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.not.objectContaining({
            description: expect.anything(),
            clientName: expect.anything(),
          }),
        );
      });
    });
  });

  describe('Loading state', () => {
    it('should disable submit button when isPending is true', () => {
      mockUseCreateProject.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      });

      renderWithQueryClient(<AddProjectModal {...defaultProps} />);

      const submitButton = screen.getByTestId('modal-primary-button');
      expect(submitButton).toBeDisabled();
    });
  });
});
