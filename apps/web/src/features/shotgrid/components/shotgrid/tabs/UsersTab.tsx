import React from 'react';
import { DataTable, type TableColumn } from '../DataTable';
import type { User, StatusMeta, TabType } from '@shogunito/shared';

interface UsersTabProps {
  users: User[];
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: User[], checked: boolean) => void;
  onItemClick: (type: TabType, item: User) => void;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  selectedItems,
  onItemSelect,
  onSelectAll,
  onItemClick,
}) => {
  const columns: TableColumn[] = [
    { label: 'Name', field: 'name' },
    { label: 'Email', field: 'email' },
    { label: 'Role', field: 'role' },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      entityType="users"
      selectedItems={selectedItems}
      onItemSelect={onItemSelect}
      onSelectAll={onSelectAll}
      onItemClick={onItemClick}
    />
  );
};
