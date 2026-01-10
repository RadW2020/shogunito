// Base entity interface
export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  assignedTo?: number;
}

export const AssetType = {
  PROMPT: 'prompt',
  TXT: 'txt',
  JSON: 'json',
  SUBTITULOS_INGLES: 'subtitulos_ingles',
  SUBTITULOS_ESPANOL: 'subtitulos_espanol',
  DIRECTOR_SCRIPT: 'director_script',
  AUDIO_ORIGINAL: 'audio_original',
  AUDIO_CARICATURIZADO_INGLES: 'audio_caricaturizado_ingles',
  AUDIO_CARICATURIZADO_ESPANOL: 'audio_caricaturizado_espanol',
} as const;

export type AssetType = (typeof AssetType)[keyof typeof AssetType];

// Entity interfaces
export interface Project extends BaseEntity {
  code: string;
  name: string;
  description?: string;
  statusId?: string; // UUID reference to Status entity
  status?: string | Status; // Status code (string) when transformed by backend, or Status entity when relation is loaded
  clientName?: string;
  startDate?: string;
  endDate?: string;
}

export interface Episode extends BaseEntity {
  projectId: number;
  epNumber?: number;
  code: string;
  name: string;
  description?: string;
  cutOrder: number;
  status?: string;
  duration?: number;
}

export interface Asset extends BaseEntity {
  projectId: number;
  code: string;
  name: string;
  assetType: AssetType;
  status?: string;
  description?: string;
  thumbnailPath?: string;
  versionId?: number;
  versionCode?: string;
  versionName?: string;
}

export interface Sequence extends BaseEntity {
  episodeId: number;
  storyId?: string;
  code: string;
  name: string;
  description?: string;
  cutOrder: number;
  status?: string;
  duration?: number;
  versionId?: number;
  versionCode?: string;
  versionName?: string;
}

export interface Status extends BaseEntity {
  code: string;
  name: string;
  description?: string;
  color: string;
  applicableEntities: (
    | 'project'
    | 'episode'
    | 'sequence'
    | 'version'
    | 'asset'
    | 'note'
    | 'all'
  )[];
  isActive: boolean;
  sortOrder: number;
}

export interface Version extends BaseEntity {
  id: number; // Integer primary key
  code: string; // Unique code for backward compatibility
  name: string;
  entityId?: number; // ID for migrated entities (asset, sequence)
  entityCode?: string; // Code for non-migrated entities (backward compatibility)
  entityType: 'asset' | 'sequence' | 'episode' | 'project';
  versionNumber: number;
  format?: '16:9' | '9:16' | '1:1' | 'custom';
  status?: string;
  description?: string;
  filePath?: string;
  thumbnailPath?: string;
  frameRange?: string;
  duration?: number;
  artist?: string;
  publishedAt?: string;
  notes?: string;
  prompt?: string;
  seed?: number;
  pathToMedia?: string;
  width?: number;
  height?: number;
  latest?: boolean;
  lineage?: string;
}

export interface Note extends BaseEntity {
  projectId: number;
  linkId: string | number;
  linkType: 'Project' | 'Episode' | 'Asset' | 'Sequence' | 'Version';
  subject: string;
  content: string;
  isRead: boolean;
  attachments?: string[];
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role: 'admin' | 'member';
}

// UI-specific types
export type TabType =
  | 'projects'
  | 'episodes'
  | 'assets'
  | 'sequences'
  | 'versions'
  | 'notes'
  | 'users'
  | 'status';

export const TAB_CONFIG = [
  { id: 'projects', label: 'Projects' },
  { id: 'episodes', label: 'Episodes' },
  { id: 'assets', label: 'Assets' },
  { id: 'sequences', label: 'Sequences' },
  { id: 'versions', label: 'Versions' },
  { id: 'notes', label: 'Notes' },
  { id: 'users', label: 'Users' },
  { id: 'status', label: 'Status' },
] as const;

export type StatusMeta = { label: string; color?: string };

export type EntityTypeForStatus =
  | 'project'
  | 'episode'
  | 'sequence'
  | 'version'
  | 'asset'
  | 'note'
  | 'all';

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
