import React from 'react';
import toast, { Toaster, type Toast as ToastType } from 'react-hot-toast';

// Custom toast component with consistent design
interface ToastProps {
  t: ToastType;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  icon?: React.ReactNode;
}

const CustomToastContent: React.FC<ToastProps> = ({ t, message, type, icon }) => {
  const icons = {
    success: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    error: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    warning: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    info: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    loading: (
      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    ),
  };

  const toastStyles = {
    success: {
      backgroundColor: 'var(--status-success, #10b981)',
      borderColor: 'var(--status-success, #10b981)',
      textColor: 'white',
      iconColor: 'white',
    },
    error: {
      backgroundColor: 'var(--status-error, #ef4444)',
      borderColor: 'var(--status-error, #ef4444)',
      textColor: 'white',
      iconColor: 'white',
    },
    warning: {
      backgroundColor: 'var(--status-warning, #f59e0b)',
      borderColor: 'var(--status-warning, #f59e0b)',
      textColor: 'white',
      iconColor: 'white',
    },
    info: {
      backgroundColor: 'var(--status-info, #3b82f6)',
      borderColor: 'var(--status-info, #3b82f6)',
      textColor: 'white',
      iconColor: 'white',
    },
    loading: {
      backgroundColor: 'var(--status-info, #3b82f6)',
      borderColor: 'var(--status-info, #3b82f6)',
      textColor: 'white',
      iconColor: 'white',
    },
  };

  const style = toastStyles[type];

  return (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full shadow-lg rounded-lg pointer-events-auto flex items-center border`}
      style={{
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-1 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0" style={{ color: style.iconColor }}>
            {icon || icons[type]}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium" style={{ color: style.textColor }}>
              {message}
            </p>
          </div>
          {type !== 'loading' && (
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={() => toast.dismiss(t.id)}
                aria-label="Close notification"
                className="inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  color: style.textColor,
                  opacity: 0.8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Toast helper functions
// eslint-disable-next-line react-refresh/only-export-components
export const showToast = {
  success: (message: string, options?: Partial<ToastType>) => {
    return toast.custom((t) => <CustomToastContent t={t} message={message} type="success" />, {
      duration: 4000,
      ...options,
    });
  },

  error: (message: string, options?: Partial<ToastType>) => {
    return toast.custom((t) => <CustomToastContent t={t} message={message} type="error" />, {
      duration: 5000,
      ...options,
    });
  },

  warning: (message: string, options?: Partial<ToastType>) => {
    return toast.custom((t) => <CustomToastContent t={t} message={message} type="warning" />, {
      duration: 4000,
      ...options,
    });
  },

  info: (message: string, options?: Partial<ToastType>) => {
    return toast.custom((t) => <CustomToastContent t={t} message={message} type="info" />, {
      duration: 4000,
      ...options,
    });
  },

  loading: (message: string, options?: Partial<ToastType>) => {
    return toast.custom((t) => <CustomToastContent t={t} message={message} type="loading" />, {
      duration: Infinity,
      ...options,
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
  ) => {
    return toast.promise(promise, messages);
  },
};

// Toaster component to be placed in app root
export const CustomToaster: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        className: '',
        duration: 4000,
        style: {
          background: 'transparent',
          boxShadow: 'none',
          padding: 0,
        },
      }}
    />
  );
};
