import { useState, useEffect, useRef, type RefObject } from 'react';

/**
 * Options for lazy image loading
 */
export interface UseLazyImageOptions {
  /**
   * Root margin for Intersection Observer
   * @default '50px'
   */
  rootMargin?: string;

  /**
   * Threshold for Intersection Observer
   * @default 0.01
   */
  threshold?: number;

  /**
   * Enable lazy loading
   * @default true
   */
  enabled?: boolean;
}

/**
 * Result from useLazyImage hook
 */
export interface UseLazyImageResult {
  /**
   * Ref to attach to the image container element
   */
  ref: RefObject<HTMLElement | null>;

  /**
   * Whether the image is visible in viewport
   */
  isVisible: boolean;

  /**
   * Whether the image has loaded successfully
   */
  isLoaded: boolean;

  /**
   * Whether the image failed to load
   */
  hasError: boolean;

  /**
   * Callback to call when image loads
   */
  handleLoad: () => void;

  /**
   * Callback to call when image errors
   */
  handleError: () => void;
}

/**
 * Custom hook for lazy loading images
 *
 * Uses Intersection Observer to detect when an image enters the viewport
 * and triggers loading. Also tracks load and error states.
 *
 * @example
 * const { ref, isVisible, isLoaded, handleLoad, handleError } = useLazyImage();
 *
 * return (
 *   <div ref={ref}>
 *     {isVisible && (
 *       <img
 *         src="/path/to/image.jpg"
 *         onLoad={handleLoad}
 *         onError={handleError}
 *         style={{ opacity: isLoaded ? 1 : 0 }}
 *       />
 *     )}
 *   </div>
 * );
 */
export function useLazyImage(options: UseLazyImageOptions = {}): UseLazyImageResult {
  const { rootMargin = '50px', threshold = 0.01, enabled = true } = options;

  const [isVisible, setIsVisible] = useState(!enabled);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;

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
        rootMargin,
        threshold,
      },
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [enabled, rootMargin, threshold]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
  };

  return {
    ref,
    isVisible,
    isLoaded,
    hasError,
    handleLoad,
    handleError,
  };
}
