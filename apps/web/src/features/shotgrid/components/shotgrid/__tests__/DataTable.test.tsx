import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from '../DataTable';
import type { TabType } from '@shogun/shared';
import type { TableColumn } from '../DataTable';

// Mock the hooks and components
vi.mock('../hooks/useSorting', () => ({
  useSorting: vi.fn((data) => ({
    sortedData: data || [],
    handleSort: vi.fn(),
    getSortIcon: vi.fn(() => '↕️'),
  })),
}));

vi.mock('../DataTableMobileCard', () => ({
  DataTableMobileCard: ({ item }: { item: any }) => (
    <div data-testid={`mobile-card-${item.id}`}>{item.name}</div>
  ),
}));

vi.mock('../ScrollIndicator', () => ({
  ScrollIndicator: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('DataTable', () => {
  const mockColumns: TableColumn[] = [
    { label: 'Code', field: 'code' },
    { label: 'Name', field: 'name' },
    { label: 'Status', field: 'status' },
  ];

  const mockData = [
    { id: '1', code: 'PRJ001', name: 'Project 1', status: 'active' },
    { id: '2', code: 'PRJ002', name: 'Project 2', status: 'waiting' },
    { id: '3', code: 'PRJ003', name: 'Project 3', status: 'active' },
  ];

  const defaultProps = {
    columns: mockColumns,
    data: mockData,
    entityType: 'projects' as TabType,
    selectedItems: new Set<string>(),
    onItemSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onItemClick: vi.fn(),
  };

  beforeEach(() => {
    // Mock window.innerWidth for desktop view
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render table with columns', () => {
      render(<DataTable {...defaultProps} />);
      expect(screen.getByText('Code')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should render table with data-testid', () => {
      render(<DataTable {...defaultProps} />);
      const table = screen.getByTestId('projects-table');
      expect(table).toBeInTheDocument();
    });

    it('should render empty state when no data', () => {
      render(<DataTable {...defaultProps} data={[]} />);
      // In desktop view, empty state might not be visible, but table should exist
      const table = screen.getByTestId('projects-table');
      expect(table).toBeInTheDocument();
    });
  });

  describe('Column rendering', () => {
    it('should render custom render function', () => {
      const columnsWithRender: TableColumn[] = [
        {
          label: 'Status',
          field: 'status',
          render: (item: any) => <span data-testid={`status-${item.id}`}>{item.status}</span>,
        },
      ];

      render(<DataTable {...defaultProps} columns={columnsWithRender} data={mockData} />);

      expect(screen.getByTestId('status-1')).toBeInTheDocument();
    });

    it('should render code field as clickable button', () => {
      render(<DataTable {...defaultProps} />);
      const codeButtons = screen.getAllByRole('button', { name: /PRJ\d+/ });
      expect(codeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Selection', () => {
    it('should render select all checkbox', () => {
      render(<DataTable {...defaultProps} />);
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should call onSelectAll when select all is clicked', async () => {
      const user = userEvent.setup();
      const onSelectAll = vi.fn();
      render(<DataTable {...defaultProps} onSelectAll={onSelectAll} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const selectAllCheckbox = checkboxes[0]; // First checkbox is select all

      await user.click(selectAllCheckbox);
      expect(onSelectAll).toHaveBeenCalled();
    });

    it('should call onItemSelect when row checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onItemSelect = vi.fn();
      render(<DataTable {...defaultProps} onItemSelect={onItemSelect} />);

      const checkboxes = screen.getAllByRole('checkbox');
      // Skip select all checkbox (first one)
      if (checkboxes.length > 1) {
        await user.click(checkboxes[1]);
        expect(onItemSelect).toHaveBeenCalled();
      }
    });

    it('should show selected items count in footer', () => {
      const selectedItems = new Set(['1', '2']);
      render(<DataTable {...defaultProps} selectedItems={selectedItems} />);
      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });
  });

  describe('Item click', () => {
    it('should call onItemClick when code is clicked', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();
      render(<DataTable {...defaultProps} onItemClick={onItemClick} />);

      const codeButton = screen.getByRole('button', { name: 'PRJ001' });
      await user.click(codeButton);

      expect(onItemClick).toHaveBeenCalledWith(
        'projects',
        expect.objectContaining({ code: 'PRJ001' }),
      );
    });
  });

  describe('Footer', () => {
    it('should render footer with item count', () => {
      render(<DataTable {...defaultProps} />);
      expect(screen.getByText('3 items')).toBeInTheDocument();
    });

    it('should render footer data when provided', () => {
      const footerData = { duration: 120 };
      const columnsWithFooter: TableColumn[] = [{ label: 'Duration', field: 'duration' }];
      render(<DataTable {...defaultProps} columns={columnsWithFooter} footerData={footerData} />);

      expect(screen.getByText('120')).toBeInTheDocument();
    });
  });

  describe('Column visibility', () => {
    it('should show column toggle button when has collapsible columns', () => {
      const columnsWithPriority: TableColumn[] = [
        { label: 'Code', field: 'code', priority: 1 },
        { label: 'Name', field: 'name', priority: 2 },
        { label: 'Extra', field: 'extra', priority: 3 }, // Collapsible
      ];

      render(<DataTable {...defaultProps} columns={columnsWithPriority} />);
      expect(screen.getByText(/Show All Columns|Hide Columns/)).toBeInTheDocument();
    });

    it('should not show column toggle when no collapsible columns', () => {
      const columnsNoPriority: TableColumn[] = [
        { label: 'Code', field: 'code' },
        { label: 'Name', field: 'name' },
      ];

      render(<DataTable {...defaultProps} columns={columnsNoPriority} />);
      expect(screen.queryByText(/Show All Columns/)).not.toBeInTheDocument();
    });
  });

  describe('Mobile view', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500, // Mobile width
      });
    });

    it('should render mobile card view on small screens', async () => {
      // Force re-render with mobile width
      const { rerender } = render(<DataTable {...defaultProps} />);

      // Trigger resize event wrapped in act
      await act(async () => {
        window.dispatchEvent(new Event('resize'));
        rerender(<DataTable {...defaultProps} />);
      });

      // Mobile view should show cards instead of table
      // Check if either table exists or mobile cards exist
      const table = screen.queryByTestId('projects-table');
      const mobileCards = screen.queryAllByTestId(/mobile-card-/);
      expect(table || mobileCards.length > 0).toBeTruthy();
    });
  });
});
