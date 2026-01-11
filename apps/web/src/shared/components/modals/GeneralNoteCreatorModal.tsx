import React, { useState } from 'react';
import { NoteCreator } from '../shared/NoteCreator';
import type { LinkType } from '../shared/NoteCreator';
import type { Project, Episode, Asset, Sequence } from '@shogunito/shared';
import type { ApiVersion } from '@shared/api/client';

interface GeneralNoteCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  episodes: Episode[];
  assets: Asset[];
  sequences: Sequence[];
  versions: ApiVersion[];
}

export const GeneralNoteCreatorModal: React.FC<GeneralNoteCreatorModalProps> = ({
  isOpen,
  onClose,
  projects,
  episodes,
  assets,
  sequences,
  versions,
}) => {
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<
    Project | Episode | Asset | Sequence | ApiVersion | null
  >(null);
  const [showNoteCreator, setShowNoteCreator] = useState(false);

  const handleEntityTypeChange = (type: string) => {
    setSelectedEntityType(type);
    setSelectedEntity(null);
  };

  const handleEntitySelect = (
    entity: Project | Episode | Asset | Sequence | ApiVersion,
  ) => {
    setSelectedEntity(entity);
    setShowNoteCreator(true);
  };

  const handleNoteCreated = (note: unknown) => {
    console.log('Note created:', note);
    setShowNoteCreator(false);
    setSelectedEntity(null);
    setSelectedEntityType('');
    onClose();
  };

  const getEntityOptions = (): (
    | Project
    | Episode
    | Asset
    | Sequence
    | ApiVersion
  )[] => {
    switch (selectedEntityType) {
      case 'Project':
        return projects;
      case 'Episode':
        return episodes;
      case 'Asset':
        return assets;
      case 'Sequence':
        return sequences;
      case 'Version':
        return versions;
      default:
        return [];
    }
  };

  const getEntityIcon = (type: string) => {
    const icons = {
      Project: '📁',
      Episode: '🎬',
      Asset: '🎨',
      Sequence: '🎞️',
      Version: '🔄',
    };
    return icons[type as keyof typeof icons] || '📝';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[80vh] rounded-lg shadow-xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Create Note
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: 'var(--text-secondary)' }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!showNoteCreator ? (
            <div className="space-y-6">
              {/* Step 1: Select Entity Type */}
              <div>
                <h3 className="text-md font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                  1. Select Entity Type
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {['Project', 'Episode', 'Asset', 'Sequence', 'Version'].map(
                    (type) => (
                      <button
                        key={type}
                        onClick={() => handleEntityTypeChange(type)}
                        className={`p-3 rounded-lg border transition-colors text-left ${
                          selectedEntityType === type
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{
                          backgroundColor:
                            selectedEntityType === type
                              ? 'var(--accent-primary)'
                              : 'var(--bg-secondary)',
                          borderColor:
                            selectedEntityType === type
                              ? 'var(--accent-primary)'
                              : 'var(--border-primary)',
                          color: selectedEntityType === type ? 'white' : 'var(--text-primary)',
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getEntityIcon(type)}</span>
                          <span className="font-medium">{type}</span>
                        </div>
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Step 2: Select Entity */}
              {selectedEntityType && (
                <div>
                  <h3 className="text-md font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                    2. Select {selectedEntityType}
                  </h3>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {getEntityOptions().map((entity) => (
                      <button
                        key={entity.id}
                        onClick={() => handleEntitySelect(entity)}
                        className="w-full p-3 rounded-lg border transition-colors text-left hover:border-blue-500"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-primary)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{getEntityIcon(selectedEntityType)}</span>
                          <div>
                            <div className="font-medium">{entity.name || entity.code}</div>
                            {entity.description && (
                              <div className="text-sm opacity-75">{entity.description}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                    {getEntityOptions().length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No {selectedEntityType.toLowerCase()}s available
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Step 3: Create Note */
            <div>
              <div className="mb-4">
                <h3 className="text-md font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Creating note for:
                </h3>
                <div
                  className="flex items-center space-x-2 p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <span className="text-lg">{getEntityIcon(selectedEntityType)}</span>
                  <div>
                    <div className="font-medium">
                      {selectedEntity?.name || selectedEntity?.code || 'Unknown'}
                    </div>
                    <div className="text-sm opacity-75">{selectedEntityType}</div>
                  </div>
                </div>
              </div>

              <NoteCreator
                linkId={(selectedEntity as any)?.id || ''}
                linkType={selectedEntityType as LinkType}
                linkName={selectedEntity?.name || selectedEntity?.code || ''}
                onNoteCreated={handleNoteCreated}
                onCancel={() => setShowNoteCreator(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
