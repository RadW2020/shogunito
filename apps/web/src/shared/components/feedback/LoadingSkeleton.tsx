import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'text' | 'circle' | 'rectangle' | 'card' | 'table' | 'list';
  width?: string | number;
  height?: string | number;
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
}) => {
  const baseClasses =
    'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]';

  const variantClasses = {
    text: 'h-4 rounded',
    circle: 'rounded-full',
    rectangle: 'rounded-md',
    card: 'h-48 rounded-lg',
    table: 'h-12 rounded',
    list: 'h-16 rounded-md',
  };

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || undefined,
  };

  const skeletonClass = `${baseClasses} ${variantClasses[variant]} ${className}`;

  if (count > 1) {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className={skeletonClass} style={style} />
        ))}
      </div>
    );
  }

  return <div className={skeletonClass} style={style} />;
};

// Skeleton presets for common use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <LoadingSkeleton key={index} variant="text" width={index === lines - 1 ? '80%' : '100%'} />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`border border-gray-200 rounded-lg p-4 ${className}`}>
    <div className="flex items-start space-x-4">
      <LoadingSkeleton variant="circle" width={48} height={48} />
      <div className="flex-1 space-y-3">
        <LoadingSkeleton variant="text" width="60%" />
        <SkeletonText lines={2} />
      </div>
    </div>
  </div>
);

export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {/* Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, index) => (
        <LoadingSkeleton key={`header-${index}`} variant="text" height={20} />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div
        key={`row-${rowIndex}`}
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <LoadingSkeleton key={`cell-${rowIndex}-${colIndex}`} variant="text" height={16} />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({
  items = 5,
  className = '',
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3">
        <LoadingSkeleton variant="circle" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton variant="text" width="70%" />
          <LoadingSkeleton variant="text" width="40%" height={12} />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonForm: React.FC<{
  fields?: number;
  className?: string;
}> = ({ fields = 3, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index} className="space-y-2">
        <LoadingSkeleton variant="text" width="30%" height={14} />
        <LoadingSkeleton variant="rectangle" height={40} />
      </div>
    ))}
    <LoadingSkeleton variant="rectangle" width="30%" height={40} className="mt-6" />
  </div>
);
