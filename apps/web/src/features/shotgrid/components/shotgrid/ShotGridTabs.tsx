import React, { memo } from 'react';
import { TAB_CONFIG } from '@shogunito/shared';
import type { TabType } from '@shogunito/shared';

interface ShotGridTabsProps {
  activeTab: TabType;
  onTabChange: (tabId: TabType) => void;
}

/**
 * Component for rendering and managing tab navigation in ShotGrid
 * Memoized to prevent unnecessary re-renders when parent re-renders
 */
export const ShotGridTabs: React.FC<ShotGridTabsProps> = memo(({ activeTab, onTabChange }) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-primary)',
      }}
    >
      <div className="flex overflow-x-auto">
        {TAB_CONFIG.map((tab: { readonly id: string; readonly label: string }) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as TabType)}
            className={
              'flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap focus:outline-none focus:ring-0'
            }
            aria-selected={activeTab === tab.id}
            data-testid={`tab-${tab.id}`}
            style={{
              color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
              backgroundColor: activeTab === tab.id ? 'var(--bg-hover)' : 'transparent',
              borderBottomColor: activeTab === tab.id ? 'var(--accent-primary)' : 'transparent',
              outline: 'none',
              boxShadow: 'none',
            }}
          >
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

ShotGridTabs.displayName = 'ShotGridTabs';
