'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Folder, LayoutGrid, FileText, CheckSquare,
  Plus, FolderPlus, Clock, X, CornerDownLeft, CalendarDays,
} from 'lucide-react';
import { globalSearch, SearchResult } from '@/actions/search-actions';
import { useCommandPalette } from './CommandPaletteContext';
import { useTabContext } from '@/components/tabs/TabContext';
import { useRecents, RecentItem } from './useRecents';

const TYPE_META = {
  project: { icon: Folder, label: 'Proyectos' },
  board: { icon: LayoutGrid, label: 'Tableros' },
  note: { icon: FileText, label: 'Notas' },
  task: { icon: CheckSquare, label: 'Tareas' },
} as const;

const TAB_TYPES = {
  project: 'project',
  board: 'board',
  note: 'note',
  task: 'board',
} as const;

const RECENT_ICONS: Record<RecentItem['type'], React.ElementType> = {
  project: Folder,
  board: LayoutGrid,
  note: FileText,
  calendar: CalendarDays,
};

interface PaletteItem {
  key: string;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  hint?: string;
  onSelect: () => void;
}

interface PaletteSection {
  label: string;
  items: PaletteItem[];
}

interface CommandPaletteProps {
  userId: string;
  onCreateProject: () => void;
  onCreateBoard: () => void;
  onCreateNote: () => void;
}

