import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type QueryKey,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Configuration for optimistic updates
 */
export interface OptimisticUpdateConfig<TData, TVariables> {
  /**
   * Query key to update optimistically
   */
  queryKey: QueryKey;

  /**
   * Function to update the cached data optimistically
   * Return the new data that should be displayed immediately
   */
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData;

  /**
   * Success message to show (optional)
   */
  successMessage?: string | ((data: TData, variables: TVariables) => string);

  /**
   * Error message to show (optional)
   */
  errorMessage?: string | ((error: Error, variables: TVariables) => string);

  /**
   * Whether to show toast notifications (default: true)
   */
  showToast?: boolean;

  /**
   * Additional query keys to invalidate on success
   */
  invalidateKeys?: QueryKey[];
}

/**
 * Hook for mutations with optimistic updates and automatic rollback
 *
 * @example
 * ```tsx
 * const updateProject = useOptimisticMutation({
 *   mutationFn: ({ id, data }) => apiService.updateProject(id, data),
 *   queryKey: ['projects'],
 *   updateFn: (oldProjects, { id, data }) =>
 *     oldProjects?.map(p => p.id === id ? { ...p, ...data } : p),
 *   successMessage: 'Project updated successfully',
 *   errorMessage: 'Failed to update project',
 * });
 * ```
 */
export function useOptimisticMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    optimistic?: OptimisticUpdateConfig<any, TVariables>;
  },
) {
  const queryClient = useQueryClient();

  const { optimistic, onMutate, onError, onSuccess, onSettled, ...mutationOptions } = options;

  // Wrap mutationFn to only pass the first parameter (variables)
  // React Query v5 passes a second parameter with metadata, but our mutationFn
  // signatures only expect variables
  const wrappedMutationFn = mutationOptions.mutationFn
    ? async (variables: TVariables) => {
        // Only pass variables to the original mutationFn, ignore metadata
        return await (mutationOptions.mutationFn as any)(variables);
      }
    : undefined;

  const mutation = useMutation<TData, TError, TVariables, TContext>({
    ...mutationOptions,
    mutationFn: wrappedMutationFn,

    // Optimistic update
    onMutate: async (variables, ...args: any[]) => {
      // Call original onMutate if provided
      const context: any = onMutate ? await (onMutate as any)(variables, ...args) : {};

      if (!optimistic) {
        return context as TContext;
      }

      const { queryKey, updateFn } = optimistic;

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update to the new value
      // Use setQueryData with updater function to ensure it's applied synchronously
      queryClient.setQueryData(queryKey, (old: any) => {
        const newData = updateFn(old, variables);
        return newData;
      });

      // Return context with previous data for rollback
      return {
        ...context,
        previousData,
        queryKey,
      } as TContext;
    },

    // Rollback on error
    onError: async (error, variables, context, ...args: any[]) => {
      // Rollback to previous data BEFORE invalidating
      if (optimistic && context && typeof context === 'object') {
        const ctx = context as any;
        if (ctx.previousData !== undefined && ctx.queryKey) {
          // Cancel any pending queries to avoid race conditions
          await queryClient.cancelQueries({ queryKey: ctx.queryKey });
          // Restore previous data
          queryClient.setQueryData(ctx.queryKey, ctx.previousData);
        }
      }

      // Show error toast
      if (optimistic?.showToast !== false && optimistic?.errorMessage) {
        const message =
          typeof optimistic.errorMessage === 'function'
            ? optimistic.errorMessage(error as Error, variables)
            : optimistic.errorMessage;
        toast.error(message);
      }

      // Call original onError if provided
      if (onError) {
        (onError as any)(error, variables, context, ...args);
      }
    },

    // Show success message
    onSuccess: (data, variables, context, ...args: any[]) => {
      // Show success toast
      if (optimistic?.showToast !== false && optimistic?.successMessage) {
        const message =
          typeof optimistic.successMessage === 'function'
            ? optimistic.successMessage(data, variables)
            : optimistic.successMessage;
        toast.success(message);
      }

      // Call original onSuccess if provided
      if (onSuccess) {
        (onSuccess as any)(data, variables, context, ...args);
      }
    },

    // Always refetch after error or success to ensure data consistency
    onSettled: (data, error, variables, context, ...args: any[]) => {
      if (optimistic) {
        // Only invalidate on success, not on error (error already rolled back)
        // This prevents the rollback from being overwritten by invalidation
        if (!error) {
          // Invalidate the optimistic query to refetch fresh data
          queryClient.invalidateQueries({ queryKey: optimistic.queryKey });

          // Invalidate additional query keys if specified
          if (optimistic.invalidateKeys) {
            optimistic.invalidateKeys.forEach((key) => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          }
        }
      }

      // Call original onSettled if provided
      if (onSettled) {
        (onSettled as any)(data, error, variables, context, ...args);
      }
    },
  });

  return mutation;
}

/**
 * Hook for optimistic CREATE operations
 *
 * @example
 * ```tsx
 * const createProject = useOptimisticCreate({
 *   mutationFn: (data) => apiService.createProject(data),
 *   queryKey: ['projects'],
 *   successMessage: 'Project created',
 * });
 * ```
 */
export function useOptimisticCreate<TData extends { id?: string | number }, TVariables>(config: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: QueryKey;
  successMessage?: string;
  errorMessage?: string;
  showToast?: boolean;
  invalidateKeys?: QueryKey[];
}) {
  return useOptimisticMutation<TData, Error, TVariables>({
    mutationFn: config.mutationFn,
    optimistic: {
      queryKey: config.queryKey,
      updateFn: (oldData: TData[] | undefined, variables: TVariables) => {
        // Generate a temporary ID for the new item
        const tempItem = {
          ...(variables as any),
          id: -Date.now(), // Use negative number as temporary ID
        } as TData;

        return oldData ? [...oldData, tempItem] : [tempItem];
      },
      successMessage: config.successMessage || 'Created successfully',
      errorMessage: config.errorMessage || 'Failed to create',
      showToast: config.showToast,
      invalidateKeys: config.invalidateKeys,
    },
  });
}

