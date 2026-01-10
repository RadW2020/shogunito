import React from 'react';
import { useNotesByEntity } from '../../../features/notes/api/useNotes';

export type LinkType =
  | 'Project'
  | 'Episode'
  | 'Asset'
  | 'Sequence'
  | 'Shot'
  | 'Playlist'
  | 'Version';

interface NoteBadgeProps {
  linkId: string | number;
  linkType: LinkType;
  linkName?: string;
  showCount?: boolean;
  showUnread?: boolean;
  onClick?: () => void;
  className?: string;
}

export const NoteBadge: React.FC<NoteBadgeProps> = ({
  linkId,
  linkType,
  showCount = true,
  showUnread = true,
  onClick,
  className = '',
}) => {
  const { data: notes = [], isLoading: loading } = useNotesByEntity(linkId, linkType);

  const unreadCount = notes.filter((note) => !note.isRead).length;
  const totalCount = notes.length;

  if (loading) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <div
          className="w-4 h-4 rounded-full animate-pulse"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        />
      </div>
    );
  }

  if (totalCount === 0) {
    return null;
  }

  const getBadgeColor = () => {
    if (unreadCount > 0) {
      return {
        backgroundColor: 'var(--status-error)',
        color: 'white',
      };
    }
    return {
      backgroundColor: 'var(--bg-tertiary)',
      color: 'var(--text-secondary)',
    };
  };

  const getIcon = () => {
    if (unreadCount > 0) {
      return '🔴'; // Red dot for unread
    }
    return '💬'; // Chat bubble for read notes
  };

  return (
    <div
      className={`inline-flex items-center space-x-1 cursor-pointer ${className}`}
      onClick={() => {
        console.log('NoteBadge clicked:', {
          linkId,
          linkType,
          totalCount,
          unreadCount,
        });
        onClick?.();
      }}
      title={`${totalCount} note${totalCount !== 1 ? 's' : ''}${unreadCount > 0 ? ` (${unreadCount} unread)` : ''} - Click to view notes`}
    >
      <span className="text-xs">{getIcon()}</span>
      {showCount && (
        <span className="px-1.5 py-0.5 text-xs rounded-full font-medium" style={getBadgeColor()}>
          {showUnread && unreadCount > 0 ? unreadCount : totalCount}
        </span>
      )}
    </div>
  );
};

// Componente más simple para mostrar solo el icono
export const NoteIcon: React.FC<Omit<NoteBadgeProps, 'showCount' | 'showUnread'>> = ({
  linkId,
  linkType,
  onClick,
  className = '',
}) => {
  return (
    <NoteBadge
      linkId={linkId}
      linkType={linkType}
      showCount={false}
      showUnread={true}
      onClick={onClick}
      className={className}
    />
  );
};
