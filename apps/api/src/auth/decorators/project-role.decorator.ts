import { SetMetadata } from '@nestjs/common';
import { ProjectRole } from '../../entities/project-permission.entity';

export const PROJECT_ROLE_KEY = 'projectRole';

/**
 * Decorator to specify the minimum required project role for a route
 *
 * Role hierarchy (from most to least permissive):
 * - OWNER: Full control over the project
 * - CONTRIBUTOR: Can create and edit content
 * - VIEWER: Read-only access
 *
 * When you specify a role, users with that role OR HIGHER can access the route.
 *
 * @example
 * // Only owners can access this route
 * @RequireProjectRole(ProjectRole.OWNER)
 *
 * @example
 * // Contributors and owners can access this route
 * @RequireProjectRole(ProjectRole.CONTRIBUTOR)
 *
 * @example
 * // Anyone with project access can view (owners, contributors, viewers)
 * @RequireProjectRole(ProjectRole.VIEWER)
 */
export const RequireProjectRole = (role: ProjectRole) => SetMetadata(PROJECT_ROLE_KEY, role);

/**
 * Project role hierarchy for permission checks
 * Higher index = more permissions
 */
export const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
  [ProjectRole.VIEWER]: 1,
  [ProjectRole.CONTRIBUTOR]: 2,
  [ProjectRole.OWNER]: 3,
};

/**
 * Check if a user's role meets or exceeds the required role
 *
 * @param userRole - The role the user has on the project
 * @param requiredRole - The minimum role required
 * @returns true if user's role is sufficient
 */
export function hasRequiredProjectRole(userRole: ProjectRole, requiredRole: ProjectRole): boolean {
  return PROJECT_ROLE_HIERARCHY[userRole] >= PROJECT_ROLE_HIERARCHY[requiredRole];
}
