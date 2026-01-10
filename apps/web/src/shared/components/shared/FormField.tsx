import React, { useId } from 'react';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'date';
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  rows?: number;
  error?: string;
  disabled?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  options = [],
  rows = 3,
  error,
  disabled = false,
}) => {
  const errorId = useId();
  const fieldId = name;

  const baseInputClasses = `
    w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:ring-offset-2
    transition-colors duration-200
  `;

  const inputClasses = `
    ${baseInputClasses}
    ${error ? 'border-red-500' : 'border-gray-300'}
    ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}
  `;

  const labelClasses = `
    block text-sm font-medium mb-1
    ${error ? 'text-red-600' : 'text-gray-700'}
  `;

  // Accessibility: Common ARIA props for all inputs
  const ariaProps = {
    'aria-required': required || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  };

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            id={fieldId}
            name={name}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            rows={rows}
            disabled={disabled}
            className={inputClasses}
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
            {...ariaProps}
          />
        );

      case 'select': {
        // Filter out invalid options and ensure unique keys
        const validOptions = options.filter(
          (option) =>
            option && option.value !== undefined && option.value !== null && option.value !== '',
        );

        return (
          <select
            id={fieldId}
            name={name}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            disabled={disabled}
            className={inputClasses}
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
            {...ariaProps}
          >
            <option value="">Select {label}</option>
            {validOptions.map((option, index) => (
              <option key={`${option.value}-${index}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      }

      default:
        return (
          <input
            id={fieldId}
            name={name}
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={inputClasses}
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
            {...ariaProps}
          />
        );
    }
  };

  return (
    <div className="mb-4">
      <label htmlFor={fieldId} className={labelClasses} style={{ color: 'var(--text-primary)' }}>
        {label}
        {required && (
          <>
            <span className="text-red-500 ml-1" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(required)</span>
          </>
        )}
      </label>
      {renderInput()}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
