# Media Components

Optimized components for displaying images and media with automatic lazy loading, modern formats, and responsive sizing.

## Features

✅ **Lazy Loading** - Images load only when visible in viewport
✅ **Modern Formats** - Automatic WebP/AVIF with JPEG fallback
✅ **Responsive Images** - Multiple sizes with srcset
✅ **Thumbnail Preview** - Blurred thumbnail while loading
✅ **Zero Layout Shift** - Aspect ratio preserves space
✅ **Error Handling** - Graceful fallback for missing images
✅ **Performance Optimized** - Minimal bundle size, efficient loading

## Components

### OptimizedImage

Full-featured optimized image component with lazy loading and modern formats.

```tsx
import { OptimizedImage } from '@shared/components/media';

<OptimizedImage
  src="/uploads/project-image"
  alt="Project preview"
  size="medium"
  lazy={true}
  aspectRatio="16/9"
/>
```

**Props:**

- `src` (string) - Base image path without size/format suffix
- `alt` (string) - Alt text for accessibility
- `size` (ImageSize) - Preferred size: 'thumbnail' | 'small' | 'medium' | 'large' | 'original'
- `lazy` (boolean) - Enable lazy loading (default: true)
- `useThumbnail` (boolean) - Show blurred thumbnail while loading (default: true)
- `placeholder` (string) - Background color while loading (default: '#f3f4f6')
- `aspectRatio` (string) - CSS aspect ratio (e.g., '16/9', '4/3', '1/1')
- `sizes` (string) - Responsive sizes attribute
- `useModernFormats` (boolean) - Use WebP/AVIF with fallback (default: true)
- `objectFit` ('contain' | 'cover' | 'fill') - How image fits container (default: 'cover')

**Image Naming Convention:**

The component expects images in this format:
```
/uploads/image-thumbnail.webp  (150x150)
/uploads/image-small.webp      (400x400)
/uploads/image-medium.webp     (800x800)
/uploads/image-large.webp      (1920x1920)
```

Pass base path without suffix: `src="/uploads/image"`

### Avatar

User avatar component with initials fallback and online indicator.

```tsx
import { Avatar } from '@shared/components/media';

<Avatar
  src="/uploads/user-avatar"
  name="John Doe"
  size="md"
  online={true}
/>
```

**Props:**

- `src` (string, optional) - User photo path
- `name` (string) - User name (used for initials if no image)
- `size` (AvatarSize) - Size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' (default: 'md')
- `shape` ('circle' | 'square' | 'rounded') - Avatar shape (default: 'circle')
- `online` (boolean) - Show online indicator
- `eager` (boolean) - Disable lazy loading for above-fold avatars

**Features:**

- Automatic color-coded initials when no image
- Consistent colors for same user
- Optional online status indicator
- Multiple sizes

## Hooks

### useLazyImage

Custom hook for implementing lazy loading in custom components.

```tsx
import { useLazyImage } from '@shared/hooks/useLazyImage';

function CustomImage({ src, alt }) {
  const { ref, isVisible, isLoaded, handleLoad, handleError } = useLazyImage();

  return (
    <div ref={ref}>
      {isVisible && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{ opacity: isLoaded ? 1 : 0 }}
        />
      )}
    </div>
  );
}
```

## Backend Integration

These components work with the backend `ImageOptimizationService` which automatically:

1. **Generates multiple sizes** when images are uploaded
2. **Converts to modern formats** (WebP, AVIF)
3. **Optimizes quality** for smaller file sizes
4. **Creates thumbnails** for preview

### Image Upload Flow

```typescript
// Backend automatically optimizes on upload
const result = await imageOptimizationService.optimizeImage(
  originalPath,
  {
    sizes: ['thumbnail', 'small', 'medium', 'large'],
    formats: ['webp', 'avif', 'jpeg'],
    quality: 80
  }
);

// Returns optimized versions:
// - image-thumbnail.webp (150x150, ~5KB)
// - image-small.webp (400x400, ~15KB)
// - image-medium.webp (800x800, ~40KB)
// - image-large.webp (1920x1920, ~120KB)
```

## Performance Benefits

### Before Optimization
- ❌ 2MB original JPEG
- ❌ Loads immediately (slow)
- ❌ No responsive sizes
- ❌ Single format only

