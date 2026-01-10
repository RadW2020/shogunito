import React, { useState } from 'react';
import { DataTable, type TableColumn } from '../DataTable';
import { StatusBadge } from '../StatusBadge';
import { NoteBadge } from '../../../../../shared/components/shared/NoteBadge';
import { VersionFileUpload } from '../../../../../shared/components/shared/VersionFileUpload';
import { VersionEditModal } from '../../../../../shared/components/modals/VersionEditModal';
import { FileModal } from '../../../../../shared/components/modals/FileModal';
import { useNotesSorting } from '../hooks/useNotesSorting';
import { useNotesByEntity } from '../../../../../features/notes/api/useNotes';
import { formatDuration, getFileType } from '../../../../../shared/utils';
import type { StatusMeta, TabType } from '@shogun/shared';
import type { ApiVersion } from '@shared/api/client';

interface VersionNotesCellProps {
  item: ApiVersion;
  onAddNote?: (version: ApiVersion) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
}

const VersionNotesCell: React.FC<VersionNotesCellProps> = ({ item, onAddNote, onViewNotes }) => {
  const { data: notes = [], isLoading } = useNotesByEntity(item.id, 'Version');
  const hasNotes = notes.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div
          className="w-4 h-4 rounded-full animate-pulse"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {hasNotes ? (
        <NoteBadge
          linkId={item.id}
          linkType="Version"
          showCount={true}
          showUnread={true}
          onClick={() => onViewNotes?.(String(item.id), 'Version', item.name)}
          className="cursor-pointer"
        />
      ) : (
        <button
          onClick={() => onAddNote?.(item)}
          className="px-2 py-1 text-xs rounded transition-colors"
          style={{
            backgroundColor: 'var(--status-success)',
            color: 'white',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--status-success-hover)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--status-success)')
          }
          title="Add Note"
        >
          + Note
        </button>
      )}
    </div>
  );
};

interface VersionsTabProps {
  versions: ApiVersion[];
  statusMap: Record<string, StatusMeta>;
  selectedItems: Set<string>;
  viewMode: 'table' | 'thumbnails';
  onItemSelect: (itemId: string, checked: boolean) => void;
  onSelectAll: (items: Array<{ id?: string | number; code?: string }>, checked: boolean) => void;
  onItemClick: (type: TabType, item: ApiVersion) => void;
  onEditVersion?: (version: ApiVersion) => void;
  onAddNoteToVersion?: (version: ApiVersion) => void;
  onViewNotes?: (linkId: string, linkType: string, linkName: string) => void;
  onCreatePlaylist?: () => void;
}

