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
 * - member: Default role, can create and edit content within projects they have access to
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  // Admins have all permissions
  admin: Object.values(Permission),

  // Member is the default role (can create content and read everything)
  member: [
    Permission.PROJECT_READ,
    Permission.EPISODE_READ,
    Permission.EPISODE_CREATE,
    Permission.EPISODE_UPDATE,
    Permission.SEQUENCE_READ,
    Permission.SEQUENCE_CREATE,
    Permission.SEQUENCE_UPDATE,
    Permission.ASSET_READ,
    Permission.ASSET_CREATE,
    Permission.ASSET_UPDATE,
    Permission.VERSION_READ,
    Permission.VERSION_CREATE,
    Permission.VERSION_UPDATE,
    Permission.VERSION_APPROVE,
    Permission.VERSION_REJECT,
    Permission.STATUS_READ,
    Permission.NOTE_CREATE,
    Permission.NOTE_READ,
    Permission.NOTE_UPDATE,
    Permission.FILE_UPLOAD,
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
