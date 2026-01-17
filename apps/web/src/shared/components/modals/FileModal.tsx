import React, { useEffect, useState } from 'react';
import { getFileType } from '@shared/utils';

interface FileModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileSrc: string;
  title?: string;
}

export const FileModal: React.FC<FileModalProps> = ({
  isOpen,
  onClose,
  fileSrc,
  title = 'File Preview',
}) => {

  const [textContent, setTextContent] = useState<string>('');
  const [isLoadingText, setIsLoadingText] = useState(false);
  const fileType = getFileType(fileSrc);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);



  // Load text content when modal opens for text files
  useEffect(() => {
    if (isOpen && fileType === 'text' && fileSrc) {
      setIsLoadingText(true);
      fetch(fileSrc)
        .then((response) => {
          if (!response.ok) throw new Error('Failed to load text file');
          return response.text();
        })
        .then((text) => {
          setTextContent(text);
          setIsLoadingText(false);
        })
        .catch((error) => {
          console.error('Failed to load text file:', error);
          setTextContent('Error loading text file');
          setIsLoadingText(false);
        });
    }
  }, [isOpen, fileType, fileSrc]);



  if (!isOpen) return null;

  const renderContent = () => {
    switch (fileType) {
      case 'image':
        return (
          <div className="relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center min-h-[200px]">
            <img
              src={fileSrc}
              alt={title}
              className="max-w-full max-h-[70vh] object-contain"
              onError={(e) => {
                console.error('Image failed to load:', e);
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
              }}
            />
          </div>
        );

      case 'text':
        return (
          <div className="relative bg-white rounded-lg overflow-hidden border border-gray-200">
            <div className="p-4 max-h-[70vh] overflow-auto">
              {isLoadingText ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-600">Loading text file...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                  {textContent || 'No content available'}
                </pre>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center min-h-[200px]">
            <div className="text-center text-gray-500">
              <svg
                className="mx-auto h-12 w-12 mb-4"
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
              <p>Unsupported file type</p>
              <p className="text-sm mt-2">
                <a
                  href={fileSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Open file in new tab
                </a>
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-75" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content Container */}
        <div className="p-4 flex-1 overflow-auto">{renderContent()}</div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Press ESC to close</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
