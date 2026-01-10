import React from 'react';

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
  stickyOnMobile?: boolean;
}

/**
 * ModalFooter component for modal action buttons
 * Sticky at the bottom on mobile for better UX
 */
export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  className = '',
  stickyOnMobile = true,
}) => {
  return (
    <div
      className={`
        ${stickyOnMobile ? 'sticky bottom-0 sm:static' : ''}
        px-4 sm:px-6 py-3 sm:py-4 border-t
        bg-white sm:bg-transparent
        ${className}
      `}
      style={{
        borderTopColor: 'var(--border-primary)',
        backgroundColor: stickyOnMobile ? 'var(--bg-secondary)' : undefined,
        boxShadow: stickyOnMobile ? '0 -2px 8px rgba(0, 0, 0, 0.05)' : undefined,
      }}
    >
      <div className="flex justify-end space-x-2 sm:space-x-3">{children}</div>
    </div>
  );
};

/**
 * Button components for consistent styling in modals
 */
interface ModalButtonProps {
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export const ModalButton: React.FC<ModalButtonProps> = ({
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  loading = false,
  children,
  className = '',
  ariaLabel,
}) => {
  const baseClasses = `
    px-4 py-2 text-sm font-medium rounded-md
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
    disabled:opacity-50 disabled:cursor-not-allowed
    min-w-[80px] sm:min-w-[100px]
  `;

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
    secondary: `
      bg-white hover:bg-gray-50 border border-gray-300
      text-gray-700
    `,
    danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-busy={loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={
        variant === 'secondary'
          ? {
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }
          : undefined
      }
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};

/**
 * Convenience exports for common button types
 */
export const ModalPrimaryButton: React.FC<Omit<ModalButtonProps, 'variant'>> = (props) => (
  <ModalButton {...props} variant="primary" />
);

export const ModalSecondaryButton: React.FC<Omit<ModalButtonProps, 'variant'>> = (props) => (
  <ModalButton {...props} variant="secondary" />
);

export const ModalDangerButton: React.FC<Omit<ModalButtonProps, 'variant'>> = (props) => (
  <ModalButton {...props} variant="danger" />
);
