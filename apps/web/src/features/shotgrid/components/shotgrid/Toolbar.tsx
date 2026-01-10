import React from 'react';
import type { TabType } from '@shogun/shared';
import { TAB_CONFIG } from '@shogun/shared';

interface ToolbarProps {
  activeTab: TabType;
  selectedItems: Set<string>;
  isRefreshing: boolean;
  lastRefreshTime: Date | null;
  showFilters: boolean;
  versionsViewMode?: 'table' | 'thumbnails';
  selectedVersionStatus?: string;
  latestOnly?: boolean;
  searchTerm?: string;
  onAddClick: () => void;
  onDeleteSelected: () => void;
  onRefresh: () => void;
  onToggleFilters: () => void;
  onVersionsViewModeChange?: (mode: 'table' | 'thumbnails') => void;
  onVersionStatusChange?: (status: string) => void;
  onLatestOnlyChange?: (value: boolean) => void;
  onSearchChange?: (term: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTab,
  selectedItems,
  isRefreshing,
  lastRefreshTime,
  versionsViewMode,
  selectedVersionStatus,
  latestOnly,
  searchTerm = '',
  onAddClick,
  onDeleteSelected,
  onRefresh,
  onToggleFilters,
  onVersionsViewModeChange,
  onVersionStatusChange,
  onLatestOnlyChange,
  onSearchChange,
}) => {
  const getAddButtonLabel = () => {
    const tab = TAB_CONFIG.find((t) => t.id === activeTab);
    if (!tab) return '';
    if (tab.label === 'Status') return 'Status';
    return tab.label.slice(0, -1);
  };

  return (
    <div
      className="px-3 sm:px-6 py-2 sm:py-3"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-primary)',
      }}
    >
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 lg:gap-0 min-h-[40px]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn-primary text-sm w-auto sm:w-40 text-center px-3"
            onClick={onAddClick}
          >
            <span className="hidden sm:inline">+ Add {getAddButtonLabel()}</span>
            <span className="sm:hidden">+ Add</span>
          </button>
          <button className="btn-secondary text-sm px-3" onClick={onToggleFilters}>
            Filter
          </button>
          <button
            className="btn-secondary text-sm flex items-center space-x-2 px-3"
            style={{
              backgroundColor: isRefreshing ? '#3b82f6' : undefined,
              color: isRefreshing ? 'white' : undefined,
              transition: 'background-color 0.2s ease, color 0.2s ease',
            }}
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <svg
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {lastRefreshTime && (
            <span className="text-xs hidden lg:inline" style={{ color: 'var(--text-secondary)' }}>
              Last updated: {lastRefreshTime.toLocaleTimeString()}
            </span>
          )}
          {activeTab === 'versions' && onVersionsViewModeChange && (
            <>
              <div
                className="h-6 w-px mx-2 hidden md:block"
                style={{ backgroundColor: 'var(--border-primary)' }}
              ></div>
              <div
                className="flex items-center h-8 rounded overflow-hidden"
                style={{ border: '1px solid var(--border-primary)' }}
              >
                <button
                  onClick={() => onVersionsViewModeChange('table')}
                  className="px-3 h-8 py-0 text-sm"
                  data-testid="view-mode-table"
                  style={{
                    backgroundColor:
                      versionsViewMode === 'table'
                        ? 'var(--accent-primary)'
                        : 'var(--bg-secondary)',
                    color:
                      versionsViewMode === 'table'
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                  }}
                >
                  Table
                </button>
                <button
                  onClick={() => onVersionsViewModeChange('thumbnails')}
                  className="px-3 h-8 py-0 text-sm"
                  data-testid="view-mode-grid"
                  style={{
                    backgroundColor:
                      versionsViewMode === 'thumbnails'
                        ? 'var(--accent-primary)'
                        : 'var(--bg-secondary)',
                    color:
                      versionsViewMode === 'thumbnails'
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                  }}
                >
                  Grid
                </button>
              </div>
            </>
          )}
          {selectedItems.size > 0 && (
            <button
              className="px-3 h-8 py-0 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              onClick={onDeleteSelected}
            >
              Delete ({selectedItems.size})
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'versions' && onVersionStatusChange && onLatestOnlyChange && (
            <>
              <div className="flex items-center space-x-2 h-8">
                <span
                  className="text-sm hidden sm:inline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Status:
                </span>
                <select
                  value={selectedVersionStatus}
                  onChange={(e) => onVersionStatusChange(e.target.value)}
                  className="select-primary h-8 py-0 px-2 text-sm min-w-0 leading-none"
                >
                  <option value="all">All</option>
                  <option value="wip">Work in Progress</option>
                  <option value="review">Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer h-8">
                <input
                  className="w-4 h-4"
                  type="checkbox"
                  checked={latestOnly}
                  onChange={(e) => onLatestOnlyChange(e.target.checked)}
                />
                <span
                  className="text-sm whitespace-nowrap"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Latest only
                </span>
              </label>
            </>
          )}
          <input
            type="search"
            placeholder="Search..."
            className="input-primary h-8 py-0 px-3 text-sm w-full sm:w-48 lg:w-64"
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
            data-testid="search-input"
          />
        </div>
      </div>
    </div>
  );
};
