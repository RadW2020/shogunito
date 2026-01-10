import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssetsTabWrapper } from '../AssetsTabWrapper';
import { useUiStore } from '@app/stores/uiStore';

// Mock the Zustand store
vi.mock('@app/stores/uiStore', () => ({
  useUiStore: vi.fn(),
}));

// Mock useAssets
const mockUseAssets = vi.fn();
vi.mock('../../api/useAssets', () => ({
  useAssets: () => mockUseAssets(),
}));

// Mock AssetsTab
vi.mock('@features/shotgrid/components/shotgrid/tabs/AssetsTab', () => ({
  AssetsTab: ({ assets }: any) => (
    <div data-testid="assets-tab">
      {assets.map((a: any) => (
        <div key={a.id}>{a.name}</div>
      ))}
    </div>
  ),
}));

// Mock LoadingSpinner and EmptyState
vi.mock('@shared/ui', () => ({
  LoadingSpinner: ({ size }: any) => <div data-testid="loading-spinner">{size}</div>,
  EmptyState: ({ title, description, action }: any) => (
    <div data-testid="empty-state">
      <div>{title}</div>
      <div>{description}</div>
      {action}
    </div>
  ),
}));

describe('AssetsTabWrapper', () => {
  const defaultProps = {
    statusMap: {
      active: { label: 'Active', color: '#00FF00' },
      waiting: { label: 'Waiting', color: '#FF0000' },
    },
    selectedItems: new Set<string>(),
    onItemSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onItemClick: vi.fn(),
    onEditAsset: vi.fn(),
    onAddNoteToAsset: vi.fn(),
    onViewNotes: vi.fn(),
  };

  const mockAssets = [
    {
      id: 1,
      code: 'CHAR001',
      name: 'Character One',
      projectId: 1,
      status: 'waiting',
      assetType: 'character',
      description: 'First character',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      code: 'PROP001',
      name: 'Prop One',
      projectId: 1,
      status: 'active',
      assetType: 'prop',
      description: 'First prop',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      code: 'ENV001',
      name: 'Environment One',
      projectId: 2,
      status: 'waiting',
      assetType: 'environment',
      description: 'First environment',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const renderWithQueryClient = (ui: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useUiStore as any).mockReturnValue({
      filters: {
        selectedProjectId: 'all',
        selectedAssetId: 'all',
      },
    });
    mockUseAssets.mockReturnValue({
      data: mockAssets,
      isLoading: false,
      error: null,
    });
  });

  describe('Basic rendering', () => {
    it('should render AssetsTab with assets', () => {
      renderWithQueryClient(<AssetsTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('assets-tab')).toBeInTheDocument();
      expect(screen.getByText('Character One')).toBeInTheDocument();
      expect(screen.getByText('Prop One')).toBeInTheDocument();
      expect(screen.getByText('Environment One')).toBeInTheDocument();
    });

    it('should show loading spinner when loading', () => {
      mockUseAssets.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      });

      renderWithQueryClient(<AssetsTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should show error state when there is an error', () => {
      mockUseAssets.mockReturnValue({
        data: [],
        isLoading: false,
        error: { message: 'Failed to load assets' },
      });

      renderWithQueryClient(<AssetsTabWrapper {...defaultProps} />);
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('Error loading assets')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter by selected project', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '1',
          selectedAssetId: 'all',
        },
      });

      renderWithQueryClient(<AssetsTabWrapper {...defaultProps} />);

      // Only assets from project 1 should be shown
      expect(screen.getByText('Character One')).toBeInTheDocument();
      expect(screen.getByText('Prop One')).toBeInTheDocument();
      expect(screen.queryByText('Environment One')).not.toBeInTheDocument();
    });

    it('should filter by selected asset', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedAssetId: 'CHAR001',
        },
      });

      renderWithQueryClient(<AssetsTabWrapper {...defaultProps} />);

      // Only asset with code CHAR001 should be shown
      expect(screen.getByText('Character One')).toBeInTheDocument();
      expect(screen.queryByText('Prop One')).not.toBeInTheDocument();
      expect(screen.queryByText('Environment One')).not.toBeInTheDocument();
    });

    it('should filter by search term', () => {
      renderWithQueryClient(<AssetsTabWrapper {...defaultProps} searchTerm="Character" />);

      expect(screen.getByText('Character One')).toBeInTheDocument();
      expect(screen.queryByText('Prop One')).not.toBeInTheDocument();
      expect(screen.queryByText('Environment One')).not.toBeInTheDocument();
    });

    it('should combine multiple filters', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '1',
          selectedAssetId: 'all',
        },
      });

      renderWithQueryClient(<AssetsTabWrapper {...defaultProps} searchTerm="Prop" />);

      // Should show only props from project 1
      expect(screen.getByText('Prop One')).toBeInTheDocument();
      expect(screen.queryByText('Character One')).not.toBeInTheDocument();
      expect(screen.queryByText('Environment One')).not.toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no assets match filters', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '999',
          selectedAssetId: 'all',
        },
      });

      renderWithQueryClient(<AssetsTabWrapper {...defaultProps} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No assets found')).toBeInTheDocument();
    });

    it('should show clear filters button when filters are active', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: '1',
          selectedAssetId: 'all',
        },
      });
      const setFilter = vi.fn();
      (useUiStore.getState as any) = vi.fn(() => ({
        setFilter,
      }));

      mockUseAssets.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<AssetsTabWrapper {...defaultProps} />);

      const clearButton = screen.getByText('Clear filters');
      expect(clearButton).toBeInTheDocument();
    });

    it('should not show clear filters button when no filters are active', () => {
      (useUiStore as any).mockReturnValue({
        filters: {
          selectedProjectId: 'all',
          selectedAssetId: 'all',
        },
      });

      mockUseAssets.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<AssetsTabWrapper {...defaultProps} />);

      expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('should search by name', () => {
      renderWithQueryClient(<AssetsTabWrapper {...defaultProps} searchTerm="Character" />);

      expect(screen.getByText('Character One')).toBeInTheDocument();
      expect(screen.queryByText('Prop One')).not.toBeInTheDocument();
    });

    it('should search by code', () => {
      renderWithQueryClient(<AssetsTabWrapper {...defaultProps} searchTerm="PROP" />);

      expect(screen.getByText('Prop One')).toBeInTheDocument();
      expect(screen.queryByText('Character One')).not.toBeInTheDocument();
    });

    it('should search by description', () => {
      renderWithQueryClient(<AssetsTabWrapper {...defaultProps} searchTerm="environment" />);

      expect(screen.getByText('Environment One')).toBeInTheDocument();
      expect(screen.queryByText('Character One')).not.toBeInTheDocument();
    });

    it('should be case insensitive', () => {
      renderWithQueryClient(<AssetsTabWrapper {...defaultProps} searchTerm="character" />);

      expect(screen.getByText('Character One')).toBeInTheDocument();
    });
  });
});
