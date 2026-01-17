import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { apiService } from '@shared/api/client';

interface NoteAttachmentUploadProps {
  note: any; // Using any to avoid type conflicts
  onSuccess?: (updatedNote: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const NoteAttachmentUpload: React.FC<NoteAttachmentUploadProps> = ({
  note,
  onSuccess,
  onError,
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file: File): Promise<void> => {
    setIsUploading(true);
    try {
      const updatedNote = await apiService.uploadNoteAttachment(note.id, file);
      onSuccess?.(updatedNote);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onError?.(errorMessage);
      throw error; // Re-throw to let FileUpload handle the error display
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string): Promise<void> => {
    try {
      const updatedNote = await apiService.removeNoteAttachment(note.id, attachmentId);
      onSuccess?.(updatedNote);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Remove failed';
      onError?.(errorMessage);
    }
  };

  return (
    <div className={`note-attachment-upload ${className}`}>
      <FileUpload
        onUpload={handleUpload}
        accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
        maxSize={100}
        disabled={isUploading}
      >
        <div className="text-center">
          <div className="mb-2" style={{ color: 'var(--accent-primary)' }}>
            <svg className="mx-auto h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Add attachment to note
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Images, PDF, Text up to 100MB
          </p>
        </div>
      </FileUpload>

      {/* Display existing attachments */}
      {note.attachments && note.attachments.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Attachments:
          </h4>
          <div className="space-y-2">
            {note.attachments.map((attachment: string, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <div className="flex items-center space-x-2">
                  <svg
                    className="h-4 w-4"
                    style={{ color: 'var(--text-secondary)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                  <span
                    className="text-sm truncate max-w-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {attachment.includes('http') ? 'MinIO File' : attachment.split('/').pop()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {attachment.includes('http') && (
                    <a
                      href={attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-80 text-xs transition-opacity"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      View
                    </a>
                  )}
                  <button
                    onClick={() => handleRemoveAttachment(attachment)}
                    className="hover:opacity-80 text-xs transition-opacity"
                    style={{ color: 'var(--status-error)' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
