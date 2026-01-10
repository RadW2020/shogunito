import React from 'react';
import type { TabType } from '@shogun/shared';
import type { TableColumn } from './DataTable';

interface DataTableMobileCardProps {
  item: any;
  columns: TableColumn[];
  entityType: TabType;
  isSelected: boolean;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onItemClick: (type: TabType, item: any) => void;
}

export const DataTableMobileCard: React.FC<DataTableMobileCardProps> = ({
  item,
  columns,
  entityType,
  isSelected,
  onItemSelect,
  onItemClick,
}) => {
  const itemId = item.code || item.id;

  return (
    <div
      className={`
        border rounded-lg p-4 transition-all
        ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'}
      `}
      style={{
        borderColor: 'var(--border-primary)',
        backgroundColor: isSelected ? 'var(--bg-selected)' : 'var(--bg-secondary)',
      }}
    >
      {/* Card Header - Checkbox + Primary Info */}
      <div className="flex items-start gap-3 mb-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onItemSelect(itemId, e.target.checked)}
          className="rounded mt-1 shrink-0"
          aria-label={`Select ${itemId}`}
        />

        <div className="flex-1 min-w-0">
          {/* Primary Field (usually code) */}
          <button
            onClick={() => onItemClick(entityType, item)}
            className="font-medium text-base hover:underline truncate block w-full text-left mb-1"
            style={{ color: 'var(--accent-primary)' }}
          >
            {item.code || item.name || itemId}
          </button>

          {/* Secondary Field (usually name if code exists) */}
          {item.code && item.name && (
            <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
              {item.name}
            </p>
          )}
        </div>
      </div>

      {/* Card Body - Other Fields */}
      <div className="space-y-2">
        {columns.map((col) => {
          // Skip primary fields already shown
          if (col.field === 'code' || (item.code && col.field === 'name')) {
            return null;
          }

          const value = col.render ? col.render(item) : item[col.field];

          // Skip empty values
          if (!value || (typeof value === 'string' && !value.trim())) {
            return null;
          }

          return (
            <div key={col.field} className="flex justify-between items-start gap-2 text-sm">
              <span className="font-medium shrink-0" style={{ color: 'var(--text-secondary)' }}>
                {col.label}:
              </span>
              <span className="text-right truncate" style={{ color: 'var(--text-primary)' }}>
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
