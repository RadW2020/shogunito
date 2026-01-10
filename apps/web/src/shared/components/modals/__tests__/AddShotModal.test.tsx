import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddShotModal } from '../AddShotModal';
import * as useShotsModule from '@features/shots/api/useShots';

// Mock useCreateShot
vi.mock('@features/shots/api/useShots', () => ({
  useCreateShot: vi.fn(),
}));

// Mock showToast
vi.mock('../../feedback', () => ({
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

describe('AddShotModal', () => {
  const mockSequences = [
    { id: 201, name: 'Sequence A', code: 'SEQ001' },
    { id: 202, name: 'Sequence B', code: 'SEQ002' },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    sequences: mockSequences,
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
    mockMutateAsync.mockResolvedValue({
      id: 301,
      code: 'SH001',
      name: 'New Shot',
      status: 'waiting',
    });
    (useShotsModule.useCreateShot as unknown as Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  describe('Basic rendering', () => {
    it('should render modal when isOpen is true', () => {
      renderWithQueryClient(<AddShotModal {...defaultProps} />);
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent(/Add New Shot/i);
    });

    it('should not render modal when isOpen is false', () => {
      renderWithQueryClient(<AddShotModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('should render all form fields', () => {
      renderWithQueryClient(<AddShotModal {...defaultProps} />);

      expect(screen.getByTestId('field-code')).toBeInTheDocument();
      expect(screen.getByTestId('field-name')).toBeInTheDocument();
      expect(screen.getByTestId('field-sequenceId')).toBeInTheDocument();
      expect(screen.getByTestId('field-status')).toBeInTheDocument();
      expect(screen.getByTestId('field-sequenceNumber')).toBeInTheDocument();
      expect(screen.getByTestId('field-shotType')).toBeInTheDocument();
      expect(screen.getByTestId('field-duration')).toBeInTheDocument();
      expect(screen.getByTestId('field-cutOrder')).toBeInTheDocument();
      expect(screen.getByTestId('field-description')).toBeInTheDocument();
    });

    it('should render sequence options', () => {
      renderWithQueryClient(<AddShotModal {...defaultProps} />);

      const sequenceField = screen.getByTestId('field-sequenceId');
      expect(sequenceField).toHaveTextContent('SEQ001 - Sequence A');
      expect(sequenceField).toHaveTextContent('SEQ002 - Sequence B');
    });
  });

  describe('Form validation', () => {
    it('should not submit when code is empty', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddShotModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /Create Shot/i });
      await user.click(submitButton);

      // Verify that mutateAsync was NOT called (validation failed)
      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });
    });

    it('should not submit when name is empty', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddShotModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      await user.type(codeField, 'SH001');

      const submitButton = screen.getByRole('button', { name: /Create Shot/i });
      await user.click(submitButton);

      // Verify that mutateAsync was NOT called (validation failed)
      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });
    });

    it('should not submit when sequence is not selected', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddShotModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      await user.type(codeField, 'SH001');
      await user.type(nameField, 'Shot One');

      const submitButton = screen.getByRole('button', { name: /Create Shot/i });
      await user.click(submitButton);

      // Verify that mutateAsync was NOT called (validation failed)
      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });
    });

    it('should not submit when sequence number is empty', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddShotModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const sequenceField = screen.getByTestId('field-sequenceId');
      await user.type(codeField, 'SH001');
      await user.type(nameField, 'Shot One');
      await user.selectOptions(sequenceField, '201');

      const submitButton = screen.getByRole('button', { name: /Create Shot/i });
      await user.click(submitButton);

      // Verify that mutateAsync was NOT called (validation failed)
      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });
    });

    it('should not submit when form is invalid', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddShotModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /Create Shot/i });
      await user.click(submitButton);

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Form submission', () => {
    it('should call mutateAsync with correct data when form is valid', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddShotModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const sequenceField = screen.getByTestId('field-sequenceId');
      const statusField = screen.getByTestId('field-status');
      const sequenceNumberField = screen.getByTestId('field-sequenceNumber');

      await user.type(codeField, 'SH001');
      await user.type(nameField, 'Shot One');
      await user.selectOptions(sequenceField, '201');
      await user.selectOptions(statusField, 'waiting');
      await user.type(sequenceNumberField, '1');

      const submitButton = screen.getByRole('button', { name: /Create Shot/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            sequenceId: 201,
            code: 'SH001',
            name: 'Shot One',
            sequenceNumber: 1,
            status: 'waiting',
          }),
        );
      });
    });

    it('should include optional fields when provided', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddShotModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const sequenceField = screen.getByTestId('field-sequenceId');
      const statusField = screen.getByTestId('field-status');
      const sequenceNumberField = screen.getByTestId('field-sequenceNumber');
      const shotTypeField = screen.getByTestId('field-shotType');
      const durationField = screen.getByTestId('field-duration');
      const cutOrderField = screen.getByTestId('field-cutOrder');

      await user.type(codeField, 'SH001');
      await user.type(nameField, 'Shot One');
      await user.selectOptions(sequenceField, '201');
      await user.selectOptions(statusField, 'waiting');
      await user.type(sequenceNumberField, '1');
      await user.selectOptions(shotTypeField, 'medium');
      await user.type(durationField, '10');
      await user.type(cutOrderField, '2');

      const submitButton = screen.getByRole('button', { name: /Create Shot/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            shotType: 'medium',
            duration: 10,
            cutOrder: 2,
          }),
        );
      });
    });

    it('should call onSuccess after successful creation', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      renderWithQueryClient(<AddShotModal {...defaultProps} onSuccess={onSuccess} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const sequenceField = screen.getByTestId('field-sequenceId');
      const statusField = screen.getByTestId('field-status');
      const sequenceNumberField = screen.getByTestId('field-sequenceNumber');

      await user.type(codeField, 'SH001');
      await user.type(nameField, 'Shot One');
      await user.selectOptions(sequenceField, '201');
      await user.selectOptions(statusField, 'waiting');
      await user.type(sequenceNumberField, '1');

      const submitButton = screen.getByRole('button', { name: /Create Shot/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should call onClose after successful creation', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithQueryClient(<AddShotModal {...defaultProps} onClose={onClose} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const sequenceField = screen.getByTestId('field-sequenceId');
      const statusField = screen.getByTestId('field-status');
      const sequenceNumberField = screen.getByTestId('field-sequenceNumber');

      await user.type(codeField, 'SH001');
      await user.type(nameField, 'Shot One');
      await user.selectOptions(sequenceField, '201');
      await user.selectOptions(statusField, 'waiting');
      await user.type(sequenceNumberField, '1');

      const submitButton = screen.getByRole('button', { name: /Create Shot/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should reset form after successful submission', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<AddShotModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code') as HTMLInputElement;
      const nameField = screen.getByTestId('field-name') as HTMLInputElement;
      const sequenceField = screen.getByTestId('field-sequenceId') as HTMLSelectElement;
      const sequenceNumberField = screen.getByTestId('field-sequenceNumber') as HTMLInputElement;

      await user.type(codeField, 'SH001');
      await user.type(nameField, 'Shot One');
      await user.selectOptions(sequenceField, '201');
      await user.type(sequenceNumberField, '1');

      const statusField = screen.getByTestId('field-status');
      await user.selectOptions(statusField, 'waiting');

      const submitButton = screen.getByRole('button', { name: /Create Shot/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(codeField.value).toBe('');
        expect(nameField.value).toBe('');
        expect(sequenceField.value).toBe('');
        expect(sequenceNumberField.value).toBe('');
      });
    });
  });

  describe('Cancel button', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithQueryClient(<AddShotModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading state', () => {
    it('should disable submit button when isPending is true', () => {
      (useShotsModule.useCreateShot as unknown as Mock).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      });

      renderWithQueryClient(<AddShotModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /Creating.../i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Error handling', () => {
    it('should show error message when submission fails', async () => {
      mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));
      const user = userEvent.setup();
      renderWithQueryClient(<AddShotModal {...defaultProps} />);

      const codeField = screen.getByTestId('field-code');
      const nameField = screen.getByTestId('field-name');
      const sequenceField = screen.getByTestId('field-sequenceId');
      const statusField = screen.getByTestId('field-status');
      const sequenceNumberField = screen.getByTestId('field-sequenceNumber');

      await user.type(codeField, 'SH001');
      await user.type(nameField, 'Shot One');
      await user.selectOptions(sequenceField, '201');
      await user.selectOptions(statusField, 'waiting');
      await user.type(sequenceNumberField, '1');

      const submitButton = screen.getByRole('button', { name: /Create Shot/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to create shot/i)).toBeInTheDocument();
      });
    });
  });
});