export const VersionsTab: React.FC<VersionsTabProps> = ({
  versions,
  statusMap,
  selectedItems,
  viewMode,
  onItemSelect,
  onSelectAll,
  onItemClick,
  onEditVersion,
  onAddNoteToVersion,
  onViewNotes,
  onCreatePlaylist,
}) => {
  // Use notes sorting hook
  const { dataWithNotesCounts, sortByUnreadNotes } = useNotesSorting(versions, 'code', 'Version');

  const [editingVersion, setEditingVersion] = useState<ApiVersion | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadingVersion, setUploadingVersion] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'thumbnail' | 'file' | null>(null);
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [selectedFileSrc, setSelectedFileSrc] = useState<string>('');
  const [selectedFileTitle, setSelectedFileTitle] = useState<string>('');

  const handleVersionUpdate = () => {
    console.log('Version updated');
    setShowEditModal(false);
    setEditingVersion(null);
  };

  const handleUploadSuccess = (updatedVersion: ApiVersion) => {
    console.log('Upload successful:', updatedVersion);
    setUploadingVersion(null);
    setUploadType(null);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    setUploadingVersion(null);
    setUploadType(null);
  };

  const handleFileClick = (version: ApiVersion) => {
    if (version.filePath) {
      setSelectedFileSrc(version.filePath);
      setSelectedFileTitle(`${version.name} - ${version.code}`);
      setFileModalOpen(true);
    }
  };

  const handleCloseFileModal = () => {
    setFileModalOpen(false);
    setSelectedFileSrc('');
    setSelectedFileTitle('');
  };
  if (viewMode === 'thumbnails') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {versions.map((version) => {
          return (
            <div
              key={version.id}
              className="card overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onItemClick('versions', version)}
            >
              <div className="relative aspect-video bg-gray-200">
                {version.thumbnailPath ? (
                  <img
                    src={version.thumbnailPath}
                    alt={version.name || version.code || ''}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to filePath if thumbnail fails to load
                      if (version.filePath && e.currentTarget.src !== version.filePath) {
                        e.currentTarget.src = version.filePath;
                      }
                    }}
                  />
                ) : version.filePath ? (
                  <img
                    src={version.filePath}
                    alt={version.name || version.code || ''}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  {version.statusId ? (
                    <StatusBadge status={version.statusId} meta={statusMap[version.statusId]} />
                  ) : (
                    <span
                      className="badge"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-primary)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      -
                    </span>
                  )}
                </div>
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={version.code ? selectedItems.has(version.code) : false}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (version.code) {
                        onItemSelect(String(version.id), e.target.checked);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded"
                  />
                </div>
                {version.format && (
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                    {version.format}
                  </div>
                )}
                {version.duration && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                    {formatDuration(version.duration)}
                  </div>
                )}
              </div>
              <div className="p-3">
                <div
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {version.name || version.code || version.entityCode || 'Version'}
                </div>
                <div className="text-xs truncate mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {version.versionNumber} • {version.artist || 'Unknown'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const columns: TableColumn[] = [
    { label: 'Code', field: 'code' },
    { label: 'Name', field: 'name' },
    {
      label: 'Version',
      field: 'versionNumber',
      render: (item: ApiVersion) => `${item.versionNumber}`,
    },
    {
      label: 'Status',
      field: 'statusId',
      render: (item: ApiVersion) => {
        if (!item.statusId) {
          return (
            <span
              className="badge"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-secondary)',
              }}
            >
              -
            </span>
          );
        }
        return <StatusBadge status={item.statusId} meta={statusMap[item.statusId]} />;
      },
    },
    { label: 'Format', field: 'format' },
    {
      label: 'Duration',
      field: 'duration',
      render: (item: ApiVersion) => formatDuration(item.duration),
    },
    { label: 'Entity', field: 'entityCode' },
    {
      label: 'Thumbnail',
      field: 'thumbnailPath',
      render: (item: ApiVersion) => (
        <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
          {item.thumbnailPath ? (
            <img
              src={item.thumbnailPath}
              alt={item.name || item.code || ''}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-gray-400 text-xs">No img</div>
          )}
        </div>
      ),
    },
    {
      label: 'Files',
      field: 'files',
      render: (item: ApiVersion) => {
        if (!item.filePath) {
          return <div className="text-gray-400 text-xs">No file</div>;
        }

        const fileType = getFileType(item.filePath);

        return (
          <div className="flex items-center">
            <div
              className="relative group cursor-pointer"
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click
                handleFileClick(item);
              }}
            >
              {fileType === 'video' ? (
                <>
                  <video
                    src={item.filePath}
                    className="w-16 h-9 object-cover rounded border hover:opacity-80 transition-opacity"
                    controls={false}
                    muted
                    onError={(e) => {
                      // Fallback to icon if video fails to load
                      const videoElement = e.target as HTMLVideoElement;
                      const parent = videoElement.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-16 h-9 bg-blue-100 rounded border flex items-center justify-center" title="Render File">
                            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3m0 0h8"></path>
                            </svg>
                          </div>
                        `;
                      }
                    }}
                  />
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-6 h-6 bg-black bg-opacity-60 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 5v10l7-5-7-5z" />
                      </svg>
                    </div>
                  </div>
                </>
              ) : fileType === 'image' ? (
                <img
                  src={item.filePath}
                  alt="File preview"
                  className="w-16 h-9 object-cover rounded border hover:opacity-80 transition-opacity"
                  onError={(e) => {
                    // Fallback to icon if image fails to load
                    const imgElement = e.target as HTMLImageElement;
                    const parent = imgElement.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-16 h-9 bg-blue-100 rounded border flex items-center justify-center" title="Render File">
                          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                        </div>
                      `;
                    }
                  }}
                />
              ) : fileType === 'text' ? (
                <div className="w-16 h-9 bg-blue-100 rounded border flex items-center justify-center hover:opacity-80 transition-opacity">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              ) : (
                <div className="w-16 h-9 bg-gray-100 rounded border flex items-center justify-center hover:opacity-80 transition-opacity">
                  <svg
                    className="w-4 h-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3m0 0h8"
                    />
                  </svg>
                </div>
              )}
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black bg-opacity-75 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Click to open{' '}
                {fileType === 'video'
                  ? 'video'
                  : fileType === 'image'
                    ? 'image'
                    : fileType === 'text'
                      ? 'text file'
                      : 'file'}{' '}
                in modal
              </div>
            </div>
          </div>
        );
      },
    },
    { label: 'Description', field: 'description' },
    {
      label: 'Notes',
      field: 'notes',
      render: (item: ApiVersion) => (
        <VersionNotesCell
          item={item}
          onAddNote={onAddNoteToVersion}
          onViewNotes={(linkId, linkType, linkName) =>
            onViewNotes?.(linkId, linkType, linkName || item.name || item.code || 'Version')
          }
        />
      ),
    },
    {
      label: 'Created',
      field: 'createdAt',
      render: (item: ApiVersion) =>
        item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
    },
    {
      label: 'Updated',
      field: 'updatedAt',
      render: (item: ApiVersion) =>
        item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '-',
    },
    {
      label: 'Status Updated',
      field: 'statusUpdatedAt',
      render: (item: ApiVersion) =>
        item.statusUpdatedAt ? new Date(item.statusUpdatedAt).toLocaleString() : '-',
    },
    {
      label: 'Actions',
      field: 'actions',
      render: (item: ApiVersion) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEditVersion?.(item)}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
            title="Edit Version"
          >
            Edit
          </button>
          <div className="flex space-x-1">
            <button
              onClick={() => {
                console.log('Thumbnail button clicked for version:', item.code);
                if (item.code) {
                  setUploadingVersion(item.code);
                  setUploadType('thumbnail');
                }
              }}
              className="px-2 py-1 text-xs rounded transition-colors"
              style={{
                backgroundColor: 'var(--status-info)',
                color: 'white',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              title="Upload Thumbnail"
            >
              Thumb
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (item.filePath) {
                  // If file exists, open it in modal
                  handleFileClick(item);
                } else if (item.code) {
                  // If no file, open upload dialog
                  setUploadingVersion(item.code);
                  setUploadType('file');
                }
              }}
              className="px-2 py-1 text-xs rounded transition-colors"
              style={{
                backgroundColor: 'var(--status-warning)',
                color: 'white',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              title={item.filePath ? 'View Render File' : 'Upload Render File'}
            >
              File
            </button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar with Create Playlist button */}
      {selectedItems.size > 0 && onCreatePlaylist && (
        <div
          className="flex items-center justify-between p-3 rounded-lg"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
          }}
        >
          <div style={{ color: 'var(--text-secondary)' }}>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {selectedItems.size}
            </span>{' '}
            version{selectedItems.size > 1 ? 's' : ''} selected
          </div>
          <button
            onClick={onCreatePlaylist}
            className="px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
            style={{
              backgroundColor: 'var(--status-success)',
              color: 'white',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = 'var(--status-success-hover)')
            }
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--status-success)')}
            title="Create playlist from selected versions"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Create Playlist</span>
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={dataWithNotesCounts}
        entityType="versions"
        selectedItems={selectedItems}
        onItemSelect={onItemSelect}
        onSelectAll={onSelectAll}
        onItemClick={onItemClick}
        customSortFunctions={{
          notes: sortByUnreadNotes,
        }}
      />

      {/* Upload Component */}
      {uploadingVersion && uploadType && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Upload {uploadType === 'thumbnail' ? 'Thumbnail' : 'Render File'} for{' '}
            {versions.find((v) => v.code === uploadingVersion)?.name}
          </h3>
          <VersionFileUpload
            version={versions.find((v) => v.code === uploadingVersion)!}
            fileType={uploadType}
            onSuccess={handleUploadSuccess}
            onError={handleUploadError}
            className="max-w-md"
          />
          <button
            onClick={() => {
              setUploadingVersion(null);
              setUploadType(null);
            }}
            className="mt-2 px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingVersion && (
        <VersionEditModal
          version={editingVersion}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingVersion(null);
          }}
          onSuccess={handleVersionUpdate}
        />
      )}

      {/* File Modal */}
      <FileModal
        isOpen={fileModalOpen}
        onClose={handleCloseFileModal}
        fileSrc={selectedFileSrc}
        title={selectedFileTitle}
      />
    </div>
  );
};
