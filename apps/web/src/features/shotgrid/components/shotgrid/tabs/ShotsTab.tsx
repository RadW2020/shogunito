import React, { useState } from 'react';
import { DataTable, type TableColumn } from '../DataTable';
import { StatusBadge } from '../StatusBadge';
import { NoteBadge } from '../../../../../shared/components/shared/NoteBadge';
import { NotesPanel } from '../../../../../shared/components/shared/NotesPanel';
import { useNotesSorting } from '../hooks/useNotesSorting';
import { useNotesByEntity } from '../../../../../features/notes/api/useNotes';
import type { Shot, StatusMeta, TabType } from '@shogun/shared';

interface ShotNotesCellProps {
  item: Shot;
  onAddNote?: (shot: Shot) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

const ShotNotesCell: React.FC<ShotNotesCellProps> = ({ item, onAddNote, onViewNotes }) => {
  const { data: notes = [], isLoading } = useNotesByEntity(item.id, 'Shot');
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
          linkType="Shot"
          showCount={true}
          showUnread={true}
          onClick={() => onViewNotes?.(String(item.id), 'Shot', item.name)}
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

interface ShotsTabProps {
  shots: Shot[];
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: Shot) => void;
  onEditShot?: (shot: Shot) => void;
  onAddNoteToShot?: (shot: Shot) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

export const ShotsTab: React.FC<ShotsTabProps> = ({
  shots,
  statusMap,
  selectedItems,
  onItemSelect,
  onSelectAll,
  onItemClick,
  onEditShot,
  onAddNoteToShot,
  onViewNotes,
}) => {
  // Use notes sorting hook
  const { dataWithNotesCounts, sortByUnreadNotes } = useNotesSorting(shots, 'code', 'Shot');

  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);

  // Calculate total duration
  const totalDuration = shots.reduce((sum, shot) => {
    return sum + (shot.duration || 0);
  }, 0);

  // Prepare footer data
  const footerData = {
    duration: totalDuration,
  };

  const columns: TableColumn[] = [
    { label: 'CO', field: 'cutOrder' },
    { label: 'Code', field: 'code' },
    { label: 'Name', field: 'name' },
    { label: 'Description', field: 'description' },
    {
      label: 'Status',
      field: 'status',
      render: (item: Shot) => {
        if (!item.status) {
          return (
            <span
              className="badge"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-secondary)',
              }}
            >
              -
            </span>
          );
        }
        return <StatusBadge status={item.status} meta={statusMap[item.status]} />;
      },
    },
    { label: 'Shot Type', field: 'shotType' },
    { label: 'Sequence', field: 'sequenceNumber' },
    {
      label: 'Sequence Code',
      field: 'sequence',
      render: (item: Shot) => <div className="text-sm">{item.sequence?.code || 'N/A'}</div>,
    },
    { label: 'Duration', field: 'duration' },
    { label: 'Assigned To', field: 'assignedTo' },
    {
      label: 'Notes',
      field: 'notes',
      render: (item: Shot) => (
        <ShotNotesCell
          item={item}
          onAddNote={onAddNoteToShot}
          onViewNotes={onViewNotes}
        />
      ),
    },
    {
      label: 'Actions',
      field: 'actions',
      render: (item: Shot) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEditShot?.(item)}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
            title="Edit Shot"
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={dataWithNotesCounts}
        entityType="shots"
        selectedItems={selectedItems}
        onItemSelect={onItemSelect}
        onSelectAll={onSelectAll}
        onItemClick={onItemClick}
        footerData={footerData}
        customSortFunctions={{
          notes: sortByUnreadNotes,
        }}
      />

      {/* Notes Panel */}
      {selectedShot && (
        <NotesPanel
          linkId={selectedShot.id}
          linkType="Shot"
          linkName={selectedShot.name}
          isOpen={notesPanelOpen}
          onClose={() => {
            setNotesPanelOpen(false);
            setSelectedShot(null);
          }}
        />
      )}
    </>
  );
};
