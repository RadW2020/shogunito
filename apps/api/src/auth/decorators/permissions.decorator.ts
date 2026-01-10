import { SetMetadata } from '@nestjs/common';

/**
 * Permission types for granular access control
 */
export enum Permission {
  // Project permissions
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',

  // Episode permissions
  EPISODE_CREATE = 'episode:create',
  EPISODE_READ = 'episode:read',
  EPISODE_UPDATE = 'episode:update',
  EPISODE_DELETE = 'episode:delete',

  // Sequence permissions
  SEQUENCE_CREATE = 'sequence:create',
  SEQUENCE_READ = 'sequence:read',
  SEQUENCE_UPDATE = 'sequence:update',
  SEQUENCE_DELETE = 'sequence:delete',

  // Shot permissions
  SHOT_CREATE = 'shot:create',
  SHOT_READ = 'shot:read',
  SHOT_UPDATE = 'shot:update',
  SHOT_DELETE = 'shot:delete',

  // Asset permissions
  ASSET_CREATE = 'asset:create',
  ASSET_READ = 'asset:read',
  ASSET_UPDATE = 'asset:update',
  ASSET_DELETE = 'asset:delete',

  // Version permissions
  VERSION_CREATE = 'version:create',
  VERSION_READ = 'version:read',
  VERSION_UPDATE = 'version:update',
  VERSION_DELETE = 'version:delete',
  VERSION_APPROVE = 'version:approve',
  VERSION_REJECT = 'version:reject',

  // User management permissions
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_MANAGE_ROLES = 'user:manage_roles',

  // Status permissions
  STATUS_CREATE = 'status:create',
  STATUS_READ = 'status:read',
  STATUS_UPDATE = 'status:update',
  STATUS_DELETE = 'status:delete',

  // Playlist permissions
  PLAYLIST_CREATE = 'playlist:create',
  PLAYLIST_READ = 'playlist:read',
  PLAYLIST_UPDATE = 'playlist:update',
  PLAYLIST_DELETE = 'playlist:delete',

  // Note permissions
  NOTE_CREATE = 'note:create',
  NOTE_READ = 'note:read',
  NOTE_UPDATE = 'note:update',
  NOTE_DELETE = 'note:delete',

  // File permissions
  FILE_UPLOAD = 'file:upload',
  FILE_DELETE = 'file:delete',

  // Admin permissions
  ADMIN_ACCESS = 'admin:access',
  SYSTEM_SETTINGS = 'system:settings',
}

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for a route
 *
 * @example
 * @RequirePermissions(Permission.PROJECT_CREATE, Permission.PROJECT_UPDATE)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Role to permissions mapping
 *
 * Available roles:
 * - admin: Full system access
 * - director: Full production management + approve/reject versions
 * - artist: Create content (assets, versions, shots, sequences)
 * - member: Default role, read-only + create notes
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  // Admins have all permissions
  admin: Object.values(Permission),

  // Directors can manage everything except users and system settings
  director: [
    // Project management
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    // Episode management
    Permission.EPISODE_CREATE,
    Permission.EPISODE_READ,
    Permission.EPISODE_UPDATE,
    Permission.EPISODE_DELETE,
    // Sequence management
    Permission.SEQUENCE_CREATE,
    Permission.SEQUENCE_READ,
    Permission.SEQUENCE_UPDATE,
    Permission.SEQUENCE_DELETE,
    // Shot management
    Permission.SHOT_CREATE,
    Permission.SHOT_READ,
    Permission.SHOT_UPDATE,
    Permission.SHOT_DELETE,
    // Asset management
    Permission.ASSET_CREATE,
    Permission.ASSET_READ,
    Permission.ASSET_UPDATE,
    Permission.ASSET_DELETE,
    // Version management + approval
    Permission.VERSION_CREATE,
    Permission.VERSION_READ,
    Permission.VERSION_UPDATE,
    Permission.VERSION_DELETE,
    Permission.VERSION_APPROVE,
    Permission.VERSION_REJECT,
    // Status management
    Permission.STATUS_CREATE,
    Permission.STATUS_READ,
    Permission.STATUS_UPDATE,
    Permission.STATUS_DELETE,
    // Playlist management
    Permission.PLAYLIST_CREATE,
    Permission.PLAYLIST_READ,
    Permission.PLAYLIST_UPDATE,
    Permission.PLAYLIST_DELETE,
    // Note management
    Permission.NOTE_CREATE,
    Permission.NOTE_READ,
    Permission.NOTE_UPDATE,
    Permission.NOTE_DELETE,
    // File management
    Permission.FILE_UPLOAD,
    Permission.FILE_DELETE,
  ],

  // Artists can create and edit content
  artist: [
    // Read access to projects and episodes
    Permission.PROJECT_READ,
    Permission.EPISODE_READ,
    // Sequence: create and edit
    Permission.SEQUENCE_CREATE,
    Permission.SEQUENCE_READ,
    Permission.SEQUENCE_UPDATE,
    // Shot: create and edit
    Permission.SHOT_CREATE,
    Permission.SHOT_READ,
    Permission.SHOT_UPDATE,
    // Asset: create and edit
    Permission.ASSET_CREATE,
    Permission.ASSET_READ,
    Permission.ASSET_UPDATE,
    // Version: create and edit
    Permission.VERSION_CREATE,
    Permission.VERSION_READ,
    Permission.VERSION_UPDATE,
    // Read statuses
    Permission.STATUS_READ,
    // Read playlists
    Permission.PLAYLIST_READ,
    // Notes: create and read
    Permission.NOTE_CREATE,
    Permission.NOTE_READ,
    // File upload
    Permission.FILE_UPLOAD,
  ],

  // Member is the default role for new registrations (read-only + notes)
  member: [
    Permission.PROJECT_READ,
    Permission.EPISODE_READ,
    Permission.SEQUENCE_READ,
    Permission.SHOT_READ,
    Permission.ASSET_READ,
    Permission.VERSION_READ,
    Permission.STATUS_READ,
    Permission.PLAYLIST_READ,
    Permission.NOTE_CREATE,
    Permission.NOTE_READ,
  ],
};

/**
 * Get permissions for a specific role
 */
export function getPermissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['member'];
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}

/**
 * Check if a role has all of the required permissions
 */
export function hasAllPermissions(role: string, requiredPermissions: Permission[]): boolean {
  const permissions = getPermissionsForRole(role);
  return requiredPermissions.every((p) => permissions.includes(p));
}

/**
 * Check if a role has any of the required permissions
 */
export function hasAnyPermission(role: string, requiredPermissions: Permission[]): boolean {
  const permissions = getPermissionsForRole(role);
  return requiredPermissions.some((p) => permissions.includes(p));
}
