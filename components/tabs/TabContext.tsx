'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface Tab {
  id: string;
  type: 'dashboard' | 'project' | 'board' | 'calendar';
  resourceId?: string;
  title: string;
  url: string;
}

export const DASHBOARD_TAB: Tab = {
  id: 'dashboard',
  type: 'dashboard',
  title: 'Dashboard',
  url: '/dashboard',
};

interface TabContextValue {
  tabs: Tab[];
  activeTabId: string;
  openTab: (tab: Tab) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
}

const TabContext = createContext<TabContextValue | null>(null);

const TABS_STORAGE_KEY = 'notefy-tabs-v1';
const ACTIVE_TAB_KEY = 'notefy-active-tab-v1';

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([DASHBOARD_TAB]);
  const [activeTabId, setActiveTabIdState] = useState('dashboard');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedTabs = localStorage.getItem(TABS_STORAGE_KEY);
      const storedActive = localStorage.getItem(ACTIVE_TAB_KEY);

      if (storedTabs) {
        const parsed: Tab[] = JSON.parse(storedTabs);
        const withDashboard = parsed.some((t) => t.id === 'dashboard')
          ? parsed
          : [DASHBOARD_TAB, ...parsed];
        setTabs(withDashboard);
      }

      if (storedActive) {
        setActiveTabIdState(storedActive);
      }
    } catch {
      // ignore storage errors
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
    } catch {
      // ignore
    }
  }, [tabs, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, activeTabId);
    } catch {
      // ignore
    }
  }, [activeTabId, hydrated]);

  const openTab = useCallback((tab: Tab) => {
    setTabs((prev) => {
      const existing = prev.find((t) => t.id === tab.id);
      if (existing) {
        if (existing.title !== tab.title) {
          return prev.map((t) => (t.id === tab.id ? { ...t, title: tab.title } : t));
        }
        return prev;
      }
      return [...prev, tab];
    });
    setActiveTabIdState(tab.id);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    if (tabId === 'dashboard') return;
    setTabs((prev) => prev.filter((t) => t.id !== tabId));
  }, []);

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabIdState(tabId);
  }, []);

  return (
    <TabContext.Provider value={{ tabs, activeTabId, openTab, closeTab, setActiveTab }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabContext() {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error('useTabContext must be used within TabProvider');
  return ctx;
}
