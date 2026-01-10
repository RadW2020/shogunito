// Re-export all shared types from the shared package
export type { Project, Episode, Asset, Sequence, Status, TabType } from '@shogun/shared';

// Re-export API types
export type { ApiVersion, Note } from '@shared/api/client';

// UI-specific types
export interface DisplayUser {
  id: string;
  name: string;
  email: string | undefined;
  role: string;
}

export interface AppRoute {
  path: string;
  element: React.ComponentType;
  title: string;
}
