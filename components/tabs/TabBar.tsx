'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LayoutDashboard, Folder, LayoutGrid, CalendarDays, X } from 'lucide-react';
import { useTabContext, Tab } from './TabContext';

const TAB_ICONS: Record<Tab['type'], React.ElementType> = {
  dashboard: LayoutDashboard,
  project: Folder,
  board: LayoutGrid,
  calendar: CalendarDays,
};

export default function TabBar() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { tabs, activeTabId, closeTab, setActiveTab } = useTabContext();

  const isAuthPage = pathname.startsWith('/auth');

  // Sync active tab when URL changes (browser back/forward, direct access)
  useEffect(() => {
    if (isAuthPage) return;
    const match = tabs.find((t) => t.url === pathname || pathname.startsWith(t.url + '/'));
    if (match && match.id !== activeTabId) {
      setActiveTab(match.id);
    }
  }, [pathname, tabs, activeTabId, setActiveTab, isAuthPage]);

  if (isAuthPage) return null;

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab.id);
    router.push(tab.url);
  };

  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tabIndex = tabs.findIndex((t) => t.id === tabId);
    const isActive = tabId === activeTabId;
    closeTab(tabId);
    if (isActive) {
      const remaining = tabs.filter((t) => t.id !== tabId);
      const next = remaining[Math.max(0, tabIndex - 1)] ?? remaining[0];
      if (next) {
        setActiveTab(next.id);
        router.push(next.url);
      }
    }
  };

  return (
    <div className="h-9 bg-[#f0f0f2] border-b border-[#d1d1d6] flex items-end overflow-x-auto shrink-0 w-full">
      {tabs.map((tab) => {
        const Icon = TAB_ICONS[tab.type] ?? LayoutDashboard;
        const isActive = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            className={`group relative flex items-center gap-1.5 px-3 h-8 min-w-[80px] max-w-[180px] cursor-pointer select-none shrink-0 rounded-t-md transition-colors ${
              isActive
                ? 'bg-white border-t border-l border-r border-[#d1d1d6] text-[#1d1d1f] font-medium -mb-px z-10'
                : 'text-[#7a7a7a] hover:bg-white/50 hover:text-[#3c3c43]'
            }`}
          >
            <Icon size={12} className="shrink-0 opacity-70" />
            <span className="text-[12px] truncate leading-none tracking-[-0.1px] flex-1">
              {tab.title}
            </span>
            {tab.id !== 'dashboard' && (
              <button
                onClick={(e) => handleClose(e, tab.id)}
                className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-[#d1d1d6] transition-all ml-1"
              >
                <X size={10} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
