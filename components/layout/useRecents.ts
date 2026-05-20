'use client';

import { useState, useEffect, useCallback } from 'react';

export interface RecentItem {
  id: string;
  type: 'project' | 'board' | 'note';
  title: string;
  url: string;
}

const STORAGE_KEY = 'notefy-recents-v1';
const MAX = 5;

export function useRecents() {
  const [recents, setRecents] = useState<RecentItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setRecents(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const push = useCallback((item: RecentItem) => {
    setRecents((prev) => {
      const filtered = prev.filter((r) => r.id !== item.id);
      const next = [item, ...filtered].slice(0, MAX);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setRecents((prev) => {
      const next = prev.filter((r) => r.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { recents, push, remove };
}
