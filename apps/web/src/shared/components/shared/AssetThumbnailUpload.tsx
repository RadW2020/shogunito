import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { apiService } from '@shared/api/client';

interface AssetThumbnailUploadProps {
  asset: any; // Using any to avoid type conflicts
  onSuccess?: (updatedAsset: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const AssetThumbnailUpload: React.FC<AssetThumbnailUploadProps> = ({
  asset,
  onSuccess,
  onError,
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file: File): Promise<void> => {
    setIsUploading(true);
    try {
      const updatedAsset = await apiService.uploadAssetThumbnail(asset.code, file);
      onSuccess?.(updatedAsset);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onError?.(errorMessage);
      throw error; // Re-throw to let FileUpload handle the error display
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`asset-thumbnail-upload ${className}`}>
      <FileUpload
        onUpload={handleUpload}
        accept="image/jpeg,image/png,image/webp"
        maxSize={5}
        disabled={isUploading}
      >
        <div className="text-center">
          <div className="text-blue-600 mb-2">
            <svg className="mx-auto h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-600">Upload thumbnail for {asset.name}</p>
          <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP up to 5MB</p>
        </div>
      </FileUpload>
    </div>
  );
};
