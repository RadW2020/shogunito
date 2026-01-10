import React, { useState, useEffect } from 'react';
import type { TabType } from '@shogun/shared';
import { useSorting, type CustomSortFunction } from './hooks/useSorting';
import { DataTableMobileCard } from './DataTableMobileCard';
import { ScrollIndicator } from './ScrollIndicator';

export interface TableColumn {
  label: string;
  field: string;
  render?: (item: any) => React.ReactNode;
  width?: string;
  hideOnMobile?: boolean; // Optional: hide column on mobile
  priority?: number; // Optional: 1 = always show, 2 = show if space, 3 = collapsible
}

interface DataTableProps {
  columns: TableColumn[];
  data: any[];
  entityType: TabType;
  selectedItems: Set<string>;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: any[], checked: boolean) => void;
  onItemClick: (type: TabType, item: any) => void;
  footerData?: { [key: string]: any };
  customSortFunctions?: Record<string, CustomSortFunction<any>>;
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  entityType,
  selectedItems,
  onItemSelect,
  onSelectAll,
  onItemClick,
  footerData,
  customSortFunctions,
}) => {
  // Use sorting hook
  const { sortedData, handleSort, getSortIcon } = useSorting(data, undefined, customSortFunctions);

  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const [resizing, setResizing] = useState<{
    column: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Mobile view state
  const [isMobileView, setIsMobileView] = useState(false);
  const [showAllColumns, setShowAllColumns] = useState(false);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get visible columns based on view and state
  const getVisibleColumns = () => {
    if (showAllColumns) return columns;

    // On tablet, show high priority columns
    if (!isMobileView) {
      return columns.filter((col) => col.priority !== 3 && !col.hideOnMobile);
    }

    return columns;
  };

  const visibleColumns = getVisibleColumns();
  const hasCollapsibleColumns = columns.some((col) => col.priority === 3 || col.hideOnMobile);

  const initializeColumnWidths = () => {
    const initialWidths: { [key: string]: number } = {};
    columns.forEach((col) => {
      if (col.field === 'epNumber') initialWidths[col.field] = 30;
      else if (col.field === 'cutOrder') initialWidths[col.field] = 60;
      else if (col.field === 'code') initialWidths[col.field] = 100;
      else if (col.field === 'name') initialWidths[col.field] = 150;
      else if (col.field === 'status') initialWidths[col.field] = 80;
      else if (col.field === 'description') initialWidths[col.field] = 200;
      else if (col.field === 'versionNumber') initialWidths[col.field] = 60;
      else if (col.field === 'format') initialWidths[col.field] = 60;
      else if (col.field === 'entityType') initialWidths[col.field] = 80;
      else if (col.field === 'files') initialWidths[col.field] = 80;
      else if (col.field === 'thumbnailPath') initialWidths[col.field] = 80;
      else if (col.field === 'notes') initialWidths[col.field] = 60;
      else if (col.field === 'startDate') initialWidths[col.field] = 100;
      else if (col.field === 'endDate') initialWidths[col.field] = 100;
      else if (col.field === 'clientName') initialWidths[col.field] = 120;
      else initialWidths[col.field] = 100;
    });
    return initialWidths;
  };

  const currentWidths =
    Object.keys(columnWidths).length === 0 ? initializeColumnWidths() : columnWidths;

  useEffect(() => {
    if (Object.keys(columnWidths).length === 0) {
      setColumnWidths(initializeColumnWidths());
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizing) {
        const diff = e.clientX - resizing.startX;
        const newWidth = Math.max(50, resizing.startWidth + diff);
        setColumnWidths((prev) => ({
          ...prev,
          [resizing.column]: newWidth,
        }));
        // Prevent text selection while resizing
        e.preventDefault();
      }
    };

    const handleMouseUp = () => {
      setResizing(null);
      // Restore cursor
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (resizing) {
      // Set cursor for entire document while resizing
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [resizing]);

  const handleMouseDown = (e: React.MouseEvent, columnField: string) => {
    e.preventDefault();
    setResizing({
      column: columnField,
      startX: e.clientX,
      startWidth: currentWidths[columnField] || 150,
    });
  };

  const allSelected =
    sortedData.length > 0 &&
    sortedData.every((item) => item.id && selectedItems.has(String(item.id)));
  const someSelected = sortedData.some((item) => item.id && selectedItems.has(String(item.id)));

  return (
    <div className="flex-1 card">
      {/* Mobile Card View */}
      {isMobileView ? (
        <div className="p-4 space-y-3">
          {/* Select All Header */}
          <div
            className="flex items-center justify-between pb-3 border-b"
            style={{ borderColor: 'var(--border-primary)' }}
          >
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someSelected && !allSelected;
                }}
                onChange={(e) => onSelectAll(sortedData, e.target.checked)}
                className="rounded"
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Select All
              </span>
            </label>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {sortedData.length} items
            </span>
          </div>

          {/* Cards List */}
          {sortedData.map((item) => (
            <DataTableMobileCard
              key={item.id ? String(item.id) : item.code || 'unknown'}
              item={item}
              columns={columns}
              entityType={entityType}
              isSelected={item.id ? selectedItems.has(String(item.id)) : false}
              onItemSelect={onItemSelect}
              onItemClick={onItemClick}
            />
          ))}

          {sortedData.length === 0 && (
            <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              No items to display
            </div>
          )}
        </div>
      ) : (
        /* Desktop Table View */
        <>
          {/* Column Toggle Button */}
          {hasCollapsibleColumns && (
            <div
              className="p-2 border-b flex justify-end"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              <button
                onClick={() => setShowAllColumns(!showAllColumns)}
                className="text-sm px-3 py-1 rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={
                      showAllColumns
                        ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21'
                        : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                    }
                  />
                </svg>
                {showAllColumns ? 'Hide Columns' : 'Show All Columns'}
              </button>
            </div>
          )}

          <ScrollIndicator>
            <table className="table" data-testid={`${entityType}-table`}>
              <thead>
                <tr>
                  <th
                    className="w-10 p-2 text-left border-r"
                    style={{ borderRightColor: 'var(--border-primary)' }}
                  >
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={(e) => onSelectAll(sortedData, e.target.checked)}
                      className="rounded"
                    />
                  </th>
                  {visibleColumns.map((col, index) => (
                    <th
                      key={col.field}
                      className="p-2 text-left border-r last:border-r-0 relative group"
                      style={{
                        width: columnWidths[col.field],
                        minWidth: columnWidths[col.field],
                        maxWidth: columnWidths[col.field],
                        borderRightColor: 'var(--border-primary)',
                      }}
                    >
                      <div className="flex items-center justify-between pr-1">
                        <button
                          onClick={() => handleSort(col.field)}
                          className="font-medium select-none truncate hover:underline flex items-center gap-1 flex-1"
                          style={{ color: 'var(--text-primary)' }}
                          onMouseDown={(e) => {
                            // Prevent resize when clicking on sort button
                            e.stopPropagation();
                          }}
                        >
                          {col.label}
                          <span className="text-xs">{getSortIcon(col.field)}</span>
                        </button>
                        {index < visibleColumns.length - 1 && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:w-1.5 transition-all z-20"
                            style={{
                              backgroundColor: resizing?.column === col.field ? 'var(--accent-primary)' : 'transparent',
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleMouseDown(e, col.field);
                            }}
                            onMouseEnter={(e) => {
                              if (!resizing) {
                                e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!resizing) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                            title="Drag to resize column"
                          />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {sortedData.map((item) => {
                  const itemId = item.id ? String(item.id) : null;
                  return (
                    <tr
                      key={itemId || item.code || 'unknown'}
                      className="transition-colors"
                      style={{
                        borderBottom: '1px solid var(--border-secondary)',
                        backgroundColor:
                          itemId && selectedItems.has(itemId)
                            ? 'var(--bg-selected)'
                            : 'transparent',
                      }}
                    >
                      <td
                        className="w-10 p-2 border-r"
                        style={{ borderRightColor: 'var(--border-primary)' }}
                      >
                        <input
                          type="checkbox"
                          checked={itemId ? selectedItems.has(itemId) : false}
                          onChange={(e) => {
                            if (itemId) {
                              onItemSelect(itemId, e.target.checked);
                            }
                          }}
                          className="rounded"
                        />
                      </td>
                      {visibleColumns.map((col) => (
                        <td
                          key={col.field}
                          className="p-2 border-r last:border-r-0"
                          style={{
                            width: columnWidths[col.field],
                            minWidth: columnWidths[col.field],
                            maxWidth: columnWidths[col.field],
                            borderRightColor: 'var(--border-primary)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <div className="truncate">
                            {col.field === 'code' ? (
                              <button
                                onClick={() => onItemClick(entityType, item)}
                                className="hover:underline font-medium truncate block w-full text-left"
                                style={{ color: 'var(--accent-primary)' }}
                              >
                                {item[col.field]}
                              </button>
                            ) : (
                              <div className="truncate">
                                {col.render ? col.render(item) : item[col.field]}
                              </div>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
              {footerData && (
                <tfoot>
                  <tr
                    className="font-medium"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      borderTop: '2px solid var(--border-primary)',
                    }}
                  >
                    <td
                      className="p-2 border-r"
                      style={{ borderRightColor: 'var(--border-primary)' }}
                    >
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        Total
                      </div>
                    </td>
                    {visibleColumns.map((col) => (
                      <td
                        key={col.field}
                        className="p-2 border-r last:border-r-0"
                        style={{
                          width: columnWidths[col.field],
                          minWidth: columnWidths[col.field],
                          maxWidth: columnWidths[col.field],
                          borderRightColor: 'var(--border-primary)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <div className="text-sm font-medium">{footerData[col.field] || ''}</div>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </ScrollIndicator>

          {/* Footer - Desktop */}
          <div
            className="border-t p-3 text-sm flex justify-between"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderTopColor: 'var(--border-primary)',
              color: 'var(--text-secondary)',
            }}
          >
            <span>{data.length} items</span>
            {selectedItems.size > 0 && (
              <span className="font-medium" style={{ color: 'var(--accent-primary)' }}>
                {selectedItems.size} selected
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};
