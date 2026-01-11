import React from 'react';
import { DataTable, type TableColumn } from '../DataTable';
import { StatusBadge } from '../StatusBadge';
import { NoteBadge } from '../../../../../shared/components/shared/NoteBadge';
import { useNotesSorting } from '../hooks/useNotesSorting';
import { useNotesByEntity } from '../../../../../features/notes/api/useNotes';
import type { Episode, StatusMeta, TabType } from '@shogunito/shared';

interface NotesCellProps {
  item: Episode;
  onAddNote?: (episode: Episode) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

const NotesCell: React.FC<NotesCellProps> = ({ item, onAddNote, onViewNotes }) => {
  const { data: notes = [], isLoading } = useNotesByEntity(item.id, 'Episode');
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
          linkType="Episode"
          showCount={true}
          showUnread={true}
          onClick={() => onViewNotes?.(String(item.id), 'Episode', item.name)}
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

interface EpisodesTabProps {
  episodes: Episode[];
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: Episode) => void;
  onEditEpisode?: (episode: Episode) => void;
  onAddNoteToEpisode?: (episode: Episode) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

export const EpisodesTab: React.FC<EpisodesTabProps> = ({
  episodes,
  statusMap,
  selectedItems,
  onItemSelect,
  onSelectAll,
  onItemClick,
  onEditEpisode,
  onAddNoteToEpisode,
  onViewNotes,
}) => {
  // Use notes sorting hook
  const { dataWithNotesCounts, sortByUnreadNotes } = useNotesSorting(episodes, 'code', 'Episode');

  // Calculate duration sum
  const durationSum = episodes.reduce((sum, episode) => {
    const duration = episode.duration;
    return sum + (typeof duration === 'number' ? duration : 0);
  }, 0);

  // Prepare footer data
  const footerData = {
    duration: `${durationSum}s`,
  };
  const columns: TableColumn[] = [
    {
      label: '#',
      field: 'epNumber',
      render: (item: Episode) => item.epNumber ?? '',
    },
    { label: 'Code', field: 'code' },
    { label: 'Name', field: 'name' },
    {
      label: 'Status',
      field: 'status',
      render: (item: Episode) => {
        if (!item.status) return <span>-</span>;
        return <StatusBadge status={item.status} meta={statusMap[item.status]} />;
      },
    },
    {
      label: 'Duration',
      field: 'duration',
      render: (item: Episode) => `${item.duration}s`,
    },
    {
      label: 'Updated',
      field: 'updatedAt',
      render: (item: Episode) => new Date(item.updatedAt).toLocaleDateString(),
    },
    {
      label: 'Notes',
      field: 'notes',
      render: (item: Episode) => (
        <NotesCell
          item={item}
          onAddNote={onAddNoteToEpisode}
          onViewNotes={onViewNotes}
        />
      ),
    },
    {
      label: 'Actions',
      field: 'actions',
      render: (item: Episode) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEditEpisode?.(item)}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
            title="Edit Episode"
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
      entityType="episodes"
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
