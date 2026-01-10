import React, { useRef, useId, useEffect } from 'react';
import {
  useFocusTrap,
  useFocusRestore,
  useKeyboardNavigation,
} from '../../hooks/useKeyboardNavigation';
import { AriaLabels } from '../../utils/accessibility';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullScreenOnMobile?: boolean;
  hideCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  fullScreenOnMobile = true,
  hideCloseButton = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Accessibility: Focus trap, focus restore, keyboard navigation
  useFocusTrap(modalRef as React.RefObject<HTMLElement>, isOpen);
  useFocusRestore();
  useKeyboardNavigation({
    onEscape: onClose,
  });

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Desktop size classes
  const sizeClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  };

  // Mobile full-screen classes
  const mobileClasses = fullScreenOnMobile
    ? 'h-full w-full sm:h-auto sm:rounded-lg'
    : 'max-h-[90vh] w-full rounded-lg';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`
          relative ${mobileClasses} ${sizeClasses[size]}
          transform bg-white shadow-xl transition-all
          flex flex-col overflow-hidden
        `}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          maxHeight: fullScreenOnMobile ? '100%' : '90vh',
        }}
      >
        {/* Header - Sticky on mobile */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0"
          style={{ borderBottomColor: 'var(--border-primary)' }}
        >
          <h3
            id={titleId}
            className="text-base sm:text-lg font-semibold truncate pr-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h3>
          {!hideCloseButton && (
            <button
              onClick={onClose}
              aria-label={AriaLabels.close}
              className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span className="sr-only">{AriaLabels.close}</span>
            </button>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

/**
 * ModalContent component for wrapping modal body content
 * Use this for the scrollable content area
 */
export const ModalContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return <div className={`px-4 sm:px-6 py-4 ${className}`}>{children}</div>;
};
