/**
 * PanelTabBar
 * Tab-based navigation for bottom panels (Chat, Products, Export, Settings)
 * Industry standard used by Figma, Adobe, and other design tools
 */

import React from 'react';
import { MessageSquare, Package, Download, Settings } from 'lucide-react';

export type PanelTab = 'chat' | 'products' | 'export' | 'settings';

export interface PanelTabBarProps {
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  /** Show product count badge on Products tab */
  productCount?: number;
  /** Show unread messages badge on Chat tab */
  unreadMessages?: number;
}

const TABS: Array<{
  id: PanelTab;
  label: string;
  icon: React.ReactNode;
  badge?: (props: PanelTabBarProps) => number | undefined;
}> = [
  {
    id: 'chat',
    label: 'Chat',
    icon: <MessageSquare className="w-4 h-4" />,
    badge: (props) => props.unreadMessages,
  },
  {
    id: 'products',
    label: 'Products',
    icon: <Package className="w-4 h-4" />,
    badge: (props) => props.productCount,
  },
  {
    id: 'export',
    label: 'Export',
    icon: <Download className="w-4 h-4" />,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="w-4 h-4" />,
  },
];

export const PanelTabBar: React.FC<PanelTabBarProps> = ({
  activeTab,
  onTabChange,
  productCount,
  unreadMessages,
}) => {
  return (
    <div className="flex items-center gap-1 border-b border-border bg-background px-2 py-2">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const badgeValue = tab.badge?.({ activeTab, onTabChange, productCount, unreadMessages });

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
              transition-all duration-200
              ${
                isActive
                  ? 'bg-orange-500/10 text-orange-600 border-b-2 border-orange-500'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
            aria-selected={isActive}
            role="tab"
          >
            {tab.icon}
            <span>{tab.label}</span>

            {/* Badge */}
            {badgeValue !== undefined && badgeValue > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-orange-500 rounded-full">
                {badgeValue > 99 ? '99+' : badgeValue}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default PanelTabBar;
