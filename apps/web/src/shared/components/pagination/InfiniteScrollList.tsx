import { type ReactNode } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { LoadingSpinner } from '@shared/ui';

export interface InfiniteScrollListProps<T> {
  items: T[];
  hasMore: boolean;
  loadMore: () => void;
  renderItem: (item: T, index: number) => ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  endMessage?: string;
  height?: number | string;
  className?: string;
  scrollableTarget?: string;
}

/**
 * Reusable Infinite Scroll List Component
 *
 * Provides a virtualized list with infinite scroll capabilities.
 * Automatically loads more items when scrolling near the end.
 *
 * @example
 * <InfiniteScrollList
 *   items={projects}
 *   hasMore={hasMore}
 *   loadMore={loadMore}
 *   renderItem={(project) => <ProjectCard key={project.id} project={project} />}
 *   emptyMessage="No projects found"
 * />
 */
export function InfiniteScrollList<T>({
  items,
  hasMore,
  loadMore,
  renderItem,
  isLoading = false,
  emptyMessage = 'No items found',
  endMessage = 'No more items to load',
  height = '600px',
  className = '',
  scrollableTarget,
}: InfiniteScrollListProps<T>) {
  // Show loading state if initially loading
  if (isLoading && items.length === 0) {
    return (
      <div
        className="flex items-center justify-center p-12"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading...
        </span>
      </div>
    );
  }

  // Show empty state if no items
  if (!isLoading && items.length === 0) {
    return (
      <div
        className="flex items-center justify-center p-12"
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          color: 'var(--text-secondary)',
        }}
      >
        <div className="text-center">
          <div className="text-4xl mb-4">📭</div>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <InfiniteScroll
      dataLength={items.length}
      next={loadMore}
      hasMore={hasMore}
      loader={
        <div className="flex justify-center p-4">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Loading more...
          </span>
        </div>
      }
      endMessage={
        items.length > 0 && (
          <div className="text-center p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {endMessage}
          </div>
        )
      }
      height={height}
      scrollableTarget={scrollableTarget}
      className={className}
    >
      <div className="space-y-2">{items.map((item, index) => renderItem(item, index))}</div>
    </InfiniteScroll>
  );
}
