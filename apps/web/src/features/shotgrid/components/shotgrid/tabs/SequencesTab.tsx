import React from 'react';
import { DataTable, type TableColumn } from '../DataTable';
import { StatusBadge } from '../StatusBadge';
import { NoteBadge } from '../../../../../shared/components/shared/NoteBadge';
import { useNotesSorting } from '../hooks/useNotesSorting';
import { useNotesByEntity } from '../../../../../features/notes/api/useNotes';
import type { Sequence, StatusMeta, TabType } from '@shogun/shared';

interface SequenceNotesCellProps {
  item: Sequence;
  onAddNote?: (sequence: Sequence) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

const SequenceNotesCell: React.FC<SequenceNotesCellProps> = ({ item, onAddNote, onViewNotes }) => {
  const { data: notes = [], isLoading } = useNotesByEntity(item.id, 'Sequence');
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
          linkType="Sequence"
          showCount={true}
          showUnread={true}
          onClick={() => onViewNotes?.(String(item.id), 'Sequence', item.name)}
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

interface SequencesTabProps {
  sequences: Sequence[];
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: Sequence) => void;
  onEditSequence?: (sequence: Sequence) => void;
  onAddNoteToSequence?: (sequence: Sequence) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

export const SequencesTab: React.FC<SequencesTabProps> = ({
  sequences,
  statusMap,
  selectedItems,
  onItemSelect,
  onSelectAll,
  onItemClick,
  onEditSequence,
  onAddNoteToSequence,
  onViewNotes,
}) => {
  // Use notes sorting hook
  const { dataWithNotesCounts, sortByUnreadNotes } = useNotesSorting(sequences, 'code', 'Sequence');

  // Calculate duration sum
  const durationSum = sequences.reduce((sum, sequence) => {
    const duration = sequence.duration;
    return sum + (typeof duration === 'number' ? duration : 0);
  }, 0);

  // Prepare footer data
  const footerData = {
    duration: durationSum,
  };
  const columns: TableColumn[] = [
    { label: 'CO', field: 'cutOrder' },
    { label: 'Code', field: 'code' },
    { label: 'Name', field: 'name' },
    {
      label: 'Status',
      field: 'status',
      render: (item: Sequence) => {
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
    { label: 'Duration', field: 'duration' },
    { label: 'Description', field: 'description' },
    {
      label: 'Notes',
      field: 'notes',
      render: (item: Sequence) => (
        <SequenceNotesCell
          item={item}
          onAddNote={onAddNoteToSequence}
          onViewNotes={onViewNotes}
        />
      ),
    },
    {
      label: 'Actions',
      field: 'actions',
      render: (item: Sequence) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEditSequence?.(item)}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
            title="Edit Sequence"
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
      entityType="sequences"
      selectedItems={selectedItems}
      onItemSelect={onItemSelect}
      onSelectAll={onSelectAll}
      onItemClick={onItemClick}
      footerData={footerData}
      customSortFunctions={{
        notes: sortByUnreadNotes,
      }}
    />
  );
};
