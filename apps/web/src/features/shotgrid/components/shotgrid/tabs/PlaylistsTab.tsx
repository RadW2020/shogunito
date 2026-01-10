import React, { useState } from 'react';
import { DataTable, type TableColumn } from '../DataTable';
import { StatusBadge } from '../StatusBadge';
import { NoteBadge } from '../../../../../shared/components/shared/NoteBadge';
import { PlaylistPlayerModal } from '../../../../../shared/components/modals/PlaylistPlayerModal';
import { useNotesSorting } from '../hooks/useNotesSorting';
import { useNotesByEntity } from '../../../../../features/notes/api/useNotes';
import type { StatusMeta, TabType } from '@shogun/shared';
import type { Playlist } from '@shared/api/client';

interface PlaylistNotesCellProps {
  item: Playlist;
  onAddNote?: (playlist: Playlist) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

const PlaylistNotesCell: React.FC<PlaylistNotesCellProps> = ({ item, onAddNote, onViewNotes }) => {
  const { data: notes = [], isLoading } = useNotesByEntity(item.id, 'Playlist');
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
          linkType="Playlist"
          showCount={true}
          showUnread={true}
          onClick={() => onViewNotes?.(String(item.id), 'Playlist', item.name)}
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

interface PlaylistsTabProps {
  playlists: Playlist[];
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: Playlist) => void;
  onEditPlaylist?: (playlist: Playlist) => void;
  onAddNoteToPlaylist?: (playlist: Playlist) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

export const PlaylistsTab: React.FC<PlaylistsTabProps> = ({
  playlists,
  statusMap,
  selectedItems,
  onItemSelect,
  onSelectAll,
  onItemClick,
  onEditPlaylist,
  onAddNoteToPlaylist,
  onViewNotes,
}) => {
  // Use notes sorting hook
  const { dataWithNotesCounts, sortByUnreadNotes } = useNotesSorting(playlists, 'code', 'Playlist');

  // Playlist player modal state
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  const handlePlayPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setPlayerModalOpen(true);
  };

  const handleClosePlayerModal = () => {
    setPlayerModalOpen(false);
    setSelectedPlaylist(null);
  };

  const columns: TableColumn[] = [
    { label: 'Code', field: 'code' },
    { label: 'Name', field: 'name' },
    {
      label: 'Status',
      field: 'statusId',
      render: (item: Playlist) => (
        <StatusBadge status={item.statusId || ''} meta={statusMap[item.statusId || '']} />
      ),
    },
    {
      label: 'Count',
      field: 'versionCodes',
      render: (item: Playlist) => item.versionCodes?.length || 0,
    },
    { label: 'Description', field: 'description' },
    { label: 'Assigned To', field: 'assignedTo' },
    {
      label: 'Notes',
      field: 'notes',
      render: (item: Playlist) => (
        <PlaylistNotesCell
          item={item}
          onAddNote={onAddNoteToPlaylist}
          onViewNotes={onViewNotes}
        />
      ),
    },
    {
      label: 'Actions',
      field: 'actions',
      render: (item: Playlist) => (
        <div className="flex items-center space-x-2">
          {item.versionCodes && item.versionCodes.length > 0 && (
            <button
              onClick={() => handlePlayPlaylist(item)}
              className="px-2 py-1 text-xs rounded transition-colors"
              style={{
                backgroundColor: 'var(--status-info)',
                color: 'white',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = 'var(--status-info-hover)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--status-info)')}
              title="Play Playlist"
            >
              ▶ Play
            </button>
          )}
          <button
            onClick={() => onEditPlaylist?.(item)}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
            title="Edit Playlist"
          >
            Edit
          </button>
        </div>
      ),
    },
    {
      label: 'Created',
      field: 'createdAt',
      render: (item: Playlist) =>
        item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
    },
    {
      label: 'Updated',
      field: 'updatedAt',
      render: (item: Playlist) =>
        item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '-',
    },
    {
      label: 'Status Updated',
      field: 'statusUpdatedAt',
      render: (item: Playlist) =>
        item.statusUpdatedAt ? new Date(item.statusUpdatedAt).toLocaleString() : '-',
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={dataWithNotesCounts}
        entityType="playlists"
        selectedItems={selectedItems}
        onItemSelect={onItemSelect}
        onSelectAll={onSelectAll}
        onItemClick={onItemClick}
        customSortFunctions={{
          notes: sortByUnreadNotes,
        }}
      />

      {/* Playlist Player Modal */}
      {selectedPlaylist && (
        <PlaylistPlayerModal
          isOpen={playerModalOpen}
          onClose={handleClosePlayerModal}
          playlist={selectedPlaylist}
        />
      )}
    </>
  );
};
