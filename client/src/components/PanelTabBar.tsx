/**
 * PanelTabBar
 * Tab-based navigation for bottom panels (Chat, Products, Export, Settings)
 * Industry standard used by Figma, Adobe, and other design tools
 * Optimized for best-in-class UI/UX
 */

import React from 'react';
import { MessageSquare, Package, Download, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
    <div className="flex items-center gap-1 border-b border-border bg-background px-3 py-2.5">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const badgeValue = tab.badge?.({ activeTab, onTabChange, productCount, unreadMessages });

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              transition-all duration-200 whitespace-nowrap
              ${
                isActive
                  ? 'bg-orange-500/15 text-orange-600 border-b-2 border-orange-500'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }
            `}
            aria-selected={isActive}
            role="tab"
          >
            {tab.icon}
            <span className="text-xs font-semibold tracking-wide">{tab.label}</span>

            {/* Badge - Optimized styling */}
            {badgeValue !== undefined && badgeValue > 0 && (
              <Badge
                variant="default"
                className="ml-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center rounded-full"
              >
                {badgeValue > 999 ? '999+' : badgeValue}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default PanelTabBar;
