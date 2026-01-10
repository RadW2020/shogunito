import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '../layout';

// Mock Header component
vi.mock('../../components/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

describe('Layout', () => {
  it('should render Header component', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('should render Outlet for child routes', () => {
    const { container } = render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    // Outlet renders child routes, so we check for main element
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
  });

  it('should have correct CSS classes and styles', () => {
    const { container } = render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    const layout = container.firstChild as HTMLElement;
    expect(layout).toHaveClass('min-h-screen', 'flex', 'flex-col');
    expect(layout).toHaveStyle({ backgroundColor: 'var(--bg-primary)' });
  });

  it('should have main element with flex-1 class', () => {
    const { container } = render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    const main = container.querySelector('main');
    expect(main).toHaveClass('flex-1');
  });
});