/**
 * Hook for optimistic UPDATE operations
 *
 * @example
 * ```tsx
 * const updateProject = useOptimisticUpdate({
 *   mutationFn: ({ id, data }) => apiService.updateProject(id, data),
 *   queryKey: ['projects'],
 *   getId: (vars) => vars.id,
 *   successMessage: 'Project updated',
 * });
 * ```
 */
export function useOptimisticUpdate<
  TData extends { id: string | number },
  TVariables extends { id: string | number; data?: any },
>(config: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: QueryKey;
  getId?: (variables: TVariables) => string | number;
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  errorMessage?: string;
  showToast?: boolean;
  invalidateKeys?: QueryKey[];
}) {
  const getId = config.getId || ((vars: TVariables) => String(vars.id));

  return useOptimisticMutation<TData, Error, TVariables>({
    mutationFn: config.mutationFn,
    optimistic: {
      queryKey: config.queryKey,
      updateFn: (oldData: TData[] | undefined, variables: TVariables) => {
        if (!oldData) return [] as TData[];

        const id = getId(variables);
        return oldData.map((item) =>
          String(item.id) === String(id) ? { ...item, ...(variables.data || variables) } : item,
        ) as TData[];
      },
      successMessage: config.successMessage || 'Updated successfully',
      errorMessage: config.errorMessage || 'Failed to update',
      showToast: config.showToast,
      invalidateKeys: config.invalidateKeys,
    },
  });
}

/**
 * Hook for optimistic DELETE operations
 *
 * @example
 * ```tsx
 * const deleteProject = useOptimisticDelete({
 *   mutationFn: (id) => apiService.deleteProject(id),
 *   queryKey: ['projects'],
 *   successMessage: 'Project deleted',
 * });
 * ```
 */
export function useOptimisticDelete<TData extends { id: string | number }>(config: {
  mutationFn: (id: number) => Promise<void | TData>;
  queryKey: QueryKey;
  successMessage?: string;
  errorMessage?: string;
  showToast?: boolean;
  invalidateKeys?: QueryKey[];
}) {
  return useOptimisticMutation<void | TData, Error, number>({
    mutationFn: config.mutationFn,
    optimistic: {
      queryKey: config.queryKey,
      updateFn: (oldData: TData[] | undefined, id: number) => {
        if (!oldData) return [] as TData[];
        return oldData.filter((item) => item.id !== id) as TData[];
      },
      successMessage: config.successMessage || 'Deleted successfully',
      errorMessage: config.errorMessage || 'Failed to delete',
      showToast: config.showToast,
      invalidateKeys: config.invalidateKeys,
    },
  });
}

/**
 * Utility hook to manually trigger optimistic updates
 * Useful for complex scenarios like reordering, bulk operations, etc.
 */
export function useManualOptimisticUpdate() {
  const queryClient = useQueryClient();

  const setOptimisticData = useCallback(
    <TData>(queryKey: QueryKey, updateFn: (old: TData | undefined) => TData) => {
      // Cancel any outgoing refetches
      queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update
      queryClient.setQueryData<TData>(queryKey, updateFn);

      // Return rollback function
      return () => {
        if (previousData !== undefined) {
          queryClient.setQueryData(queryKey, previousData);
        }
      };
    },
    [queryClient],
  );

  const invalidateQueries = useCallback(
    (queryKey: QueryKey) => {
      return queryClient.invalidateQueries({ queryKey });
    },
    [queryClient],
  );

  return {
    setOptimisticData,
    invalidateQueries,
  };
}
