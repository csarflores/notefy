'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, Folder, LayoutGrid, CalendarDays, Settings, FileText, X, ChevronDown, Menu } from 'lucide-react';
import { useTabContext, Tab } from './TabContext';
import { useSidebar } from '@/components/layout/SidebarContext';
import NotificationBell from '@/components/layout/NotificationBell';

const TAB_ICONS: Record<Tab['type'], React.ElementType> = {
  dashboard: LayoutDashboard,
  project: Folder,
  board: LayoutGrid,
  calendar: CalendarDays,
  settings: Settings,
  note: FileText,
};

export default function TabBar() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { tabs, activeTabId, closeTab, setActiveTab } = useTabContext();
  const { toggleMobile } = useSidebar();
  const [showTabsMenu, setShowTabsMenu] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  const isAuthPage = pathname.startsWith('/auth');

  // Sync active tab when URL changes (browser back/forward, direct access)
  useEffect(() => {
    if (isAuthPage) return;
    const match = tabs.find((t) => t.url === pathname || pathname.startsWith(t.url + '/'));
    if (match && match.id !== activeTabId) {
      setActiveTab(match.id);
    }
  }, [pathname, tabs, activeTabId, setActiveTab, isAuthPage]);

  // Detectar si hay overflow horizontal para mostrar el menú de pestañas
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 4);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [tabs.length]);

  if (isAuthPage) return null;

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab.id);
    router.push(tab.url);
  };

  const navigateAfterClose = (closedTabId: string) => {
    const tabIndex = tabs.findIndex((t) => t.id === closedTabId);
    const isActive = closedTabId === activeTabId;
    if (!isActive) return;
    const remaining = tabs.filter((t) => t.id !== closedTabId);
    const next = remaining[Math.max(0, tabIndex - 1)] ?? remaining[0];
    if (next) {
      setActiveTab(next.id);
      router.push(next.url);
    }
  };

  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
    navigateAfterClose(tabId);
  };

  const handleMiddleClick = (e: React.MouseEvent, tab: Tab) => {
    if (e.button !== 1 || tab.id === 'dashboard') return;
    e.preventDefault();
    e.stopPropagation();
    closeTab(tab.id);
    navigateAfterClose(tab.id);
  };

  const handleCloseOthers = (keepId: string) => {
    tabs.filter((t) => t.id !== keepId && t.id !== 'dashboard').forEach((t) => closeTab(t.id));
    const keep = tabs.find((t) => t.id === keepId);
    if (keep) {
      setActiveTab(keep.id);
      router.push(keep.url);
    }
  };

  return (
    <div className="h-9 bg-[#f0f0f2] border-b border-[#d1d1d6] flex items-end shrink-0 w-full">
      {/* Hamburguesa para abrir el sidebar en móvil */}
      <button
        onClick={toggleMobile}
        aria-label="Abrir menú"
        className="md:hidden shrink-0 self-center p-1.5 mx-1 rounded-md text-[#7a7a7a] hover:bg-white/60 hover:text-[#1d1d1f] transition-colors"
      >
        <Menu size={15} />
      </button>
      <div
        ref={barRef}
        className="flex items-end flex-1 overflow-x-auto overflow-y-hidden scrollbar-none [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const Icon = TAB_ICONS[tab.type] ?? LayoutDashboard;
          const isActive = tab.id === activeTabId;

          return (
            <div
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              onMouseDown={(e) => handleMiddleClick(e, tab)}
              className={`group relative flex items-center gap-1.5 px-3 h-8 min-w-20 max-w-45 cursor-pointer select-none shrink-0 rounded-t-md transition-colors ${
                isActive
                  ? 'bg-white border-t border-l border-r border-[#d1d1d6] text-[#1d1d1f] font-medium -mb-px z-10'
                  : 'text-[#7a7a7a] hover:bg-white/50 hover:text-[#3c3c43]'
              }`}
              title={tab.title}
            >
              <Icon size={12} className="shrink-0 opacity-70" />
              <span className="text-[12px] truncate leading-none tracking-[-0.1px] flex-1">
                {tab.title}
              </span>
              {tab.id !== 'dashboard' && (
                <button
                  onClick={(e) => handleClose(e, tab.id)}
                  aria-label={`Cerrar ${tab.title}`}
                  className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-[#d1d1d6] transition-all ml-1"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Campana de notificaciones */}
      <NotificationBell />

      {/* Menú de pestañas cuando hay overflow */}
      {(overflowing || tabs.length > 6) && (
        <div className="relative shrink-0 h-8 flex items-center">
          <button
            onClick={() => setShowTabsMenu(!showTabsMenu)}
            aria-label="Ver todas las pestañas"
            className="p-1.5 mx-1 rounded-md text-[#7a7a7a] hover:bg-white/60 hover:text-[#1d1d1f] transition-colors"
          >
            <ChevronDown size={14} />
          </button>

          {showTabsMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowTabsMenu(false)} />
              <div className="absolute right-1 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-[#e5e5e5] py-1 z-50 max-h-72 overflow-y-auto">
                {tabs.map((tab) => {
                  const Icon = TAB_ICONS[tab.type] ?? LayoutDashboard;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setShowTabsMenu(false); handleTabClick(tab); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors ${
                        tab.id === activeTabId
                          ? 'bg-[#f0f6ff] text-[#0066cc] font-medium'
                          : 'text-[#1d1d1f] hover:bg-[#f5f5f7]'
                      }`}
                    >
                      <Icon size={12} className="shrink-0 opacity-70" />
                      <span className="truncate flex-1">{tab.title}</span>
                    </button>
                  );
                })}
                {activeTabId && tabs.length > 1 && (
                  <>
                    <div className="h-px bg-[#f0f0f0] my-1" />
                    <button
                      onClick={() => { setShowTabsMenu(false); handleCloseOthers(activeTabId); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] text-[#7a7a7a] hover:bg-[#f5f5f7] transition-colors"
                    >
                      <X size={12} className="shrink-0" />
                      Cerrar las demás pestañas
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