export default function CommandPalette({ userId, onCreateProject, onCreateBoard, onCreateNote }: CommandPaletteProps) {
  const { isOpen, open, close } = useCommandPalette();
  const { openTab } = useTabContext();
  const { recents, push: pushRecent } = useRecents();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Atajo global Ctrl/Cmd + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) close(); else open();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, open, close]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      if (!userId) { setLoading(false); return; }
      const res = await globalSearch(userId, query);
      setResults(res);
      setLoading(false);
      setActiveIndex(0);
    }, 200);
  }, [query, userId]);

  const navigate = useCallback((result: SearchResult) => {
    close();
    const tabType = TAB_TYPES[result.type];
    // Las tareas abren el tablero que las contiene (con deep-link ?task=)
    const boardIdFromUrl = result.type === 'task'
      ? result.url.split('/board/')[1]?.split('?')[0]
      : undefined;
    const tabId = boardIdFromUrl ? `board-${boardIdFromUrl}` : `${result.type}-${result.id}`;
    openTab({
      id: tabId,
      type: tabType,
      title: result.title,
      url: result.url,
      resourceId: boardIdFromUrl || result.id,
    });
    pushRecent({ id: tabId, type: tabType as RecentItem['type'], title: result.title, url: result.url });
    router.push(result.url);
  }, [close, openTab, pushRecent, router]);

  const navigateRecent = useCallback((item: RecentItem) => {
    close();
    openTab({ id: item.id, type: item.type, title: item.title, url: item.url });
    router.push(item.url);
  }, [close, openTab, router]);

  const runAction = useCallback((fn: () => void) => {
    close();
    fn();
  }, [close]);

  // Build sections
  const sections: PaletteSection[] = [];

  if (!query.trim()) {
    if (recents.length > 0) {
      sections.push({
        label: 'Recientes',
        items: recents.slice(0, 5).map((r) => ({
          key: `recent-${r.id}`,
          icon: RECENT_ICONS[r.type] || FileText,
          title: r.title,
          onSelect: () => navigateRecent(r),
        })),
      });
    }
    sections.push({
      label: 'Acciones',
      items: [
        {
          key: 'action-board',
          icon: Plus,
          title: 'Nuevo tablero',
          hint: 'B',
          onSelect: () => runAction(onCreateBoard),
        },
        {
          key: 'action-note',
          icon: FileText,
          title: 'Nueva nota',
          hint: 'N',
          onSelect: () => runAction(onCreateNote),
        },
        {
          key: 'action-project',
          icon: FolderPlus,
          title: 'Nuevo proyecto',
          hint: 'P',
          onSelect: () => runAction(onCreateProject),
        },
      ],
    });
  } else {
    const grouped = (['project', 'board', 'note', 'task'] as const)
      .map((type) => ({
        label: TYPE_META[type].label,
        items: results
          .filter((r) => r.type === type)
          .map((r) => ({
            key: `${r.type}-${r.id}`,
            icon: TYPE_META[type].icon,
            title: r.title,
            subtitle: r.subtitle,
            onSelect: () => navigate(r),
          })),
      }))
      .filter((g) => g.items.length > 0);
    sections.push(...grouped);
  }

  const total = sections.reduce((n, s) => n + s.items.length, 0);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }
      if (total === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % total);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + total) % total);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        let idx = 0;
        for (const section of sections) {
          for (const item of section.items) {
            if (idx === activeIndex) { item.onSelect(); return; }
            idx++;
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // Scroll active into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  let flatIndex = -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[300] flex items-start justify-center pt-[14vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={close} />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-[540px] bg-white rounded-2xl shadow-2xl border border-[#e8e8ed] overflow-hidden"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            role="dialog"
            aria-label="Búsqueda global"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#f0f0f2]">
              <Search size={17} className="text-[#a0a0a8] shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar proyectos, tableros, notas, tareas..."
                className="flex-1 bg-transparent text-[15px] text-[#1d1d1f] placeholder-[#a0a0a8] outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-[#a0a0a8] hover:text-[#7a7a7a] transition-colors">
                  <X size={15} />
                </button>
              )}
              <kbd className="text-[10px] text-[#a0a0a8] bg-[#f5f5f7] border border-[#e5e5ea] rounded px-1.5 py-0.5 font-mono">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[380px] overflow-y-auto py-2" role="listbox">
              {loading && (
                <div className="px-4 py-3 text-[13px] text-[#a0a0a8]">Buscando...</div>
              )}

              {!loading && sections.map((section) => (
                <div key={section.label}>
                  <div className="px-4 py-1.5 text-[10px] font-semibold text-[#a0a0a8] uppercase tracking-wider">
                    {section.label}
                  </div>
                  {section.items.map((item) => {
                    flatIndex += 1;
                    const idx = flatIndex;
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={item.key}
                        data-idx={idx}
                        onClick={item.onSelect}
                        onMouseEnter={() => setActiveIndex(idx)}
                        role="option"
                        aria-selected={activeIndex === idx}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          activeIndex === idx ? 'bg-[#f0f6ff]' : 'hover:bg-[#fafafc]'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeIndex === idx ? 'bg-[#e0edff] text-[#0066cc]' : 'bg-[#f5f5f7] text-[#7a7a7a]'
                        }`}>
                          <ItemIcon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#1d1d1f] truncate">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-[11px] text-[#a0a0a8] truncate">{item.subtitle}</p>
                          )}
                        </div>
                        {item.hint ? (
                          <kbd className="text-[10px] text-[#a0a0a8] bg-[#f5f5f7] border border-[#e5e5ea] rounded px-1.5 py-0.5 font-mono shrink-0">
                            {item.hint}
                          </kbd>
                        ) : activeIndex === idx ? (
                          <CornerDownLeft size={12} className="text-[#0066cc] shrink-0" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}

              {!loading && query.trim() && total === 0 && (
                <div className="flex flex-col items-center py-10 text-center">
                  <Search size={22} className="text-[#d1d1d6] mb-2" />
                  <p className="text-[13px] text-[#7a7a7a]">Sin resultados para &quot;{query}&quot;</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#f0f0f2] px-4 py-2 flex items-center gap-4 text-[10px] text-[#a0a0a8]">
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-[#f5f5f7] border border-[#e5e5ea] rounded px-1">↑↓</kbd>
                navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-[#f5f5f7] border border-[#e5e5ea] rounded px-1">↵</kbd>
                abrir
              </span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                recientes al abrir
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
