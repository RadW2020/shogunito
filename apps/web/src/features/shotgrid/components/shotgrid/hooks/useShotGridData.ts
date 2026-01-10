import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiService } from '@shared/api/client';
import type { Project, Episode, Asset, Sequence, Status } from '@shogun/shared';
import type { ApiVersion } from '@shared/api/client';

// Simplified user type for UI display
interface DisplayUser {
  id: string;
  name: string;
  email: string | undefined;
  role: string;
}

interface UseShotGridDataReturn {
  // Data
  projects: Project[];
  episodes: Episode[];
  assets: Asset[];
  sequences: Sequence[];
  versions: ApiVersion[];
  statuses: Status[];
  users: DisplayUser[];

  // Loading state
  isRefreshing: boolean;
  lastRefreshTime: Date | null;

  // Actions
  refreshData: () => Promise<void>;
}

/**
 * Hook to manage data loading and state for ShotGrid component
 * Consolidates all API data fetching and state management
 */
export function useShotGridData(): UseShotGridDataReturn {
  const queryClient = useQueryClient();

  // Loading state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [versions, setVersions] = useState<ApiVersion[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [users, setUsers] = useState<DisplayUser[]>([]);

  // Function to refresh all data
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Invalidate React Query caches first to ensure fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['projects', 'paginated'] }),
        queryClient.invalidateQueries({ queryKey: ['episodes'] }),
        queryClient.invalidateQueries({ queryKey: ['assets'] }),
        queryClient.invalidateQueries({ queryKey: ['sequences'] }),
        queryClient.invalidateQueries({ queryKey: ['versions'] }),
        queryClient.invalidateQueries({ queryKey: ['statuses'] }),
      ]);

      // Load all necessary data regardless of active tab
      // Use Promise.allSettled to prevent one failing request from blocking all others
      const results = await Promise.allSettled([
        apiService.getProjects(),
        apiService.getEpisodes(),
        apiService.getAssets(),
        apiService.getSequences(),
        apiService.getVersions(),
        apiService.getStatuses(),
        apiService.getUsers(),
      ]);

      // Extract data from results, using empty arrays for failed requests
      const projectsData = results[0].status === 'fulfilled' ? results[0].value : (console.error('Failed to load projects:', results[0].reason), []);
      const episodesData = results[1].status === 'fulfilled' ? results[1].value : (console.error('Failed to load episodes:', results[1].reason), []);
      const assetsData = results[2].status === 'fulfilled' ? results[2].value : (console.error('Failed to load assets:', results[2].reason), []);
      const sequencesData = results[3].status === 'fulfilled' ? results[3].value : (console.error('Failed to load sequences:', results[3].reason), []);
      const versionsData = results[4].status === 'fulfilled' ? results[4].value : (console.error('Failed to load versions:', results[4].reason), []);
      const statusesData = results[5].status === 'fulfilled' ? results[5].value : (console.error('Failed to load statuses:', results[5].reason), []);
      const usersData = results[6].status === 'fulfilled' ? results[6].value : (console.error('Failed to load users:', results[6].reason), []);

      console.log('Refreshed data. Projects:', projectsData.length, 'Statuses:', statusesData.length, statusesData);

      // Update local state
      setProjects(projectsData);
      setEpisodes(episodesData);
      setAssets(assetsData);
      setSequences(sequencesData);
      setVersions(versionsData);
      setStatuses(statusesData);
      setUsers(
        usersData.map((u) => ({
          id: String(u.id),
          name: u.name,
          email: u.email,
          role: u.role,
        })),
      );

      // Refetch React Query caches to sync with local state
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['projects'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['projects', 'paginated'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['episodes'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['assets'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['sequences'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['versions'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['statuses'], type: 'active' }),
      ]);

      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
      console.log('Full error details:', JSON.stringify(error, null, 2));
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  // Load initial data
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Statuses are loaded in refreshData(), no need for separate useEffect

  return {
    projects,
    episodes,
    assets,
    sequences,
    versions,
    statuses,
    users,
    isRefreshing,
    lastRefreshTime,
    refreshData,
  };
}
