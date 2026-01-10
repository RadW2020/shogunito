import React from 'react';
import { DataTable, type TableColumn } from '../DataTable';
import { StatusBadge } from '../StatusBadge';
import { NoteBadge } from '../../../../../shared/components/shared/NoteBadge';
import { useNotesSorting } from '../hooks/useNotesSorting';
import { useNotesByEntity } from '../../../../../features/notes/api/useNotes';
import type { Project, StatusMeta, TabType } from '@shogun/shared';

interface ProjectNotesCellProps {
  item: Project;
  onAddNote?: (project: Project) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

const ProjectNotesCell: React.FC<ProjectNotesCellProps> = ({ item, onAddNote, onViewNotes }) => {
  const { data: notes = [], isLoading } = useNotesByEntity(item.id, 'Project');
  const hasNotes = notes.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div
          className="w-4 h-4 rounded-full animate-pulse"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {hasNotes ? (
        <NoteBadge
          linkId={item.id}
          linkType="Project"
          linkName={item.name}
          showCount={true}
          showUnread={true}
          onClick={() => onViewNotes?.(String(item.id), 'Project', item.name)}
          className="cursor-pointer"
        />
      ) : (
        <button
          onClick={() => onAddNote?.(item)}
          className="px-2 py-1 text-xs rounded transition-colors"
          style={{
            backgroundColor: 'var(--status-success)',
            color: 'white',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--status-success-hover)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--status-success)')
          }
          title="Add Note"
        >
          + Note
        </button>
      )}
    </div>
  );
};

interface ProjectsTabProps {
  projects: Project[];
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: Project) => void;
  onEditProject?: (project: Project) => void;
  onAddNoteToProject?: (project: Project) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

export const ProjectsTab: React.FC<ProjectsTabProps> = ({
  projects,
  statusMap,
  selectedItems,
  onItemSelect,
  onSelectAll,
  onItemClick,
  onEditProject,
  onAddNoteToProject,
  onViewNotes,
}) => {
  // Use notes sorting hook
  const { dataWithNotesCounts, sortByUnreadNotes } = useNotesSorting(projects, 'id', 'Project');

  const columns: TableColumn[] = [
    { label: 'Code', field: 'code' },
    { label: 'Name', field: 'name' },
    {
      label: 'Status',
      field: 'status',
      render: (item: Project) => {
        // Prefer status code over statusId for better display
        // The API transforms status to code in transformProject, so item.status should be the code
        const statusKey =
          (typeof item.status === 'string' ? item.status : item.status?.code) ||
          item.statusId ||
          '';
        // Get meta from statusMap, with fallback to statusId lookup
        const meta = statusMap[statusKey] || (item.statusId ? statusMap[item.statusId] : undefined);
        return <StatusBadge status={statusKey} meta={meta} />;
      },
    },
    { label: 'Client', field: 'clientName' },
    { label: 'Start Date', field: 'startDate' },
    { label: 'End Date', field: 'endDate' },
    {
      label: 'Notes',
      field: 'notes',
      render: (item: Project) => (
        <ProjectNotesCell
          item={item}
          onAddNote={onAddNoteToProject}
          onViewNotes={onViewNotes}
        />
      ),
    },
    {
      label: 'Actions',
      field: 'actions',
      render: (item: Project) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEditProject?.(item)}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
            title="Edit Project"
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={dataWithNotesCounts}
      entityType="projects"
      selectedItems={selectedItems}
      onItemSelect={onItemSelect}
      onSelectAll={onSelectAll}
      onItemClick={onItemClick}
      customSortFunctions={{
        notes: sortByUnreadNotes,
      }}
    />
  );
};
