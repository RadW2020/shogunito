import { useState, useEffect, useRef, type CSSProperties } from 'react';

/**
 * Image Size Options
 * Matches backend ImageSize enum
 */
export type ImageSize = 'thumbnail' | 'small' | 'medium' | 'large' | 'original';

/**
 * Image Format Options
 * Modern formats with fallback
 */
export type ImageFormat = 'webp' | 'avif' | 'jpeg' | 'png';

/**
 * OptimizedImage Props
 */
export interface OptimizedImageProps {
  /**
   * Base image path (without size/format suffix)
   * E.g., '/uploads/image' will become '/uploads/image-thumbnail.webp'
   */
  src: string;

  /**
   * Alt text for accessibility
   */
  alt: string;

  /**
   * Preferred size to load
   * @default 'medium'
   */
  size?: ImageSize;

  /**
   * Enable lazy loading (loads when visible in viewport)
   * @default true
   */
  lazy?: boolean;

  /**
   * Show thumbnail while loading full image
   * @default true
   */
  useThumbnail?: boolean;

  /**
   * Placeholder color/gradient while loading
   * @default '#f3f4f6'
   */
  placeholder?: string;

  /**
   * Aspect ratio (e.g., '16/9', '4/3', '1/1')
   * Prevents layout shift during loading
   */
  aspectRatio?: string;

  /**
   * CSS class name
   */
  className?: string;

  /**
   * Inline styles
   */
  style?: CSSProperties;

  /**
   * Callback when image loads successfully
   */
  onLoad?: () => void;

  /**
   * Callback when image fails to load
   */
  onError?: () => void;

  /**
   * Click handler
   */
  onClick?: () => void;

  /**
   * Sizes attribute for responsive images
   * @example '(max-width: 768px) 100vw, 50vw'
   */
  sizes?: string;

  /**
   * Enable modern formats (WebP, AVIF) with fallback
   * @default true
   */
  useModernFormats?: boolean;

  /**
   * Object fit CSS property
   * @default 'cover'
   */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

/**
 * Build image URL with size and format
 */
function buildImageUrl(
  baseSrc: string,
  size: ImageSize,
  format: ImageFormat,
): string {
  const parts = baseSrc.split('/');
  const filename = parts[parts.length - 1];
  const nameWithoutExt = filename.split('.')[0];
  const dir = parts.slice(0, -1).join('/');

  return `${dir}/${nameWithoutExt}-${size}.${format}`;
}

/**
 * Generate srcset for responsive images
 */
function generateSrcSet(
  baseSrc: string,
  format: ImageFormat,
): string {
  const sizes: ImageSize[] = ['small', 'medium', 'large'];
  const widths: Record<ImageSize, number> = {
    thumbnail: 150,
    small: 400,
    medium: 800,
    large: 1920,
    original: 2560,
  };

  return sizes
    .map((size) => {
      const url = buildImageUrl(baseSrc, size, format);
      return `${url} ${widths[size]}w`;
    })
    .join(', ');
}

/**
 * OptimizedImage Component
 *
 * Automatically optimized image component with:
 * - Lazy loading (loads when visible)
 * - Modern formats (WebP, AVIF) with fallback
 * - Responsive images with srcset
 * - Thumbnail preview while loading
 * - Placeholder to prevent layout shift
 * - Error handling
 *
 * @example
 * // Basic usage
 * <OptimizedImage
 *   src="/uploads/avatar"
 *   alt="User avatar"
 *   size="small"
 * />
 *
 * @example
 * // With lazy loading and thumbnail
 * <OptimizedImage
 *   src="/uploads/project-image"
 *   alt="Project thumbnail"
 *   size="medium"
 *   lazy={true}
 *   useThumbnail={true}
 *   aspectRatio="16/9"
 * />
 *
 * @example
 * // Responsive with custom sizes
 * <OptimizedImage
 *   src="/uploads/hero"
 *   alt="Hero image"
 *   sizes="(max-width: 768px) 100vw, 50vw"
 *   aspectRatio="21/9"
 * />
 */
export function OptimizedImage({
  src,
  alt,
  size = 'medium',
  lazy = true,
  useThumbnail = true,
  placeholder = '#f3f4f6',
  aspectRatio,
  className = '',
  style = {},
  onLoad,
  onError,
  onClick,
  sizes,
  useModernFormats = true,
  objectFit = 'cover',
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy);
  const [hasError, setHasError] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(useThumbnail);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before visible
        threshold: 0.01,
      },
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [lazy]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    setShowThumbnail(false);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    setShowThumbnail(false);
    onError?.();
  };

  // Build image URLs
  const thumbnailUrl = useThumbnail
    ? buildImageUrl(src, 'thumbnail', 'webp')
    : null;
  const mainUrl = buildImageUrl(src, size, 'jpeg'); // Fallback format
  const webpUrl = useModernFormats ? buildImageUrl(src, size, 'webp') : null;
  const avifUrl = useModernFormats ? buildImageUrl(src, size, 'avif') : null;

  // Container styles
  const containerStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: placeholder,
    aspectRatio: aspectRatio,
    ...style,
  };

  // Image styles
  const imageStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit,
    transition: 'opacity 0.3s ease-in-out',
    opacity: isLoaded ? 1 : 0,
  };

  // Thumbnail styles
  const thumbnailStyle: CSSProperties = {
    ...imageStyle,
    position: 'absolute',
    top: 0,
    left: 0,
    filter: 'blur(10px)', // Blur effect for thumbnail
    transform: 'scale(1.1)', // Scale up to hide blur edges
    opacity: showThumbnail && !isLoaded ? 1 : 0,
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
      onClick={onClick}
    >
      {/* Thumbnail (shown while loading) */}
      {useThumbnail && thumbnailUrl && isVisible && (
        <img
          src={thumbnailUrl}
          alt=""
          style={thumbnailStyle}
          aria-hidden="true"
        />
      )}

      {/* Main image with modern format support */}
      {isVisible && !hasError && (
        <picture>
          {/* AVIF (best compression, newest) */}
          {avifUrl && (
            <source
              type="image/avif"
              srcSet={generateSrcSet(src, 'avif')}
              sizes={sizes}
            />
          )}

          {/* WebP (good compression, wide support) */}
          {webpUrl && (
            <source
              type="image/webp"
              srcSet={generateSrcSet(src, 'webp')}
              sizes={sizes}
            />
          )}

          {/* JPEG fallback */}
          <img
            ref={imgRef}
            src={mainUrl}
            srcSet={generateSrcSet(src, 'jpeg')}
            sizes={sizes}
            alt={alt}
            style={imageStyle}
            onLoad={handleLoad}
            onError={handleError}
            loading={lazy ? 'lazy' : 'eager'}
          />
        </picture>
      )}

      {/* Error state */}
      {hasError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            color: '#9ca3af',
            fontSize: '14px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
            <div>Image failed to load</div>
          </div>
        </div>
      )}

      {/* Loading placeholder (shown until image loads) */}
      {!isLoaded && !hasError && isVisible && !showThumbnail && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: placeholder,
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e5e7eb',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      )}

      {/* Loading animation keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
