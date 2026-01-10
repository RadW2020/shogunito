import React from 'react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center ${className}`}
      style={{ color: 'var(--text-secondary)' }}
    >
      {icon && <div className="mb-4 text-4xl opacity-50">{icon}</div>}

      <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>

      {description && <p className="text-sm max-w-sm mb-6 opacity-80">{description}</p>}

      {action && action}
    </div>
  );
};
