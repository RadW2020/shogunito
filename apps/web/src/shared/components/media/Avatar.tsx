import { type CSSProperties } from 'react';
import { OptimizedImage } from './OptimizedImage';

/**
 * Avatar Size Options
 */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Avatar size mapping to pixels
 */
const AVATAR_SIZES: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 96,
};

/**
 * Avatar Props
 */
export interface AvatarProps {
  /**
   * Image source (user photo path)
   */
  src?: string;

  /**
   * User name (used for initials if no image)
   */
  name: string;

  /**
   * Size of avatar
   * @default 'md'
   */
  size?: AvatarSize;

  /**
   * Shape of avatar
   * @default 'circle'
   */
  shape?: 'circle' | 'square' | 'rounded';

  /**
   * CSS class name
   */
  className?: string;

  /**
   * Additional styles
   */
  style?: CSSProperties;

  /**
   * Click handler
   */
  onClick?: () => void;

  /**
   * Show online indicator
   */
  online?: boolean;

  /**
   * Disable lazy loading for above-fold avatars
   * @default false
   */
  eager?: boolean;
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Generate color from string (consistent for same name)
 */
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    '#EF4444', // red
    '#F59E0B', // amber
    '#10B981', // emerald
    '#3B82F6', // blue
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
  ];

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Avatar Component
 *
 * Displays user avatar with:
 * - Image or initials fallback
 * - Multiple sizes
 * - Circle or square shape
 * - Online indicator
 * - Optimized image loading
 *
 * @example
 * <Avatar
 *   src="/uploads/user-avatar"
 *   name="John Doe"
 *   size="md"
 *   online={true}
 * />
 *
 * @example
 * // Without image (shows initials)
 * <Avatar
 *   name="Jane Smith"
 *   size="lg"
 * />
 */
export function Avatar({
  src,
  name,
  size = 'md',
  shape = 'circle',
  className = '',
  style = {},
  onClick,
  online,
  eager = false,
}: AvatarProps) {
  const sizeInPx = AVATAR_SIZES[size];
  const initials = getInitials(name);
  const bgColor = stringToColor(name);

  // Border radius based on shape
  const borderRadius = {
    circle: '50%',
    square: '0',
    rounded: '8px',
  }[shape];

  // Container styles
  const containerStyle: CSSProperties = {
    position: 'relative',
    width: `${sizeInPx}px`,
    height: `${sizeInPx}px`,
    borderRadius,
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };

  // Initials styles
  const initialsStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bgColor,
    color: 'white',
    fontWeight: 600,
    fontSize: `${sizeInPx * 0.4}px`,
    userSelect: 'none',
  };

  // Online indicator styles
  const indicatorStyle: CSSProperties = {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: `${sizeInPx * 0.25}px`,
    height: `${sizeInPx * 0.25}px`,
    backgroundColor: '#10B981',
    border: '2px solid white',
    borderRadius: '50%',
  };

  return (
    <div
      className={className}
      style={containerStyle}
      onClick={onClick}
      title={name}
    >
      {src ? (
        <OptimizedImage
          src={src}
          alt={name}
          size="thumbnail"
          lazy={!eager}
          useThumbnail={false}
          objectFit="cover"
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      ) : (
        <div style={initialsStyle}>{initials}</div>
      )}

      {online && <div style={indicatorStyle} />}
    </div>
  );
}
