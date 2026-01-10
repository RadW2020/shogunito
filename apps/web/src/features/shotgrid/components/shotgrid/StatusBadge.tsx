import React from 'react';
import type { StatusMeta } from '@shogun/shared';

interface StatusBadgeProps {
  status: string;
  meta?: StatusMeta;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, meta }) => {
  const m = meta || { label: status };
  const background = m.color ? `${m.color}33` : 'var(--bg-tertiary)';
  const border = m.color || 'var(--border-primary)';
  const textColor = m.color ? undefined : 'var(--text-secondary)';

  return (
    <span
      className="badge"
      style={{
        backgroundColor: background,
        border: `1px solid ${border}`,
        color: textColor,
      }}
    >
      {m.label}
    </span>
  );
};
