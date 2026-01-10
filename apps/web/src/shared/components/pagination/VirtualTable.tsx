import { type ReactNode, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { LoadingSpinner } from '@shared/ui';

export interface VirtualTableColumn<T> {
  key: string;
  header: string;
  width?: number | string;
  render: (item: T, index: number) => ReactNode;
  className?: string;
}

export interface VirtualTableProps<T> {
  items: T[];
  columns: VirtualTableColumn<T>[];
  hasMore: boolean;
  loadMore: () => void;
  isLoading?: boolean;
  rowHeight?: number;
  height?: number;
  width?: string | number;
  emptyMessage?: string;
  onRowClick?: (item: T, index: number) => void;
  className?: string;
}

/**
 * Virtualized Table Component for Large Datasets
 *
 * Uses react-window for efficient rendering of large tables.
 * Only renders visible rows, significantly improving performance.
 *
 * @example
 * <VirtualTable
 *   items={versions}
 *   columns={[
 *     { key: 'code', header: 'Code', render: (v) => v.code },
 *     { key: 'name', header: 'Name', render: (v) => v.name },
 *   ]}
 *   hasMore={hasMore}
 *   loadMore={loadMore}
 *   rowHeight={60}
 *   height={600}
 * />
 */
export function VirtualTable<T>({
  items,
  columns,
  hasMore,
  loadMore,
  isLoading = false,
  rowHeight = 60,
  height = 600,
  width = '100%',
  emptyMessage = 'No items found',
  onRowClick,
  className = '',
}: VirtualTableProps<T>) {
  const listRef = useRef<List>(null);

  // Show loading state if initially loading
  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center p-12" style={{ height: `${height}px` }}>
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
          height: `${height}px`,
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

  // Determine if an item is loaded
  const isItemLoaded = (index: number) => !hasMore || index < items.length;

  // Load more items when scrolling near the end
  const loadMoreItems = isLoading ? () => {} : loadMore;

  const itemCount = hasMore ? items.length + 1 : items.length;

  // Render a single row
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    if (!isItemLoaded(index)) {
      return (
        <div style={style} className="flex items-center justify-center">
          <LoadingSpinner size="sm" />
        </div>
      );
    }

    const item = items[index];
    if (!item) return null;

    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-primary)',
          cursor: onRowClick ? 'pointer' : 'default',
        }}
        className={`hover:bg-opacity-50 ${onRowClick ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : ''}`}
        onClick={() => onRowClick?.(item, index)}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            style={{
              width: column.width || `${100 / columns.length}%`,
              padding: '0 12px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            className={column.className}
          >
            {column.render(item, index)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Table Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '48px',
          borderBottom: '2px solid var(--border-primary)',
          backgroundColor: 'var(--bg-secondary)',
          fontWeight: 600,
        }}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            style={{
              width: column.width || `${100 / columns.length}%`,
              padding: '0 12px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            className={column.className}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtualized Table Body */}
      <InfiniteLoader
        isItemLoaded={isItemLoaded}
        itemCount={itemCount}
        loadMoreItems={loadMoreItems}
      >
        {({
          onItemsRendered,
          ref,
        }: {
          onItemsRendered: (props: {
            overscanStartIndex: number;
            overscanStopIndex: number;
            visibleStartIndex: number;
            visibleStopIndex: number;
          }) => void;
          ref: (list: any) => void;
        }) => (
          <List
            ref={(list: any) => {
              listRef.current = list;
              ref(list);
            }}
            height={height}
            itemCount={itemCount}
            itemSize={rowHeight}
            onItemsRendered={onItemsRendered}
            width={width}
          >
            {Row}
          </List>
        )}
      </InfiniteLoader>
    </div>
  );
}
