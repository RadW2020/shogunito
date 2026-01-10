import { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../../../../shared/api/client';
import type { Note } from '../../../../../shared/api/client';

export interface NotesCount {
  totalCount: number;
  unreadCount: number;
}

export interface EntityWithNotesCount {
  [key: string]: any;
  notesCount?: NotesCount;
}

export const useNotesSorting = <T extends EntityWithNotesCount>(
  data: T[],
  linkIdField: string,
  linkType: string,
) => {
  const [notesCounts, setNotesCounts] = useState<Record<string, NotesCount>>({});
  const [loading, setLoading] = useState(false);

  // Fetch notes counts for all entities
  useEffect(() => {
    const fetchNotesCounts = async () => {
      if (data.length === 0) return;

      setLoading(true);
      try {
        const counts: Record<string, NotesCount> = {};

        // Fetch notes for all entities in parallel
        const promises = data.map(async (item) => {
          const linkId = item[linkIdField];
          if (!linkId) return { linkId, count: { totalCount: 0, unreadCount: 0 } };

          try {
            const notes = await apiService.getNotesByEntity(linkId, linkType);
            const unreadCount = notes.filter((note: Note) => !note.isRead).length;
            return {
              linkId,
              count: {
                totalCount: notes.length,
                unreadCount,
              },
            };
          } catch (error) {
            console.error(`Error fetching notes for ${linkId}:`, error);
            return {
              linkId,
              count: { totalCount: 0, unreadCount: 0 },
            };
          }
        });

        const results = await Promise.all(promises);

        // Build the counts object
        results.forEach(({ linkId, count }) => {
          counts[linkId] = count;
        });

        setNotesCounts(counts);
      } catch (error) {
        console.error('Error fetching notes counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotesCounts();
  }, [data, linkIdField, linkType]);

  // Add notes counts to the data
  const dataWithNotesCounts = useMemo(() => {
    return data.map((item) => ({
      ...item,
      notesCount: notesCounts[item[linkIdField]] || {
        totalCount: 0,
        unreadCount: 0,
      },
    }));
  }, [data, notesCounts, linkIdField]);

  // Custom sorting function for notes
  const sortByUnreadNotes = (
    a: T & { notesCount: NotesCount },
    b: T & { notesCount: NotesCount },
  ) => {
    const aUnread = a.notesCount?.unreadCount || 0;
    const bUnread = b.notesCount?.unreadCount || 0;

    // Sort by unread count (descending - highest first)
    if (aUnread !== bUnread) {
      return bUnread - aUnread;
    }

    // If unread counts are equal, sort by total count (descending)
    const aTotal = a.notesCount?.totalCount || 0;
    const bTotal = b.notesCount?.totalCount || 0;
    return bTotal - aTotal;
  };

  return {
    dataWithNotesCounts,
    loading,
    sortByUnreadNotes,
  };
};