### After Optimization
- ✅ 150KB WebP (93% smaller)
- ✅ Loads when needed (fast)
- ✅ Multiple sizes for devices
- ✅ Modern formats with fallback

### Typical Savings

| Size | Original | WebP | Savings |
|------|----------|------|---------|
| Thumbnail | 30KB | 5KB | 83% |
| Small | 150KB | 20KB | 87% |
| Medium | 500KB | 60KB | 88% |
| Large | 2MB | 180KB | 91% |

## Browser Support

- **WebP**: Chrome 32+, Firefox 65+, Safari 14+, Edge 18+
- **AVIF**: Chrome 85+, Firefox 93+, Safari 16+
- **Lazy Loading**: All modern browsers
- **Fallback**: JPEG for older browsers

## Best Practices

### 1. Use Appropriate Sizes

```tsx
// Thumbnails in lists
<OptimizedImage src="/path" size="thumbnail" />

// Cards/previews
<OptimizedImage src="/path" size="small" />

// Detail views
<OptimizedImage src="/path" size="medium" />

// Full screen/hero
<OptimizedImage src="/path" size="large" />
```

### 2. Specify Aspect Ratios

```tsx
// Prevents layout shift during loading
<OptimizedImage
  src="/path"
  aspectRatio="16/9"  // or "4/3", "1/1", etc.
/>
```

### 3. Disable Lazy Loading for Above-Fold Images

```tsx
// Hero images, logos, above-fold content
<OptimizedImage
  src="/hero"
  lazy={false}
  useThumbnail={false}
/>
```

### 4. Use Responsive Sizes

```tsx
<OptimizedImage
  src="/path"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### 5. Proper Alt Text

```tsx
// Good
<OptimizedImage alt="Project dashboard showing 3 active tasks" />

// Bad
<OptimizedImage alt="Image" />
```

## Accessibility

All components follow accessibility best practices:

- ✅ Proper `alt` text support
- ✅ ARIA attributes when needed
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ High contrast support

## Migration Guide

### Before

```tsx
<img src="/uploads/image.jpg" alt="Image" />
```

### After

```tsx
<OptimizedImage
  src="/uploads/image"
  alt="Image"
  size="medium"
/>
```

### Avatar Migration

**Before:**
```tsx
<img
  src={user.avatar}
  alt={user.name}
  style={{ width: 40, height: 40, borderRadius: '50%' }}
/>
```

**After:**
```tsx
<Avatar
  src={user.avatar}
  name={user.name}
  size="md"
/>
```

## Troubleshooting

### Images Not Loading

1. Check that backend `ImageOptimizationService` has processed the image
2. Verify image path is correct (without size/format suffix)
3. Check browser console for 404 errors
4. Ensure images are accessible from the frontend

### Layout Shift Issues

Always specify `aspectRatio`:
```tsx
<OptimizedImage aspectRatio="16/9" />
```

### Performance Issues

1. Use appropriate sizes (don't load 'large' for thumbnails)
2. Enable lazy loading for below-fold images
3. Reduce `quality` in backend if needed
4. Use thumbnails for preview grids

## Examples

### Image Gallery

```tsx
const gallery = [
  { src: '/uploads/img1', alt: 'Image 1' },
  { src: '/uploads/img2', alt: 'Image 2' },
];

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
  {gallery.map(img => (
    <OptimizedImage
      key={img.src}
      src={img.src}
      alt={img.alt}
      size="small"
      aspectRatio="1/1"
    />
  ))}
</div>
```

### User List with Avatars

```tsx
const users = [
  { id: 1, name: 'John Doe', avatar: '/uploads/john', online: true },
  { id: 2, name: 'Jane Smith', avatar: null, online: false },
];

{users.map(user => (
  <div key={user.id}>
    <Avatar
      src={user.avatar}
      name={user.name}
      size="md"
      online={user.online}
    />
    <span>{user.name}</span>
  </div>
))}
```

### Hero Image

```tsx
<OptimizedImage
  src="/uploads/hero"
  alt="Welcome to Shogun"
  size="large"
  lazy={false}
  aspectRatio="21/9"
  sizes="100vw"
/>
```
