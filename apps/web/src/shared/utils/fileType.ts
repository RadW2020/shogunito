/**
 * Detects the file type based on file path extension
 * @param filePath - The file path or URL
 * @returns 'image' | 'text' | 'unknown'
 */
export function getFileType(filePath: string): 'image' | 'text' | 'unknown' {
  if (!filePath) return 'unknown';

  // Extract extension from URL or path
  // Handle URLs with query parameters
  const urlWithoutParams = filePath.split('?')[0];
  const extension = urlWithoutParams.split('.').pop()?.toLowerCase() || '';

  // Image extensions
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'tif'];
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
