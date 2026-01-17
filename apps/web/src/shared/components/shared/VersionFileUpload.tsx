import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { apiService } from '@shared/api/client';
import { getFileType } from '@shared/utils';
import type { ApiVersion } from '@shared/api/client';

interface VersionFileUploadProps {
  version: ApiVersion;
  fileType: 'thumbnail' | 'file';
  onSuccess?: (updatedVersion: ApiVersion) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const VersionFileUpload: React.FC<VersionFileUploadProps> = ({
  version,
  fileType,
  onSuccess,
  onError,
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file: File): Promise<void> => {
    setIsUploading(true);
    try {
      let updatedVersion: ApiVersion;

      if (fileType === 'thumbnail') {
        updatedVersion = await apiService.uploadThumbnail(
          typeof version.id === 'number' ? version.id : Number(version.code),
          file,
        );
      } else {
        updatedVersion = await apiService.uploadVersionFile(
          typeof version.id === 'number' ? version.id : Number(version.code),
          file,
        );
      }

      onSuccess?.(updatedVersion);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onError?.(errorMessage);
      throw error; // Re-throw to let FileUpload handle the error display
    } finally {
      setIsUploading(false);
    }
  };

  const getUploadConfig = () => {
    if (fileType === 'thumbnail') {
      return {
        accept: 'image/jpeg,image/png,image/webp',
        maxSize: 5,
        icon: (
          <svg className="mx-auto h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        ),
        title: 'Upload thumbnail',
        description: 'JPEG, PNG, WebP up to 5MB',
      };
    } else {
      return {
        accept:
          'image/png,image/jpeg,image/webp,text/plain,application/octet-stream',
        maxSize: 2048, // 2GB
        icon: (
          <svg className="mx-auto h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3m0 0h8"
            />
          </svg>
        ),
        title: 'Upload render file',
        description: 'PNG (storyboards), JPEG, WebP, TXT (prompts) up to 2GB',
      };
    }
  };

  const config = getUploadConfig();

  return (
    <div className={`version-file-upload ${className}`}>
      {/* Show current thumbnail if uploading a new one */}
      {fileType === 'thumbnail' && version.thumbnailPath && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Thumbnail:</h4>
          <div className="flex items-center space-x-3">
            <img
              src={version.thumbnailPath}
              alt={`Current thumbnail for ${version.name}`}
              className="w-16 h-9 object-cover rounded border"
              onError={(e) => {
                // Hide broken images
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="text-xs text-gray-600">
              <p>This will be replaced with your new upload</p>
            </div>
          </div>
        </div>
      )}

      {/* Show current file if uploading a new one */}
      {fileType === 'file' &&
        version.filePath &&
        (() => {
          const currentFileType = getFileType(version.filePath);
          const fileTypeLabel =
            currentFileType === 'image'
              ? 'Image'
              : currentFileType === 'text'
                ? 'Text'
                : 'Render';

          return (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Current {fileTypeLabel} File:
              </h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    {currentFileType === 'image' ? (
                      <img
                        src={version.filePath}
                        alt="Current file preview"
                        className="w-32 h-18 object-cover rounded border"
                        onError={(e) => {
                          // Hide broken images
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : currentFileType === 'text' ? (
                      <div className="w-32 h-18 bg-blue-100 rounded border flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-blue-600"
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
                      <div className="w-32 h-18 bg-gray-100 rounded border flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-gray-600"
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
                  </div>
                  <div className="text-xs text-gray-600 flex-1">
                    <p className="font-medium">Current file will be replaced</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  <p>File path: {version.filePath}</p>
                </div>
              </div>
            </div>
          );
        })()}

      <FileUpload
        onUpload={handleUpload}
        accept={config.accept}
        maxSize={config.maxSize}
        disabled={isUploading}
      >
        <div className="text-center">
          <div className="text-blue-600 mb-2">{config.icon}</div>
          <p className="text-sm text-gray-600">
            {config.title} for {version.name}
          </p>
          <p className="text-xs text-gray-500 mt-1">{config.description}</p>
        </div>
      </FileUpload>
    </div>
  );
};
