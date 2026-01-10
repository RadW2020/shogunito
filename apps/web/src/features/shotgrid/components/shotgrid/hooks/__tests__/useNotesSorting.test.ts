import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNotesSorting } from '../useNotesSorting';
import { apiService } from '@shared/api/client';

// Mock the API service
vi.mock('@shared/api/client', () => ({
  apiService: {
    getNotesByEntity: vi.fn(),
  },
}));

describe('useNotesSorting', () => {
  const mockData = [
    { id: '1', code: 'PRJ001', name: 'Project 1' },
    { id: '2', code: 'PRJ002', name: 'Project 2' },
    { id: '3', code: 'PRJ003', name: 'Project 3' },
  ];

  const mockNotes = {
    '1': [
      {
        id: '1',
        linkId: '1',
        linkType: 'Project' as const,
        subject: 'Note 1',
        content: 'Note 1',
        noteType: 'note' as const,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        linkId: '1',
        linkType: 'Project' as const,
        subject: 'Note 2',
        content: 'Note 2',
        noteType: 'note' as const,
        isRead: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    '2': [
      {
        id: '3',
        linkId: '2',
        linkType: 'Project' as const,
        subject: 'Note 3',
        content: 'Note 3',
        noteType: 'note' as const,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    '3': [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiService.getNotesByEntity).mockImplementation(
      async (linkId: string, _linkType: string) => {
        return (mockNotes[linkId as keyof typeof mockNotes] || []) as any;
      },
    );
  });

  describe('Notes fetching', () => {
    it('should fetch notes for all entities', async () => {
      renderHook(() => useNotesSorting(mockData, 'id', 'Project'));

      await waitFor(() => {
        expect(apiService.getNotesByEntity).toHaveBeenCalledTimes(3);
      });
    });

    it('should not fetch notes for entities without id', async () => {
      const dataWithoutIds = [
        { code: 'PRJ001', name: 'Project 1' },
        { id: '2', code: 'PRJ002', name: 'Project 2' },
      ];

      renderHook(() => useNotesSorting(dataWithoutIds, 'id', 'Project'));

      await waitFor(() => {
        // Should only fetch for entity with id
        expect(apiService.getNotesByEntity).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle empty data array', async () => {
      renderHook(() => useNotesSorting([], 'id', 'Project'));

      await waitFor(() => {
        expect(apiService.getNotesByEntity).not.toHaveBeenCalled();
      });
    });
  });

  describe('Notes counts', () => {
    it('should add notes counts to data', async () => {
      const { result } = renderHook(() => useNotesSorting(mockData, 'id', 'Project'));

      await waitFor(
        () => {
          expect(result.current.dataWithNotesCounts).toHaveLength(3);
          const project1 = result.current.dataWithNotesCounts.find((item) => item.id === '1');
          expect(project1?.notesCount?.totalCount).toBeGreaterThan(0);
        },
        { timeout: 3000 },
      );

      const project1 = result.current.dataWithNotesCounts.find((item) => item.id === '1');
      expect(project1?.notesCount).toEqual({
        totalCount: 2,
        unreadCount: 1,
      });
    });

    it('should set zero counts for entities without notes', async () => {
      const { result } = renderHook(() => useNotesSorting(mockData, 'id', 'Project'));

      await waitFor(() => {
        expect(result.current.dataWithNotesCounts).toHaveLength(3);
      });

      const project3 = result.current.dataWithNotesCounts.find((item) => item.id === '3');
      expect(project3?.notesCount).toEqual({
        totalCount: 0,
        unreadCount: 0,
      });
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(apiService.getNotesByEntity).mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useNotesSorting(mockData, 'id', 'Project'));

      await waitFor(() => {
        expect(result.current.dataWithNotesCounts).toHaveLength(3);
      });

      // Should have zero counts for failed entity
      const failedEntity = result.current.dataWithNotesCounts.find((item) => item.id === '1');
      expect(failedEntity?.notesCount).toEqual({
        totalCount: 0,
        unreadCount: 0,
      });
    });
  });

  describe('Sorting function', () => {
    it('should sort by unread count descending', async () => {
      const { result } = renderHook(() => useNotesSorting(mockData, 'id', 'Project'));

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const dataWithCounts = [
        {
          id: '1',
          notesCount: { totalCount: 5, unreadCount: 2 },
        },
        {
          id: '2',
          notesCount: { totalCount: 3, unreadCount: 3 },
        },
        {
          id: '3',
          notesCount: { totalCount: 10, unreadCount: 1 },
        },
      ] as any[];

      const sorted = [...dataWithCounts].sort(result.current.sortByUnreadNotes);

      expect(sorted[0].id).toBe('2'); // Highest unread (3)
      expect(sorted[1].id).toBe('1'); // Second highest unread (2)
      expect(sorted[2].id).toBe('3'); // Lowest unread (1)
    });

    it('should sort by total count when unread counts are equal', async () => {
      const { result } = renderHook(() => useNotesSorting(mockData, 'id', 'Project'));

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const dataWithCounts = [
        {
          id: '1',
          notesCount: { totalCount: 5, unreadCount: 2 },
        },
        {
          id: '2',
          notesCount: { totalCount: 10, unreadCount: 2 },
        },
        {
          id: '3',
          notesCount: { totalCount: 3, unreadCount: 2 },
        },
      ] as any[];

      const sorted = [...dataWithCounts].sort(result.current.sortByUnreadNotes);

      // All have same unread count, so sort by total count descending
      expect(sorted[0].id).toBe('2'); // Highest total (10)
      expect(sorted[1].id).toBe('1'); // Second highest total (5)
      expect(sorted[2].id).toBe('3'); // Lowest total (3)
    });

    it('should handle missing notesCount gracefully', async () => {
      const { result } = renderHook(() => useNotesSorting(mockData, 'id', 'Project'));

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const dataWithCounts = [
        {
          id: '1',
          notesCount: { totalCount: 5, unreadCount: 2 },
        },
        {
          id: '2',
          // Missing notesCount
        },
      ] as any[];

      const sorted = [...dataWithCounts].sort(result.current.sortByUnreadNotes);

      // Should not throw and should handle gracefully
      expect(sorted).toHaveLength(2);
    });
  });

  describe('Loading state', () => {
    it('should set loading to true while fetching', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(apiService.getNotesByEntity).mockReturnValue(promise as any);

      const { result } = renderHook(() => useNotesSorting(mockData, 'id', 'Project'));

      // Should be loading initially
      expect(result.current.loading).toBe(true);

      // Resolve the promise
      resolvePromise!([]);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });
});
