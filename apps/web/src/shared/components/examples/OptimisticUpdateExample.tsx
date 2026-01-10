/**
 * Example component demonstrating optimistic updates
 *
 * This component shows how to implement immediate UI updates
 * with automatic rollback on error for better UX.
 */

import { useState } from 'react';
import { useProjects } from '@features/projects/api/useProjects';
import {
  useCreateProjectOptimistic,
  useUpdateProjectOptimistic,
  useDeleteProjectOptimistic,
} from '@features/projects/api/useProjectsOptimistic';
import type { Project } from '@shogun/shared';

export function OptimisticUpdateExample() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Fetch projects
  const { data: projects, isLoading } = useProjects();

  // Optimistic mutations
  const createProject = useCreateProjectOptimistic();
  const updateProject = useUpdateProjectOptimistic();
  const deleteProject = useDeleteProjectOptimistic();

  const handleCreate = () => {
    const newProject = {
      name: `New Project ${Date.now()}`,
      code: `PRJ_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      description: 'Created with optimistic update',
    };

    // UI updates immediately, shows temp ID
    createProject.mutate(newProject);
  };

  const handleUpdate = (project: Project) => {
    if (!editName.trim()) return;

    // UI updates immediately with new name
    updateProject.mutate({
      id: project.id,
      data: { name: editName },
    });

    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (id: number) => {
    // Item disappears immediately from list
    deleteProject.mutate(id);
  };

  const startEdit = (project: Project) => {
    setEditingId(String(project.id));
    setEditName(project.name);
  };

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Optimistic Updates Demo</h1>
        <p className="text-gray-600">
          Actions happen instantly in the UI and rollback automatically if they fail
        </p>
      </div>

      {/* Create Button */}
      <button
        onClick={handleCreate}
        disabled={createProject.isPending}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {createProject.isPending ? 'Creating...' : 'Create Project'}
      </button>

      {/* Projects List */}
      <div className="space-y-2">
        {projects?.map((project) => (
          <div
            key={project.id}
            className="p-4 border rounded-lg flex items-center justify-between bg-white shadow-sm"
          >
            {editingId === String(project.id) ? (
              // Edit Mode
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-3 py-1 border rounded"
                  placeholder="Project name"
                  autoFocus
                />
                <button
                  onClick={() => handleUpdate(project)}
                  disabled={updateProject.isPending}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setEditName('');
                  }}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            ) : (
              // View Mode
              <>
                <div className="flex-1">
                  <h3 className="font-semibold">{project.name}</h3>
                  <p className="text-sm text-gray-500">{project.code}</p>
                  {typeof project.id === 'number' && project.id < 0 && (
                    <span className="text-xs text-blue-500">(Creating...)</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(project)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(project.id as number)}
                    disabled={deleteProject.isPending}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {projects?.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No projects yet. Create one to get started!
        </div>
      )}

      {/* Status Indicators */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Mutation Status:</h3>
        <div className="text-sm space-y-1">
          <div>
            Create:{' '}
            {createProject.isPending ? (
              <span className="text-blue-500">Pending...</span>
            ) : createProject.isError ? (
              <span className="text-red-500">Error (rolled back)</span>
            ) : (
              <span className="text-gray-500">Idle</span>
            )}
          </div>
          <div>
            Update:{' '}
            {updateProject.isPending ? (
              <span className="text-blue-500">Pending...</span>
            ) : updateProject.isError ? (
              <span className="text-red-500">Error (rolled back)</span>
            ) : (
              <span className="text-gray-500">Idle</span>
            )}
          </div>
          <div>
            Delete:{' '}
            {deleteProject.isPending ? (
              <span className="text-blue-500">Pending...</span>
            ) : deleteProject.isError ? (
              <span className="text-red-500">Error (rolled back)</span>
            ) : (
              <span className="text-gray-500">Idle</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Example: Optimistic toggle button
 */
export function OptimisticToggleExample() {
  const [isEnabled, setIsEnabled] = useState(false);

  const handleToggle = () => {
    // Update UI immediately
    const newValue = !isEnabled;
    setIsEnabled(newValue);

    // Simulate API call
    setTimeout(() => {
      // Simulate 10% error rate
      if (Math.random() < 0.1) {
        // Rollback on error
        setIsEnabled(!newValue);
        console.error('Failed to toggle');
      }
    }, 1000);
  };

  return (
    <div className="p-4">
      <button
        onClick={handleToggle}
        className={`px-4 py-2 rounded transition-colors ${
          isEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-300 hover:bg-gray-400'
        } text-white`}
      >
        {isEnabled ? 'Enabled' : 'Disabled'}
      </button>
      <p className="mt-2 text-sm text-gray-600">Click rapidly - notice instant feedback!</p>
    </div>
  );
}

/**
 * Example: Optimistic list reordering
 */
export function OptimisticReorderExample() {
  const [items, setItems] = useState([
    { id: '1', name: 'Item 1', order: 1 },
    { id: '2', name: 'Item 2', order: 2 },
    { id: '3', name: 'Item 3', order: 3 },
  ]);

  const moveUp = (index: number) => {
    if (index === 0) return;

    // Optimistic update
    const newItems = [...items];
    [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
    setItems(newItems);

    // Simulate API call
    setTimeout(() => {
      console.log('Saved new order to server');
    }, 500);
  };

  const moveDown = (index: number) => {
    if (index === items.length - 1) return;

    // Optimistic update
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setItems(newItems);

    // Simulate API call
    setTimeout(() => {
      console.log('Saved new order to server');
    }, 500);
  };

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-4">Reorderable List</h3>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2 p-2 bg-white border rounded">
            <span className="flex-1">{item.name}</span>
            <button
              onClick={() => moveUp(index)}
              disabled={index === 0}
              className="px-2 py-1 bg-blue-500 text-white rounded disabled:opacity-30"
            >
              ↑
            </button>
            <button
              onClick={() => moveDown(index)}
              disabled={index === items.length - 1}
              className="px-2 py-1 bg-blue-500 text-white rounded disabled:opacity-30"
            >
              ↓
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
