# Pagination Components

This directory contains reusable pagination and virtualization components for efficiently displaying large datasets.

## Components

### InfiniteScrollList

A component that implements infinite scroll functionality for lists. Automatically loads more items as the user scrolls.

**Features:**

- Automatic loading on scroll
- Loading states
- Empty states
- Customizable height and styling

**Usage:**

```tsx
import { InfiniteScrollList } from '@shared/components/pagination';

<InfiniteScrollList
  items={projects}
  hasMore={hasMore}
  loadMore={loadMore}
  renderItem={(project) => <ProjectCard project={project} />}
  emptyMessage="No projects found"
  height={600}
/>;
```

### VirtualTable

A virtualized table component for large datasets. Only renders visible rows for optimal performance.

**Features:**

- Virtual scrolling (only renders visible items)
- Infinite scroll support
- Customizable columns
- Row click handling
- Loading states

**Usage:**

```tsx
import { VirtualTable } from '@shared/components/pagination';

<VirtualTable
  items={versions}
  columns={[
    { key: 'code', header: 'Code', render: (v) => v.code },
    { key: 'name', header: 'Name', render: (v) => v.name },
  ]}
  hasMore={hasMore}
  loadMore={loadMore}
  rowHeight={60}
  height={700}
  onRowClick={(version) => console.log(version)}
/>;
```

## Hooks

### usePaginatedQuery

A generic hook for implementing paginated queries with infinite scroll support.

**Usage:**

```tsx
import { usePaginatedQuery } from '@shared/hooks/usePaginatedQuery';

const { flatData, hasMore, loadMore, isLoading } = usePaginatedQuery({
  queryKey: ['projects'],
  queryFn: ({ pageParam, limit }) => apiService.getProjectsPaginated(pageParam, limit),
  limit: 50,
});
```

## Utilities

The `pagination.ts` file contains utility functions and types:

- `PaginatedResponse<T>`: Type for paginated API responses
- `paginateArray()`: Client-side pagination helper
- `flattenInfiniteQueryData()`: Merge pages from infinite queries
- `getNextPageParam()`: Get next page parameter
- And more...

## Examples

### Infinite Scroll List Example

See `ProjectsTabWrapperWithPagination.tsx` for a complete example of using `InfiniteScrollList`:

```tsx
<ProjectsTabWrapperWithPagination {...props} useInfiniteScroll={true} pageSize={50} />
```

### Virtual Table Example

See `VersionsTabWrapperWithPagination.tsx` for a complete example of using `VirtualTable`:

```tsx
<VersionsTabWrapperWithPagination {...props} useVirtualTable={true} pageSize={100} />
```

## When to Use Each Component

### Use InfiniteScrollList when:

- Displaying card-based layouts
- User experience benefits from continuous scrolling
- Items have variable heights
- Mobile-first design

### Use VirtualTable when:

- Displaying tabular data
- Need to show many columns
- Consistent row heights
- Desktop-first design
- Performance is critical (1000+ items)

## Performance Tips

1. **Page Size**: Balance between performance and UX
   - InfiniteScrollList: 25-50 items per page
   - VirtualTable: 50-100 items per page

2. **Memoization**: Use `useMemo` for filtered data to prevent unnecessary recalculations

3. **Backend Pagination**: Currently using client-side pagination. Migrate to backend pagination for best performance:

   ```tsx
   queryFn: ({ pageParam, limit }) => apiService.getProjectsPaginated(pageParam, limit);
   ```

4. **Stale Time**: Adjust based on data volatility
   - Frequently changing data: 1-2 minutes
   - Stable data: 5-10 minutes

## Migration Guide

To migrate existing components to use pagination:

1. **Install dependencies** (already done):

   ```bash
   npm install react-window react-infinite-scroll-component @tanstack/react-virtual
   ```

2. **Create paginated hook**:

   ```tsx
   export function useProjectsPaginated(options?) {
     return usePaginatedQuery({
       queryKey: ['projects', 'paginated'],
       queryFn: ({ pageParam, limit }) => {
         // For now, use client-side pagination
         const allProjects = await apiService.getProjects();
         return paginateArray(allProjects, pageParam, limit);
       },
       limit: options?.limit || 50,
     });
   }
   ```

3. **Update component**:

   ```tsx
   const { flatData, hasMore, loadMore, isLoading } = useProjectsPaginated();

   return (
     <InfiniteScrollList
       items={flatData}
       hasMore={hasMore}
       loadMore={loadMore}
       renderItem={(item) => <ItemCard item={item} />}
     />
   );
   ```

## Future Enhancements

- [ ] Backend API pagination support
- [ ] Sort and filter integration
- [ ] Keyboard navigation for virtual table
- [ ] Column resizing for virtual table
- [ ] Export functionality
- [ ] Bulk actions support
