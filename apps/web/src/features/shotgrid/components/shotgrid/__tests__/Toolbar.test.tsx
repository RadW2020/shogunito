import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toolbar } from '../Toolbar';
import type { TabType } from '@shogun/shared';

describe('Toolbar', () => {
  const defaultProps = {
    activeTab: 'projects' as TabType,
    selectedItems: new Set<string>(),
    isRefreshing: false,
    lastRefreshTime: null,
    showFilters: false,
    onAddClick: vi.fn(),
    onDeleteSelected: vi.fn(),
    onRefresh: vi.fn(),
    onToggleFilters: vi.fn(),
  };

  describe('Basic rendering', () => {
    it('should render toolbar', () => {
      render(<Toolbar {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
    });

    it('should render Add button', () => {
      render(<Toolbar {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
    });

    it('should render Filter button', () => {
      render(<Toolbar {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Filter/i })).toBeInTheDocument();
    });

    it('should render Refresh button', () => {
      render(<Toolbar {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<Toolbar {...defaultProps} />);
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });
  });

  describe('Add button label', () => {
    it('should show correct label for projects tab', () => {
      render(<Toolbar {...defaultProps} activeTab="projects" />);
      const button = screen.getByRole('button', { name: /Add/i });
      expect(button.textContent).toContain('Project');
    });

    it('should show correct label for episodes tab', () => {
      render(<Toolbar {...defaultProps} activeTab="episodes" />);
      const button = screen.getByRole('button', { name: /Add/i });
      expect(button.textContent).toContain('Episode');
    });

    it('should show correct label for shots tab', () => {
      render(<Toolbar {...defaultProps} activeTab="shots" />);
      const button = screen.getByRole('button', { name: /Add/i });
      expect(button.textContent).toContain('Shot');
    });

    it('should show "Status" for status tab', () => {
      render(<Toolbar {...defaultProps} activeTab="status" />);
      const button = screen.getByRole('button', { name: /Add/i });
      expect(button.textContent).toContain('Status');
    });

    it('should show mobile-friendly label on small screens', () => {
      render(<Toolbar {...defaultProps} />);
      // Should have both hidden sm:inline and sm:hidden spans
      const button = screen.getByRole('button', { name: /Add/i });
      expect(button.textContent).toContain('Add');
    });
  });

  describe('Button interactions', () => {
    it('should call onAddClick when Add button is clicked', async () => {
      const user = userEvent.setup();
      const onAddClick = vi.fn();
      render(<Toolbar {...defaultProps} onAddClick={onAddClick} />);

      const addButton = screen.getByRole('button', { name: /Add/i });
      await user.click(addButton);

      expect(onAddClick).toHaveBeenCalledTimes(1);
    });

    it('should call onToggleFilters when Filter button is clicked', async () => {
      const user = userEvent.setup();
      const onToggleFilters = vi.fn();
      render(<Toolbar {...defaultProps} onToggleFilters={onToggleFilters} />);

      const filterButton = screen.getByRole('button', { name: /Filter/i });
      await user.click(filterButton);

      expect(onToggleFilters).toHaveBeenCalledTimes(1);
    });

    it('should call onRefresh when Refresh button is clicked', async () => {
      const user = userEvent.setup();
      const onRefresh = vi.fn();
      render(<Toolbar {...defaultProps} onRefresh={onRefresh} />);

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      await user.click(refreshButton);

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('should disable Refresh button when isRefreshing is true', () => {
      render(<Toolbar {...defaultProps} isRefreshing={true} />);
      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      expect(refreshButton).toBeDisabled();
    });

    it('should show spinning icon when isRefreshing is true', () => {
      render(<Toolbar {...defaultProps} isRefreshing={true} />);
      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      const svg = refreshButton.querySelector('svg');
      // The svg should have animate-spin class when refreshing
      expect(svg).toBeInTheDocument();
      // For SVG elements, className is an SVGAnimatedString, use getAttribute
      const className = svg?.getAttribute('class') || '';
      expect(className).toContain('animate-spin');
    });
  });

  describe('Delete selected button', () => {
    it('should not show delete button when no items selected', () => {
      render(<Toolbar {...defaultProps} selectedItems={new Set()} />);
      expect(screen.queryByText(/Delete/i)).not.toBeInTheDocument();
    });

    it('should show delete button when items are selected', () => {
      render(<Toolbar {...defaultProps} selectedItems={new Set(['1', '2', '3'])} />);
      expect(screen.getByText(/Delete \(3\)/i)).toBeInTheDocument();
    });

    it('should show correct count in delete button', () => {
      render(<Toolbar {...defaultProps} selectedItems={new Set(['1', '2'])} />);
      expect(screen.getByText(/Delete \(2\)/i)).toBeInTheDocument();
    });

    it('should call onDeleteSelected when delete button is clicked', async () => {
      const user = userEvent.setup();
      const onDeleteSelected = vi.fn();
      render(
        <Toolbar
          {...defaultProps}
          selectedItems={new Set(['1'])}
          onDeleteSelected={onDeleteSelected}
        />,
      );

      const deleteButton = screen.getByText(/Delete/i);
      await user.click(deleteButton);

      expect(onDeleteSelected).toHaveBeenCalledTimes(1);
    });
  });

  describe('Last refresh time', () => {
    it('should not show last refresh time when null', () => {
      render(<Toolbar {...defaultProps} lastRefreshTime={null} />);
      expect(screen.queryByText(/Last updated/i)).not.toBeInTheDocument();
    });

    it('should show last refresh time when provided', () => {
      const refreshTime = new Date('2024-01-01T12:00:00');
      render(<Toolbar {...defaultProps} lastRefreshTime={refreshTime} />);
      expect(screen.getByText(/Last updated/i)).toBeInTheDocument();
    });

    it('should format last refresh time correctly', () => {
      const refreshTime = new Date('2024-01-01T12:30:45');
      render(<Toolbar {...defaultProps} lastRefreshTime={refreshTime} />);
      const timeText = screen.getByText(/Last updated/i);
      expect(timeText.textContent).toContain('12:30:45');
    });
  });

  describe('Versions tab specific features', () => {
    it('should show view mode toggle for versions tab', () => {
      render(
        <Toolbar
          {...defaultProps}
          activeTab="versions"
          versionsViewMode="table"
          onVersionsViewModeChange={vi.fn()}
        />,
      );
      expect(screen.getByTestId('view-mode-table')).toBeInTheDocument();
      expect(screen.getByTestId('view-mode-grid')).toBeInTheDocument();
    });

    it('should call onVersionsViewModeChange when view mode changes', async () => {
      const user = userEvent.setup();
      const onVersionsViewModeChange = vi.fn();
      render(
        <Toolbar
          {...defaultProps}
          activeTab="versions"
          versionsViewMode="table"
          onVersionsViewModeChange={onVersionsViewModeChange}
        />,
      );

      const gridButton = screen.getByTestId('view-mode-grid');
      await user.click(gridButton);

      expect(onVersionsViewModeChange).toHaveBeenCalledWith('thumbnails');
    });

    it('should show version status filter for versions tab', () => {
      render(
        <Toolbar
          {...defaultProps}
          activeTab="versions"
          selectedVersionStatus="all"
          latestOnly={false}
          onVersionStatusChange={vi.fn()}
          onLatestOnlyChange={vi.fn()}
        />,
      );
      expect(screen.getByText(/Status:/i)).toBeInTheDocument();
      expect(screen.getByText(/Latest only/i)).toBeInTheDocument();
    });

    it('should call onVersionStatusChange when status changes', async () => {
      const user = userEvent.setup();
      const onVersionStatusChange = vi.fn();
      render(
        <Toolbar
          {...defaultProps}
          activeTab="versions"
          selectedVersionStatus="all"
          latestOnly={false}
          onVersionStatusChange={onVersionStatusChange}
          onLatestOnlyChange={vi.fn()}
        />,
      );

      const statusSelect = screen.getByRole('combobox');
      await user.selectOptions(statusSelect, 'approved');

      expect(onVersionStatusChange).toHaveBeenCalledWith('approved');
    });

    it('should call onLatestOnlyChange when checkbox changes', async () => {
      const user = userEvent.setup();
      const onLatestOnlyChange = vi.fn();
      render(
        <Toolbar
          {...defaultProps}
          activeTab="versions"
          selectedVersionStatus="all"
          latestOnly={false}
          onVersionStatusChange={vi.fn()}
          onLatestOnlyChange={onLatestOnlyChange}
        />,
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(onLatestOnlyChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Search functionality', () => {
    it('should render search input', () => {
      render(<Toolbar {...defaultProps} searchTerm="" />);
      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toBeInTheDocument();
    });

    it('should display search term', () => {
      render(<Toolbar {...defaultProps} searchTerm="test query" />);
      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      expect(searchInput.value).toBe('test query');
    });

    it('should call onSearchChange when search input changes', async () => {
      const user = userEvent.setup();
      const onSearchChange = vi.fn();
      render(<Toolbar {...defaultProps} searchTerm="" onSearchChange={onSearchChange} />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');

      expect(onSearchChange).toHaveBeenCalled();
    });
  });

  describe('Responsive behavior', () => {
    it('should hide last refresh time on small screens', () => {
      const refreshTime = new Date();
      render(<Toolbar {...defaultProps} lastRefreshTime={refreshTime} />);
      const timeElement = screen.getByText(/Last updated/i);
      expect(timeElement.className).toContain('hidden');
      expect(timeElement.className).toContain('lg:inline');
    });

    it('should show mobile-friendly Add button text', () => {
      render(<Toolbar {...defaultProps} />);
      const button = screen.getByRole('button', { name: /Add/i });
      // Should have both mobile and desktop text
      expect(button.innerHTML).toContain('sm:hidden');
      expect(button.innerHTML).toContain('hidden sm:inline');
    });
  });
});
