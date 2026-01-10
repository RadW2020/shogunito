import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddEpisodeModal } from '../AddEpisodeModal';
import * as useEpisodesModule from '@features/episodes/api/useEpisodes';

// Mock useCreateEpisode
vi.mock('@features/episodes/api/useEpisodes', () => ({
  useCreateEpisode: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch globally to intercept apiService calls
global.fetch = vi.fn();

// Mock apiService - must be before importing AddEpisodeModal
const mockStatuses = [
  {
    id: 1,
    name: 'Active',
    code: 'ACTIVE',
    isActive: true,
    applicableEntities: ['all', 'episode'],
    sortOrder: 1,
  },
  {
    id: 2,
    name: 'Inactive',
    code: 'INACTIVE',
    isActive: true,
    applicableEntities: ['all', 'episode'],
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
    if (type === 'textarea') {
      return (
        <div>
          <label htmlFor={name}>{label}</label>
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
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
    }
    return (
      <div>
        <label htmlFor={name}>{label}</label>
        <input
          id={name}
          name={name}
          type={type || 'text'}
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

describe('AddEpisodeModal', () => {
  const mockProjects = [
    { id: 1, name: 'Project Alpha', code: 'PRJ001' },
    { id: 2, name: 'Project Beta', code: 'PRJ002' },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    projects: mockProjects,
  };

  const mockMutateAsync = vi.fn();
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
      id: 101,
      code: 'EP001',
      name: 'New Episode',
      statusId: 1,
    });
    (useEpisodesModule.useCreateEpisode as unknown as Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  describe('Basic rendering', () => {
    it('should render modal when isOpen is true', () => {
      renderWithQueryClient(<AddEpisodeModal {...defaultProps} />);
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent(/Add New Episode/i);
    });

    it('should not render modal when isOpen is false', () => {
      renderWithQueryClient(<AddEpisodeModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('should render all form fields', () => {
      renderWithQueryClient(<AddEpisodeModal {...defaultProps} />);

      expect(screen.getByTestId('field-code')).toBeInTheDocument();
      expect(screen.getByTestId('field-name')).toBeInTheDocument();
      expect(screen.getByTestId('field-projectId')).toBeInTheDocument();
      expect(screen.getByTestId('field-statusId')).toBeInTheDocument();
      // Duration field uses name="duration"
      expect(screen.getByTestId('field-duration')).toBeInTheDocument();
      expect(screen.getByTestId('field-description')).toBeInTheDocument();
    });

    it('should render project options', () => {
      renderWithQueryClient(<AddEpisodeModal {...defaultProps} />);

      const projectField = screen.getByTestId('field-projectId');
      expect(projectField).toHaveTextContent('PRJ001 - Project Alpha');
      expect(projectField).toHaveTextContent('PRJ002 - Project Beta');
    });
  });

  describe('Form validation', () => {
    it('should not submit when code is empty', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddEpisodeModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', {
        name: /Create Episode/i,
      });

      await user.click(submitButton);

      // Verify that mutateAsync was NOT called (validation failed)
      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });
    });

    it('should show error when name is empty', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddEpisodeModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      await user.type(codeField, 'EP001');

      const submitButton = screen.getByRole('button', {
        name: /Create Episode/i,
      });
      await user.click(submitButton);

      // Verify that mutateAsync was NOT called (validation failed)
      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });
    });

    it('should show error when project is not selected', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddEpisodeModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      await user.type(codeField, 'EP001');
      await user.type(nameField, 'Episode One');

      const submitButton = screen.getByRole('button', {
        name: /Create Episode/i,
      });
      await user.click(submitButton);

      // Verify that mutateAsync was NOT called (validation failed)
      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });
    });

    it('should not submit when form is invalid', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddEpisodeModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', {
        name: /Create Episode/i,
      });
      await user.click(submitButton);

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Form submission', () => {
    it('should call mutateAsync with correct data when form is valid', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddEpisodeModal {...defaultProps} />);

      // Wait for statuses to load
      await waitFor(() => {
        expect(screen.getByTestId('field-statusId')).toBeInTheDocument();
      });

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const projectField = screen.getByTestId('field-projectId');
      const statusField = screen.getByTestId('field-statusId');
      const cutOrderField = screen.getByTestId('field-cutOrder');

      await user.type(codeField, 'EP001');
      await user.type(nameField, 'Episode One');
      await user.selectOptions(projectField, '1');
      await user.selectOptions(statusField, '1');
      await user.type(cutOrderField, '1');

      const submitButton = screen.getByRole('button', {
        name: /Create Episode/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: 1,
            code: 'EP001',
            name: 'Episode One',
            statusId: '1', // statusId comes as string from form
            cutOrder: 1,
          }),
        );
      });
    });

    it('should include optional fields when provided', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddEpisodeModal {...defaultProps} />);

      // Wait for statuses to load
      await waitFor(() => {
        expect(screen.getByTestId('field-statusId')).toBeInTheDocument();
      });

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const projectField = screen.getByTestId('field-projectId');
      const statusField = screen.getByTestId('field-statusId');
      const cutOrderField = screen.getByTestId('field-cutOrder');
      const descriptionField = screen.getByTestId('field-description');
      const durationField = screen.getByTestId('field-duration');

      await user.type(codeField, 'EP001');
      await user.type(nameField, 'Episode One');
      await user.selectOptions(projectField, '1');
      await user.selectOptions(statusField, '1');
      await user.type(cutOrderField, '1');
      await user.type(descriptionField, 'Episode description');
      await user.type(durationField, '300');

      const submitButton = screen.getByRole('button', {
        name: /Create Episode/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'Episode description',
            duration: 300,
          }),
        );
      });
    });

    it('should call onSuccess after successful creation', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      renderWithQueryClient(<AddEpisodeModal {...defaultProps} onSuccess={onSuccess} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const projectField = screen.getByTestId('field-projectId');
      const statusField = screen.getByTestId('field-statusId');
      const cutOrderField = screen.getByTestId('field-cutOrder');

      await user.type(codeField, 'EP001');
      await user.type(nameField, 'Episode One');
      await user.selectOptions(projectField, '1');
      await user.selectOptions(statusField, '1');
      await user.type(cutOrderField, '1');

      const submitButton = screen.getByRole('button', {
        name: /Create Episode/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should call onClose after successful creation', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithQueryClient(<AddEpisodeModal {...defaultProps} onClose={onClose} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const projectField = screen.getByTestId('field-projectId');
      const statusField = screen.getByTestId('field-statusId');
      const cutOrderField = screen.getByTestId('field-cutOrder');

      await user.type(codeField, 'EP001');
      await user.type(nameField, 'Episode One');
      await user.selectOptions(projectField, '1');
      await user.selectOptions(statusField, '1');
      await user.type(cutOrderField, '1');

      const submitButton = screen.getByRole('button', {
        name: /Create Episode/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should reset form after successful submission', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddEpisodeModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code') as HTMLInputElement;
      const nameField = screen.getByTestId('field-name') as HTMLInputElement;
      const projectField = screen.getByTestId('field-projectId') as HTMLSelectElement;

      // Wait for statuses to load
      await waitFor(() => {
        expect(screen.getByTestId('field-statusId')).toBeInTheDocument();
      });

      await user.type(codeField, 'EP001');
      await user.type(nameField, 'Episode One');
      await user.selectOptions(projectField, '1');

      const statusField = screen.getByTestId('field-statusId');
      await user.selectOptions(statusField, '1');

      const cutOrderField = screen.getByTestId('field-cutOrder');
      await user.type(cutOrderField, '1');

      const submitButton = screen.getByRole('button', {
        name: /Create Episode/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(codeField.value).toBe('');
        expect(nameField.value).toBe('');
        expect(projectField.value).toBe('');
      });
    });
  });

  describe('Cancel button', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithQueryClient(<AddEpisodeModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading state', () => {
    it('should disable submit button when isPending is true', () => {
      (useEpisodesModule.useCreateEpisode as unknown as Mock).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      });

      renderWithQueryClient(<AddEpisodeModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /Creating.../i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Error handling', () => {
    it('should show error message when submission fails', async () => {
      mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));
      const user = userEvent.setup();
      renderWithQueryClient(<AddEpisodeModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const projectField = screen.getByTestId('field-projectId');
      const statusField = screen.getByTestId('field-statusId');
      const cutOrderField = screen.getByTestId('field-cutOrder');

      await user.type(codeField, 'EP001');
      await user.type(nameField, 'Episode One');
      await user.selectOptions(projectField, '1');
      await user.selectOptions(statusField, '1');
      await user.type(cutOrderField, '1');

      const submitButton = screen.getByRole('button', {
        name: /Create Episode/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to create episode/i)).toBeInTheDocument();
      });
    });
  });
});
