import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';
import type { StatusMeta } from '@shogun/shared';

describe('StatusBadge', () => {
  it('should render status text', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('should use meta label when provided', () => {
    const meta: StatusMeta = {
      label: 'Active Status',
      color: '#00ff00',
    };
    render(<StatusBadge status="active" meta={meta} />);
    expect(screen.getByText('Active Status')).toBeInTheDocument();
    expect(screen.queryByText('active')).not.toBeInTheDocument();
  });

  it('should use status as label when meta is not provided', () => {
    render(<StatusBadge status="waiting" />);
    expect(screen.getByText('waiting')).toBeInTheDocument();
  });

  it('should apply color from meta', () => {
    const meta: StatusMeta = {
      label: 'Active',
      color: '#ff0000',
    };
    render(<StatusBadge status="active" meta={meta} />);
    const badge = screen.getByText('Active');

    // Check that color is applied (background color with opacity)
    expect(badge).toHaveStyle({
      border: expect.stringContaining('#ff0000'),
    });
  });

  it('should use default styles when no color provided', () => {
    const meta: StatusMeta = {
      label: 'Default Status',
    };
    render(<StatusBadge status="default" meta={meta} />);
    const badge = screen.getByText('Default Status');

    // Should have default border color
    expect(badge).toHaveStyle({
      border: expect.stringContaining('var(--border-primary)'),
    });
  });

  it('should handle empty meta gracefully', () => {
    render(<StatusBadge status="test" meta={{ label: 'test' }} />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('should have badge className', () => {
    render(<StatusBadge status="active" />);
    const badge = screen.getByText('active');
    expect(badge).toHaveClass('badge');
  });
});
