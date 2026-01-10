import React from 'react';
import type { TabType, StatusMeta } from '@shogun/shared';
import { ProjectsTabWrapper } from '@features/projects/components/ProjectsTabWrapper';
import { EpisodesTabWrapper } from '@features/episodes/components/EpisodesTabWrapper';
import { AssetsTabWrapper } from '@features/assets/components/AssetsTabWrapper';
import { SequencesTabWrapper } from '@features/sequences/components/SequencesTabWrapper';
import { ShotsTabWrapper } from '@features/shots/components/ShotsTabWrapper';
import { VersionsTabWrapper } from '@features/versions/components/VersionsTabWrapper';
import { PlaylistsTabWrapper } from '@features/playlists/components/PlaylistsTabWrapper';
import { NotesTabWrapper } from '@features/notes/components/NotesTabWrapper';
import { UsersTab, StatusTab } from './tabs';
import type { Project, Episode, Asset, Sequence, Shot, Status } from '@shogun/shared';
import type { ApiVersion, Playlist } from '@shared/api/client';

interface ShotGridContentProps {
  activeTab: TabType;
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  searchTerm: string;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: { id: string | number; name?: string; code?: string }) => void;
  onEditProject: (project: Project) => void;
  onEditEpisode: (episode: Episode) => void;
  onEditAsset: (asset: Asset) => void;
  onEditSequence: (sequence: Sequence) => void;
  onEditShot: (shot: Shot) => void;
  onEditVersion: (version: ApiVersion) => void;
  onEditPlaylist: (playlist: Playlist) => void;
  onEditStatus: (status: Status) => void;
  onAddNoteToProject: (project: Project) => void;
  onAddNoteToEpisode: (episode: Episode) => void;
  onAddNoteToAsset: (asset: Asset) => void;
  onAddNoteToSequence: (sequence: Sequence) => void;
  onAddNoteToShot: (shot: Shot) => void;
  onAddNoteToVersion: (version: ApiVersion) => void;
  onAddNoteToPlaylist: (playlist: Playlist) => void;
  onViewNotes: (linkId: string, linkType: string, linkName: string) => void;
  onRefresh: () => Promise<void>;
  onClearSearch: () => void;
  projects: Project[];
  episodes: Episode[];
  assets: Asset[];
  sequences: Sequence[];
  shots: Shot[];
  versions: ApiVersion[];
  playlists: Playlist[];
  statuses: Status[];
  users: Array<{
    id: string;
    name: string;
    email: string | undefined;
    role: string;
  }>;
}

/**
 * Component for rendering the active tab content in ShotGrid
 */
export const ShotGridContent: React.FC<ShotGridContentProps> = ({
  activeTab,
  statusMap,
  selectedItems,
  searchTerm,
  onItemSelect,
  onSelectAll,
  onItemClick,
  onEditProject,
  onEditEpisode,
  onEditAsset,
  onEditSequence,
  onEditShot,
  onEditVersion,
  onEditPlaylist,
  onEditStatus,
  onAddNoteToProject,
  onAddNoteToEpisode,
  onAddNoteToAsset,
  onAddNoteToSequence,
  onAddNoteToShot,
  onAddNoteToVersion,
  onAddNoteToPlaylist,
  onViewNotes,
  onRefresh,
  onClearSearch,
  // Destructure but don't use these props - they're passed from parent but not needed here
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  projects: _projects,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  episodes: _episodes,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  assets: _assets,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sequences: _sequences,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shots: _shots,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  versions: _versions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  playlists: _playlists,
  statuses: _statuses,
  users,
}) => {
  switch (activeTab) {
    case 'projects':
      return (
        <ProjectsTabWrapper
          statusMap={statusMap}
          selectedItems={selectedItems}
          searchTerm={searchTerm}
          onItemSelect={onItemSelect}
          onSelectAll={onSelectAll}
          onItemClick={onItemClick}
          onEditProject={onEditProject}
          onAddNoteToProject={onAddNoteToProject}
          onViewNotes={onViewNotes}
        />
      );

    case 'episodes':
      return (
        <EpisodesTabWrapper
          statusMap={statusMap}
          selectedItems={selectedItems}
          searchTerm={searchTerm}
          onItemSelect={onItemSelect}
          onSelectAll={onSelectAll}
          onItemClick={onItemClick}
          onEditEpisode={onEditEpisode}
          onAddNoteToEpisode={onAddNoteToEpisode}
          onViewNotes={onViewNotes}
        />
      );

    case 'assets':
      return (
        <AssetsTabWrapper
          statusMap={statusMap}
          selectedItems={selectedItems}
          searchTerm={searchTerm}
          onItemSelect={onItemSelect}
          onSelectAll={onSelectAll}
          onItemClick={onItemClick}
          onEditAsset={onEditAsset}
          onAddNoteToAsset={onAddNoteToAsset}
          onViewNotes={onViewNotes}
        />
      );

    case 'sequences':
      return (
        <SequencesTabWrapper
          statusMap={statusMap}
          selectedItems={selectedItems}
          searchTerm={searchTerm}
          onItemSelect={onItemSelect}
          onSelectAll={onSelectAll}
          onItemClick={onItemClick}
          onEditSequence={onEditSequence}
          onAddNoteToSequence={onAddNoteToSequence}
          onViewNotes={onViewNotes}
        />
      );

    case 'shots':
      return (
        <ShotsTabWrapper
          statusMap={statusMap}
          selectedItems={selectedItems}
          searchTerm={searchTerm}
          onItemSelect={onItemSelect}
          onSelectAll={onSelectAll}
          onItemClick={onItemClick}
          onEditShot={onEditShot}
          onAddNoteToShot={onAddNoteToShot}
          onViewNotes={onViewNotes}
        />
      );

    case 'versions':
      return (
        <VersionsTabWrapper
          statusMap={statusMap}
          selectedItems={selectedItems}
          searchTerm={searchTerm}
          onItemSelect={onItemSelect}
          onSelectAll={onSelectAll}
          onItemClick={onItemClick}
          onEditVersion={onEditVersion}
          onAddNoteToVersion={onAddNoteToVersion}
          onViewNotes={onViewNotes}
        />
      );

    case 'playlists':
      return (
        <PlaylistsTabWrapper
          statusMap={statusMap}
          selectedItems={selectedItems}
          searchTerm={searchTerm}
          onItemSelect={onItemSelect}
          onSelectAll={onSelectAll}
          onItemClick={onItemClick}
          onEditPlaylist={onEditPlaylist}
          onAddNoteToPlaylist={onAddNoteToPlaylist}
          onViewNotes={onViewNotes}
        />
      );

    case 'notes': {
      return (
        <NotesTabWrapper
          statusMap={statusMap}
          selectedItems={selectedItems}
          searchTerm={searchTerm}
          onItemSelect={onItemSelect}
          onSelectAll={onSelectAll}
          onItemClick={onItemClick}
          onRefresh={onRefresh}
          onClearSearch={onClearSearch}
        />
      );
    }

    case 'users': {
      return (
        <UsersTab
          users={users}
          statusMap={statusMap}
          selectedItems={selectedItems}
          onItemSelect={onItemSelect}
          onSelectAll={onSelectAll}
          onItemClick={onItemClick}
        />
      );
    }

    case 'status': {
      return (
        <StatusTab
          statuses={_statuses}
          statusMap={statusMap}
          selectedItems={selectedItems}
          onItemSelect={onItemSelect}
          onSelectAll={onSelectAll}
          onItemClick={onItemClick}
          onEditStatus={onEditStatus}
        />
      );
    }

    default:
      return <div className="p-6">Tab not implemented yet</div>;
  }
};
