import React from 'react';
import { DataTable, type TableColumn } from '../DataTable';
import { StatusBadge } from '../StatusBadge';
import type { Status, StatusMeta, TabType } from '@shogunito/shared';

interface StatusTabProps {
  statuses: Status[];
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Status[], checked: boolean) => void;
  onItemClick: (type: TabType, item: Status) => void;
  onEditStatus?: (status: Status) => void;
}

export const StatusTab: React.FC<StatusTabProps> = ({
  statuses,
  selectedItems,
  onItemSelect,
  onSelectAll,
  onItemClick,
  onEditStatus,
}) => {
  const columns: TableColumn[] = [
    { label: 'Code', field: 'code' },
    { label: 'Name', field: 'name' },
    {
      label: 'Color',
      field: 'color',
      render: (item: Status) => (
        <StatusBadge status={item.code} meta={{ label: item.name, color: item.color }} />
      ),
    },
    {
      label: 'Applicable Entities',
      field: 'applicableEntities',
      render: (item: Status) => item.applicableEntities.join(', '),
    },
    {
      label: 'Active',
      field: 'isActive',
      render: (item: Status) => (
        <span className={item.isActive ? 'text-green-600' : 'text-red-600'}>
          {item.isActive ? '✓' : '✗'}
        </span>
      ),
    },
    { label: 'Sort Order', field: 'sortOrder' },
    { label: 'Description', field: 'description' },
    {
      label: 'Actions',
      field: 'actions',
      render: (item: Status) => (
        <div className="flex space-x-2">
          {onEditStatus && (
            <button
              onClick={() => onEditStatus(item)}
              className="px-2 py-1 text-xs rounded transition-colors"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--text-primary)',
              }}
              title="Edit Status"
            >
              Edit
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={statuses}
      entityType="status"
      selectedItems={selectedItems}
      onItemSelect={onItemSelect}
      onSelectAll={onSelectAll}
      onItemClick={onItemClick}
    />
  );
};
