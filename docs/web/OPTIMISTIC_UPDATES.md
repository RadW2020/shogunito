# Optimistic Updates System

This document describes the optimistic updates system for instant UI feedback with automatic rollback on error.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Advanced Patterns](#advanced-patterns)
- [Troubleshooting](#troubleshooting)

## Overview

Optimistic updates provide instant UI feedback by updating the interface immediately when a user performs an action, before waiting for the server response. If the server request fails, the UI automatically rolls back to the previous state.

### Benefits

- **Instant Feedback**: UI updates immediately, no loading states
- **Better UX**: Actions feel instantaneous and responsive
- **Automatic Rollback**: Errors are handled gracefully with state restoration
- **Toast Notifications**: Built-in success/error messages
- **Type-Safe**: Full TypeScript support with type inference

### When to Use

✅ **Good for:**

- Toggling states (read/unread, enabled/disabled)
- Updating text fields (names, descriptions)
- Deleting items from lists
- Creating new items
- Reordering items
- Status changes

❌ **Not recommended for:**

- Complex multi-step operations
- Operations that return significant new data
- Operations with complex validation
- File uploads (use progress indicators instead)

## Core Concepts

### 1. Optimistic Update Flow

```
User Action → Update UI Immediately → Send Request → On Error: Rollback
                                                   → On Success: Refetch
```

### 2. Key Features

- **Immediate UI Update**: Changes appear instantly
- **Previous State Snapshot**: Saved for potential rollback
- **Query Cancellation**: Prevents race conditions
- **Automatic Invalidation**: Refetches to ensure data consistency
- **Error Handling**: Automatic rollback with error notifications

## API Reference

### `useOptimisticMutation`

Base hook for creating optimistic mutations with custom update logic.

```typescript
function useOptimisticMutation<TData, TError, TVariables, TContext>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    optimistic?: OptimisticUpdateConfig<any, TVariables>;
  },
): UseMutationResult<TData, TError, TVariables, TContext>;
```

**Parameters:**

- `mutationFn`: Function that performs the API request
- `optimistic`: Configuration for optimistic update
  - `queryKey`: Query key to update
  - `updateFn`: Function to update cached data
  - `successMessage`: Success toast message (optional)
  - `errorMessage`: Error toast message (optional)
  - `showToast`: Whether to show notifications (default: true)
  - `invalidateKeys`: Additional keys to invalidate (optional)

**Example:**

```typescript
const mutation = useOptimisticMutation({
  mutationFn: (data) => apiService.updateItem(data),
  optimistic: {
    queryKey: ['items'],
    updateFn: (oldItems, newData) =>
      oldItems.map((item) => (item.id === newData.id ? { ...item, ...newData } : item)),
    successMessage: 'Item updated',
    errorMessage: 'Failed to update item',
  },
});
```

### `useOptimisticCreate`

Specialized hook for CREATE operations.

```typescript
function useOptimisticCreate<TData extends { id?: string }, TVariables>(config: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: QueryKey;
  successMessage?: string;
  errorMessage?: string;
  showToast?: boolean;
  invalidateKeys?: QueryKey[];
});
```

**Features:**

- Automatically generates temporary ID
- Adds item to the end of the list
- Replaces temp item with real data on success

**Example:**

```typescript
const createProject = useOptimisticCreate({
  mutationFn: (data) => apiService.createProject(data),
  queryKey: ['projects'],
  successMessage: 'Project created',
  errorMessage: 'Failed to create project',
});

// Usage
createProject.mutate({ name: 'New Project', code: 'PROJ' });
```

### `useOptimisticUpdate`

Specialized hook for UPDATE operations.

```typescript
function useOptimisticUpdate<
  TData extends { id: string },
  TVariables extends { id: string; data?: any },
>(config: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: QueryKey;
  getId?: (variables: TVariables) => string;
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  errorMessage?: string;
  showToast?: boolean;
  invalidateKeys?: QueryKey[];
});
```

**Features:**

- Finds item by ID and updates it
- Supports dynamic success messages
- Merges new data with existing item

**Example:**

```typescript
const updateProject = useOptimisticUpdate({
  mutationFn: ({ id, data }) => apiService.updateProject(id, data),
  queryKey: ['projects'],
  successMessage: (data) => `Project "${data.name}" updated`,
  errorMessage: 'Failed to update project',
});

// Usage
updateProject.mutate({
  id: 'project-1',
  data: { name: 'Updated Name' },
});
```

### `useOptimisticDelete`

Specialized hook for DELETE operations.

```typescript
function useOptimisticDelete<TData extends { id: string }>(config: {
  mutationFn: (id: string) => Promise<void | TData>;
  queryKey: QueryKey;
  successMessage?: string;
  errorMessage?: string;
  showToast?: boolean;
  invalidateKeys?: QueryKey[];
});
```

**Features:**

- Removes item from list immediately
- Restores item on error
- Works with both void and TData returns

**Example:**

```typescript
const deleteProject = useOptimisticDelete({
  mutationFn: (id) => apiService.deleteProject(id),
  queryKey: ['projects'],
  successMessage: 'Project deleted',
  errorMessage: 'Failed to delete project',
});

// Usage
deleteProject.mutate('project-1');
```

### `useManualOptimisticUpdate`

Utility hook for manual optimistic updates (complex scenarios).

```typescript
const { setOptimisticData, invalidateQueries } = useManualOptimisticUpdate();

// Usage
const rollback = setOptimisticData(['items'], (old) => {
  // Return new data
  return old.map((item) => ({ ...item, selected: true }));
});

// Later, if needed:
rollback(); // Restore previous state
```

## Usage Examples

### Example 1: Simple CRUD Operations

```typescript
import { useProjects } from '@features/projects/api/useProjects';
import {
  useCreateProjectOptimistic,
  useUpdateProjectOptimistic,
  useDeleteProjectOptimistic,
} from '@features/projects/api/useProjectsOptimistic';

function ProjectList() {
  const { data: projects } = useProjects();
  const createProject = useCreateProjectOptimistic();
  const updateProject = useUpdateProjectOptimistic();
  const deleteProject = useDeleteProjectOptimistic();

  return (
    <div>
      <button onClick={() => createProject.mutate({
        name: 'New Project',
        code: 'PROJ'
      })}>
        Create
      </button>

      {projects?.map(project => (
        <div key={project.id}>
          <span>{project.name}</span>
          <button onClick={() => updateProject.mutate({
            id: project.id,
            data: { name: 'Updated Name' }
          })}>
            Update
          </button>
          <button onClick={() => deleteProject.mutate(project.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Example 2: Toggle Button

```typescript
import { useToggleNoteRead } from '@features/notes/api/useNotesOptimistic';

function NoteItem({ note }) {
  const toggleRead = useToggleNoteRead();

  return (
    <button
      onClick={() => toggleRead.mutate({
        id: note.id,
        isRead: !note.isRead
      })}
      className={note.isRead ? 'read' : 'unread'}
    >
      {note.isRead ? '✓ Read' : '○ Unread'}
    </button>
  );
}
```

### Example 3: Inline Editing

```typescript
function EditableField({ item }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(item.name);
  const updateItem = useUpdateItemOptimistic();

  const handleSave = () => {
    updateItem.mutate({
      id: item.id,
      data: { name: value }
    });
    setIsEditing(false);
  };

  return isEditing ? (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
      autoFocus
    />
  ) : (
    <span onClick={() => setIsEditing(true)}>
      {item.name}
    </span>
  );
}
```

### Example 4: Batch Operations

```typescript
function BulkActions({ selectedIds }) {
  const updateStatus = useUpdateShotStatus();

  const updateAll = async (status: string) => {
    // Update all items optimistically
    for (const id of selectedIds) {
      updateStatus.mutate({ id, status });
    }
  };

  return (
    <button onClick={() => updateAll('approved')}>
      Approve All ({selectedIds.length})
    </button>
  );
}
```

### Example 5: Drag and Drop Reordering

```typescript
function ReorderableList({ items }) {
  const { setOptimisticData } = useManualOptimisticUpdate();

  const handleReorder = (fromIndex: number, toIndex: number) => {
    // Optimistic reorder
    const rollback = setOptimisticData(['items'], (old) => {
      const newItems = [...old];
      const [removed] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, removed);
      return newItems;
    });

    // Save to server
    apiService.reorderItems(newItems.map(item => item.id))
      .catch(() => {
        rollback(); // Restore on error
        toast.error('Failed to reorder');
      });
  };

  return (
    <DragDropContext onDragEnd={handleReorder}>
      {/* Draggable items */}
    </DragDropContext>
  );
}
```

## Best Practices

### 1. Always Provide Error Messages

```typescript
// ✅ Good
const deleteProject = useOptimisticDelete({
  mutationFn: apiService.deleteProject,
  queryKey: ['projects'],
  successMessage: 'Project deleted',
  errorMessage: 'Failed to delete project', // User knows what happened
});

// ❌ Bad
const deleteProject = useOptimisticDelete({
  mutationFn: apiService.deleteProject,
  queryKey: ['projects'],
  // No error message - silent failure is confusing
});
```

### 2. Disable Buttons During Mutations (Optional)

```typescript
function DeleteButton({ id }) {
  const deleteItem = useOptimisticDelete({...});

  return (
    <button
      onClick={() => deleteItem.mutate(id)}
      disabled={deleteItem.isPending} // Prevent double-clicks
    >
      Delete
    </button>
  );
}
```

### 3. Use Descriptive Success Messages

```typescript
// ✅ Good - Dynamic message with context
successMessage: (data) => `Project "${data.name}" updated successfully`;

// ❌ Bad - Generic message
successMessage: 'Updated';
```

### 4. Invalidate Related Queries

```typescript
const updateProject = useOptimisticUpdate({
  mutationFn: apiService.updateProject,
  queryKey: ['projects'],
  // Also refresh paginated and filtered views
  invalidateKeys: [
    ['projects', 'paginated'],
    ['projects', 'filtered'],
  ],
});
```

### 5. Hide Toasts for Frequent Actions

```typescript
// Toggle actions shouldn't spam notifications
const toggleRead = useOptimisticUpdate({
  mutationFn: apiService.updateNote,
  queryKey: ['notes'],
  showToast: false, // Silent update
});
```

### 6. Handle Loading States

```typescript
function SaveButton() {
  const update = useOptimisticUpdate({...});

  return (
    <button
      onClick={() => update.mutate(data)}
      className={update.isPending ? 'opacity-50' : ''}
    >
      {update.isPending ? 'Saving...' : 'Save'}
    </button>
  );
}
```

## Advanced Patterns

### Pattern 1: Optimistic Pagination

```typescript
const { flatData, loadMore } = usePaginatedQuery({
  queryKey: ['items'],
  queryFn: apiService.getItems,
});

const deleteItem = useOptimisticDelete({
  mutationFn: apiService.deleteItem,
  queryKey: ['items'], // Works with paginated queries
});
```

### Pattern 2: Conditional Optimistic Updates

```typescript
function useSmartUpdate() {
  const isOnline = useOnlineStatus();

  return useOptimisticUpdate({
    mutationFn: apiService.updateItem,
    queryKey: ['items'],
    // Only use optimistic updates when online
    optimistic: isOnline ? config : undefined,
  });
}
```

### Pattern 3: Optimistic Updates with Validation

```typescript
const updateProject = useOptimisticUpdate({
  mutationFn: async (data) => {
    // Validate before updating
    if (!data.name.trim()) {
      throw new Error('Name is required');
    }
    return apiService.updateProject(data.id, data.data);
  },
  queryKey: ['projects'],
});
```

### Pattern 4: Cascade Invalidation

```typescript
// When updating a project, also refresh related data
const updateProject = useOptimisticUpdate({
  mutationFn: apiService.updateProject,
  queryKey: ['projects'],
  invalidateKeys: [
    ['shots'], // Shots belong to projects
    ['episodes'], // Episodes belong to projects
    ['assets'], // Assets belong to projects
  ],
});
```

## Troubleshooting

### Issue: Optimistic update not appearing

**Problem**: UI doesn't update immediately

**Solutions:**

1. Verify `queryKey` matches the query being used
2. Check that `updateFn` returns the correct data structure
3. Ensure the component is subscribed to the query

```typescript
// ❌ Wrong query key
useOptimisticUpdate({
  queryKey: ['project'], // Singular
});

// ✅ Correct query key
useOptimisticUpdate({
  queryKey: ['projects'], // Matches useQuery
});
```

### Issue: Data not refetching after success

**Problem**: Old data persists after optimistic update

**Solution**: Check that `invalidateQueries` is working

```typescript
// Debug: Log when queries are invalidated
onSuccess: () => {
  console.log('Invalidating queries');
  queryClient.invalidateQueries({ queryKey: ['items'] });
};
```

### Issue: Race condition causing flickering

**Problem**: Multiple rapid updates cause UI to flicker

**Solution**: Use `cancelQueries` to prevent race conditions

```typescript
// This is already handled in useOptimisticMutation
await queryClient.cancelQueries({ queryKey });
```

### Issue: Rollback not working

**Problem**: Data doesn't revert on error

**Solution**: Ensure context is being passed correctly

```typescript
// Check that onMutate returns the context
onMutate: async (variables) => {
  const previousData = queryClient.getQueryData(queryKey);
  return { previousData }; // Must return context
};
```

### Issue: TypeScript errors

**Problem**: Type mismatches with optimistic updates

**Solution**: Ensure types match between API and cache

```typescript
// Define consistent types
interface Project {
  id: string;
  name: string;
  code: string;
}

const updateProject = useOptimisticUpdate<
  Project, // Return type
  { id: string; data: Partial<Project> } // Variables type
>({
  mutationFn: ({ id, data }) => apiService.updateProject(id, data),
  queryKey: ['projects'],
});
```

## Performance Considerations

### Memory

- Previous state is stored in memory during mutation
- Automatically cleaned up after settlement
- No memory leaks from optimistic updates

### Network

- Queries are cancelled to prevent race conditions
- Data is refetched after success for consistency
- Use `staleTime` to reduce unnecessary refetches

### Rendering

- Optimistic updates trigger re-renders
- Use React.memo for list items to prevent full list re-renders
- Consider virtualization for large lists

```typescript
const ProjectItem = React.memo(({ project }) => {
  return <div>{project.name}</div>;
});
```

## Migration Guide

### From Regular Mutations to Optimistic

**Before:**

```typescript
const updateProject = useMutation({
  mutationFn: ({ id, data }) => apiService.updateProject(id, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  },
});
```

**After:**

```typescript
const updateProject = useOptimisticUpdate({
  mutationFn: ({ id, data }) => apiService.updateProject(id, data),
  queryKey: ['projects'],
  successMessage: 'Project updated',
  errorMessage: 'Failed to update project',
});
```

**Benefits:**

- ✅ Instant UI feedback
- ✅ Automatic rollback on error
- ✅ Built-in toast notifications
- ✅ Less boilerplate code

## Related Hooks

- `usePaginatedQuery` - Works seamlessly with optimistic updates
- `useErrorHandler` - Can be combined for custom error handling
- `useQueryClient` - For manual cache manipulation

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/community/tkdodos-blog)
