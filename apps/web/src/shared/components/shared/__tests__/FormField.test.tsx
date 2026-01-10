import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormField } from '../FormField';

describe('FormField', () => {
  const defaultProps = {
    label: 'Test Field',
    name: 'testField',
    value: '',
    onChange: vi.fn(),
  };

  describe('Basic rendering', () => {
    it('should render label', () => {
      render(<FormField {...defaultProps} />);
      expect(screen.getByText('Test Field')).toBeInTheDocument();
    });

    it('should render input by default', () => {
      render(<FormField {...defaultProps} />);
      const input = screen.getByLabelText('Test Field');
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
    });

    it('should use name as id', () => {
      render(<FormField {...defaultProps} />);
      const input = screen.getByLabelText('Test Field');
      expect(input).toHaveAttribute('id', 'testField');
      expect(input).toHaveAttribute('name', 'testField');
    });
  });

  describe('Input types', () => {
    it('should render text input by default', () => {
      render(<FormField {...defaultProps} />);
      const input = screen.getByLabelText('Test Field') as HTMLInputElement;
      expect(input.type).toBe('text');
    });

    it('should render email input', () => {
      render(<FormField {...defaultProps} type="email" />);
      const input = screen.getByLabelText('Test Field') as HTMLInputElement;
      expect(input.type).toBe('email');
    });

    it('should render password input', () => {
      render(<FormField {...defaultProps} type="password" />);
      const input = screen.getByLabelText('Test Field') as HTMLInputElement;
      expect(input.type).toBe('password');
    });

    it('should render number input', () => {
      render(<FormField {...defaultProps} type="number" />);
      const input = screen.getByLabelText('Test Field') as HTMLInputElement;
      expect(input.type).toBe('number');
    });

    it('should render date input', () => {
      render(<FormField {...defaultProps} type="date" />);
      const input = screen.getByLabelText('Test Field') as HTMLInputElement;
      expect(input.type).toBe('date');
    });

    it('should render textarea', () => {
      render(<FormField {...defaultProps} type="textarea" />);
      const textarea = screen.getByLabelText('Test Field');
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('should render select', () => {
      const options = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
      ];
      render(<FormField {...defaultProps} type="select" options={options} />);
      const select = screen.getByLabelText('Test Field');
      expect(select.tagName).toBe('SELECT');
    });
  });

  describe('Value handling', () => {
    it('should display value', () => {
      render(<FormField {...defaultProps} value="test value" />);
      const input = screen.getByLabelText('Test Field') as HTMLInputElement;
      expect(input.value).toBe('test value');
    });

    it('should handle empty value', () => {
      render(<FormField {...defaultProps} value="" />);
      const input = screen.getByLabelText('Test Field') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('should handle null value', () => {
      render(<FormField {...defaultProps} value={null} />);
      const input = screen.getByLabelText('Test Field') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('should call onChange when input changes', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<FormField {...defaultProps} onChange={onChange} />);

      const input = screen.getByLabelText('Test Field');
      await user.type(input, 'new value');

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('Placeholder', () => {
    it('should render placeholder', () => {
      render(<FormField {...defaultProps} placeholder="Enter value" />);
      const input = screen.getByPlaceholderText('Enter value');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Required field', () => {
    it('should show required indicator', () => {
      render(<FormField {...defaultProps} required={true} />);
      const asterisk = screen.getByText('*');
      expect(asterisk).toBeInTheDocument();
    });

    it('should have aria-required when required', () => {
      render(<FormField {...defaultProps} required={true} />);
      const input = screen.getByRole('textbox', { name: /Test Field/i });
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('should have required attribute', () => {
      render(<FormField {...defaultProps} required={true} />);
      const input = screen.getByRole('textbox', { name: /Test Field/i });
      expect(input).toHaveAttribute('required');
    });

    it('should not show required indicator when not required', () => {
      render(<FormField {...defaultProps} required={false} />);
      const asterisk = screen.queryByText('*');
      expect(asterisk).not.toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should display error message', () => {
      render(<FormField {...defaultProps} error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should have aria-invalid when error exists', () => {
      render(<FormField {...defaultProps} error="Error message" />);
      const input = screen.getByLabelText('Test Field');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should have aria-describedby pointing to error', () => {
      render(<FormField {...defaultProps} error="Error message" />);
      const input = screen.getByLabelText('Test Field');
      const errorId = input.getAttribute('aria-describedby');
      expect(errorId).toBeTruthy();

      const errorElement = document.getElementById(errorId!);
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent('Error message');
    });

    it('should apply error styling to input', () => {
      render(<FormField {...defaultProps} error="Error message" />);
      const input = screen.getByLabelText('Test Field');
      expect(input.className).toContain('border-red-500');
    });

    it('should apply error styling to label', () => {
      render(<FormField {...defaultProps} error="Error message" />);
      const label = screen.getByText('Test Field');
      expect(label.className).toContain('text-red-600');
    });
  });

  describe('Select field', () => {
    const selectOptions = [
      { value: 'opt1', label: 'Option 1' },
      { value: 'opt2', label: 'Option 2' },
      { value: 'opt3', label: 'Option 3' },
    ];

    it('should render all options', () => {
      render(<FormField {...defaultProps} type="select" options={selectOptions} />);
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });

    it('should render default placeholder option', () => {
      render(<FormField {...defaultProps} type="select" options={selectOptions} />);
      expect(screen.getByText('Select Test Field')).toBeInTheDocument();
    });

    it('should filter invalid options', () => {
      const optionsWithInvalid = [
        { value: 'valid', label: 'Valid' },
        { value: '', label: 'Empty' },
        { value: null as any, label: 'Null' },
        { value: undefined as any, label: 'Undefined' },
      ];
      render(<FormField {...defaultProps} type="select" options={optionsWithInvalid} />);
      expect(screen.getByText('Valid')).toBeInTheDocument();
      expect(screen.queryByText('Empty')).not.toBeInTheDocument();
    });

    it('should call onChange when option is selected', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <FormField {...defaultProps} type="select" options={selectOptions} onChange={onChange} />,
      );

      const select = screen.getByLabelText('Test Field');
      await user.selectOptions(select, 'opt2');

      expect(onChange).toHaveBeenCalledWith('opt2');
    });
  });

  describe('Textarea field', () => {
    it('should use default rows', () => {
      render(<FormField {...defaultProps} type="textarea" />);
      const textarea = screen.getByLabelText('Test Field') as HTMLTextAreaElement;
      expect(textarea.rows).toBe(3);
    });

    it('should use custom rows', () => {
      render(<FormField {...defaultProps} type="textarea" rows={5} />);
      const textarea = screen.getByLabelText('Test Field') as HTMLTextAreaElement;
      expect(textarea.rows).toBe(5);
    });
  });
});
