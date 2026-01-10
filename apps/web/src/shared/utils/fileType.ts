/**
 * Detects the file type based on file path extension
 * @param filePath - The file path or URL
 * @returns 'video' | 'image' | 'text' | 'unknown'
 */
export function getFileType(filePath: string): 'video' | 'image' | 'text' | 'unknown' {
  if (!filePath) return 'unknown';

  // Extract extension from URL or path
  // Handle URLs with query parameters
  const urlWithoutParams = filePath.split('?')[0];
  const extension = urlWithoutParams.split('.').pop()?.toLowerCase() || '';

  // Video extensions
  const videoExtensions = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v', 'flv', 'wmv', 'mpg', 'mpeg'];
  if (videoExtensions.includes(extension)) {
    return 'video';
  }

  // Image extensions
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'exr', 'tiff', 'tif'];
  if (imageExtensions.includes(extension)) {
    return 'image';
  }

  // Text extensions
  const textExtensions = ['txt', 'md', 'json', 'xml', 'csv', 'log'];
  if (textExtensions.includes(extension)) {
    return 'text';
  }

  return 'unknown';
}
