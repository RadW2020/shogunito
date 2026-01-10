import React, { useMemo } from 'react';
import { ProjectsTab } from '@features/shotgrid/components/shotgrid/tabs/ProjectsTab';
import { useProjectsPaginated, useIsProjectsInitialLoading } from '../api/useProjectsPaginated';
import { InfiniteScrollList } from '@shared/components/pagination';
import { useUiStore } from '@app/stores/uiStore';
import { LoadingSpinner, EmptyState } from '@shared/ui';
import type { StatusMeta, TabType, Project } from '@shogun/shared';

interface ProjectsTabWrapperWithPaginationProps {
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  searchTerm?: string;
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: { id: string | number; name?: string; code?: string }) => void;
  onEditProject?: (project: Project) => void;
  onAddNoteToProject?: (project: Project) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
  useInfiniteScroll?: boolean; // Toggle between infinite scroll and regular pagination
  pageSize?: number;
}

/**
 * Projects Tab Wrapper with Pagination Support
 *
 * This is an enhanced version of ProjectsTabWrapper that supports:
 * - Infinite scroll for loading more projects
 * - Virtual scrolling for better performance with large datasets
 * - Client-side pagination (until backend supports it)
 *
 * Usage:
 * - Set useInfiniteScroll={true} for infinite scroll mode
 * - Set useInfiniteScroll={false} for traditional table view with pagination
 * - Adjust pageSize to control how many items load per page (default: 50)
 *
 * @example
 * <ProjectsTabWrapperWithPagination
 *   {...props}
 *   useInfiniteScroll={true}
 *   pageSize={50}
 * />
 */
export const ProjectsTabWrapperWithPagination: React.FC<ProjectsTabWrapperWithPaginationProps> = ({
  useInfiniteScroll = false,
  pageSize = 50,
  ...props
}) => {
  const { filters } = useUiStore();
  const query = useProjectsPaginated({ limit: pageSize });
  const isInitialLoading = useIsProjectsInitialLoading(query);

  // Apply filters to flattened data
  const filteredProjects = useMemo(() => {
    return query.flatData.filter((project) => {
      // Filter by selected project (when not "all")
      if (filters.selectedProjectId !== 'all' && String(project.id) !== filters.selectedProjectId) {
        return false;
      }

      // Apply search filter
      if (props.searchTerm) {
        const searchLower = props.searchTerm.toLowerCase();
        const matchesSearch =
          project.name?.toLowerCase().includes(searchLower) ||
          project.description?.toLowerCase().includes(searchLower) ||
          project.code?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [query.flatData, filters.selectedProjectId, props.searchTerm]);

  // Show loading spinner on initial load
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading projects...
        </span>
      </div>
    );
  }

  // Show error state
  if (query.error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Error loading projects"
        description={query.error.message}
        action={
          <button
            onClick={() => query.refetch()}
            className="px-4 py-2 text-sm rounded border"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          >
            Try again
          </button>
        }
      />
    );
  }

  // Show empty state if no projects after filtering
  if (filteredProjects.length === 0) {
    return (
      <EmptyState
        icon="📭"
        title="No projects found"
        description={
          props.searchTerm ? `No projects match "${props.searchTerm}"` : 'No projects available'
        }
      />
    );
  }

  // Render with infinite scroll or regular table
  if (useInfiniteScroll) {
    return (
      <div className="p-4">
        <div className="mb-4 text-sm text-gray-500">
          Showing {filteredProjects.length} of {query.totalItems} projects
          {query.hasMore && ' (scroll to load more)'}
        </div>
        <InfiniteScrollList
          items={filteredProjects}
          hasMore={query.hasMore}
          loadMore={query.loadMore}
          isLoading={query.isFetchingNextPage}
          renderItem={(project) => (
            <div
              key={project.id}
              className="p-4 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              style={{
                borderColor: 'var(--border-primary)',
                backgroundColor: 'var(--bg-primary)',
              }}
              onClick={() =>
                props.onItemClick('projects', {
                  id: String(project.id),
                  name: project.name,
                  code: project.code,
                })
              }
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={props.selectedItems.has(String(project.id))}
                  onChange={(e) => {
                    e.stopPropagation();
                    props.onItemSelect(String(project.id), e.target.checked);
                  }}
                  className="rounded mt-1 shrink-0"
                  aria-label={`Select ${project.code || project.name}`}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{project.name}</h3>
                  {project.description && (
                    <p
                      className="text-sm mt-1 line-clamp-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {project.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                    <span
                      className="px-2 py-1 rounded shrink-0"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {project.code}
                    </span>
                    {(project.statusId || project.status) && (
                      <span
                        className="px-2 py-1 rounded shrink-0"
                        style={{
                          backgroundColor:
                            props.statusMap[
                              project.statusId ||
                                (typeof project.status === 'string'
                                  ? project.status
                                  : project.status?.code || '')
                            ]?.color || '#gray',
                          color: 'white',
                        }}
                      >
                        {props.statusMap[
                          project.statusId ||
                            (typeof project.status === 'string'
                              ? project.status
                              : project.status?.code || '')
                        ]?.label ||
                          (typeof project.status === 'string'
                            ? project.status
                            : project.status?.code || '')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          emptyMessage="No projects found"
          endMessage="All projects loaded"
          height={700}
        />
      </div>
    );
  }

  // Default: Use regular ProjectsTab component
  return <ProjectsTab {...props} projects={filteredProjects} />;
};
