import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface ErrorState {
  error: Error | null;
  isError: boolean;
}

export function useErrorHandler() {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
  });

  const handleError = useCallback((error: Error | string) => {
    const errorObj = error instanceof Error ? error : new Error(error);

    setErrorState({
      error: errorObj,
      isError: true,
    });

    // Show toast notification
    toast.error(errorObj.message || 'An unexpected error occurred');

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error handled:', errorObj);
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
    });
  }, []);

  const retry = useCallback(
    async (fn: () => Promise<void> | void) => {
      try {
        clearError();
        await fn();
      } catch (error) {
        handleError(error instanceof Error ? error : new Error(String(error)));
      }
    },
    [handleError, clearError],
  );

  return {
    ...errorState,
    handleError,
    clearError,
    retry,
  };
}
