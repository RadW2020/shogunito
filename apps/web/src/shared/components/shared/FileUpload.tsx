import React, { useState, useRef } from 'react';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSize?: number; // in MB
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  accept = 'image/*',
  maxSize = 5, // 5MB default
  disabled = false,
  className = '',
  children,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSize}MB`;
    }

    // Check file type
    if (accept && accept !== '*') {
      const acceptedTypes = accept.split(',').map((type) => type.trim());
      const fileType = file.type;
      const isAccepted = acceptedTypes.some((type) => {
        if (type.endsWith('/*')) {
          return fileType.startsWith(type.slice(0, -1));
        }
        return fileType === type;
      });

      if (!isAccepted) {
        return `File type ${fileType} is not allowed`;
      }
    }

    return null;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Upload file
    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`file-upload ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || isUploading}
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isUploading}
        className="w-full p-4 border-2 border-dashed rounded-lg transition-colors duration-200 cursor-pointer"
        style={{
          borderColor: disabled || isUploading ? 'var(--border-primary)' : 'var(--accent-primary)',
          backgroundColor: disabled || isUploading ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
          cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isUploading) {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isUploading) {
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
          }
        }}
      >
        {isUploading ? (
          <div className="flex items-center justify-center space-x-2">
            <div
              className="animate-spin rounded-full h-4 w-4 border-b-2"
              style={{ borderColor: 'var(--accent-primary)' }}
            ></div>
            <span style={{ color: 'var(--accent-primary)' }}>Uploading...</span>
          </div>
        ) : (
          children || (
            <div className="text-center">
              <div className="mb-2" style={{ color: 'var(--accent-primary)' }}>
                <svg
                  className="mx-auto h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Click to upload or drag and drop
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Max size: {maxSize}MB
              </p>
            </div>
          )
        )}
      </button>

      {error && (
        <div
          className="mt-2 p-2 rounded text-sm"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--status-error)',
            color: 'var(--status-error)',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};
