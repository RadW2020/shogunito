import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('should render title', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(<EmptyState title="No items" description="There are no items to display" />);
    expect(screen.getByText('There are no items to display')).toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    render(<EmptyState title="No items" />);
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
  });

  it('should render icon when provided', () => {
    render(<EmptyState title="No items" icon="📭" />);
    expect(screen.getByText('📭')).toBeInTheDocument();
  });

  it('should not render icon when not provided', () => {
    render(<EmptyState title="No items" />);
    // Icon container should not be visible
    const iconContainer = screen.queryByText(/📭|📦|📋/);
    expect(iconContainer).not.toBeInTheDocument();
  });

  it('should render action when provided', () => {
    const actionButton = <button>Create Item</button>;
    render(<EmptyState title="No items" action={actionButton} />);
    expect(screen.getByText('Create Item')).toBeInTheDocument();
  });

  it('should not render action when not provided', () => {
    render(<EmptyState title="No items" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<EmptyState title="No items" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should have proper heading structure', () => {
    render(<EmptyState title="No items" />);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('No items');
  });

  it('should render all props together', () => {
    const actionButton = <button>Add Item</button>;
    render(
      <EmptyState
        title="Empty State"
        description="This is a description"
        icon="📭"
        action={actionButton}
        className="test-class"
      />,
    );

    expect(screen.getByText('Empty State')).toBeInTheDocument();
    expect(screen.getByText('This is a description')).toBeInTheDocument();
    expect(screen.getByText('📭')).toBeInTheDocument();
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });
});
