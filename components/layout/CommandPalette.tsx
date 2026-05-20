'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Folder, LayoutGrid, FileText, CheckSquare, Plus, X } from 'lucide-react';
import { globalSearch, SearchResult } from '@/actions/search-actions';
import { useTabContext } from '@/components/tabs/TabContext';
import { useCommandPalette } from './CommandPaletteContext';
import { useState } from 'react';

const TYPE_ICONS = {
  project: <Folder size={14} className="text-[#0066cc]" />,
  board: <LayoutGrid size={14} className="text-[#8b5cf6]" />,
  note: <FileText size={14} className="text-[#10b981]" />,
  task: <CheckSquare size={14} className="text-[#f97316]" />,
};

const TYPE_LABELS = {
  project: 'Proyecto',
  board: 'Tablero',
  note: 'Nota',
  task: 'Tarea',
};

const TAB_TYPES = {
  project: 'project',
  board: 'board',
  note: 'board',
  task: 'board',
} as const;

interface CommandPaletteProps {
  userId: string;
  onCreateProject: () => void;
  onCreateBoard: () => void;
  onCreateNote: () => void;
}

export default function CommandPalette({
  userId,
  onCreateProject,
  onCreateBoard,
  onCreateNote,
}: CommandPaletteProps) {
  const { isOpen, open, close } = useCommandPalette();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { openTab } = useTabContext();

  // Open on Ctrl+K / Cmd+K
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        open();
      }
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [open, close]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setActiveIndex(0);
    }
  }, [isOpen]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const res = await globalSearch(userId, q);
    setResults(res);
    setActiveIndex(0);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  const navigate = (result: SearchResult) => {
    const tabType = TAB_TYPES[result.type];
    openTab({
      id: `${result.type}-${result.id}`,
      type: tabType === 'project' ? 'project' : 'board',
      title: result.title,
      url: result.url,
      resourceId: result.id,
    });
    router.push(result.url);
    close();
  };

  const actions = [
    { icon: <Folder size={14} className="text-[#0066cc]" />, label: 'Nuevo Proyecto', action: () => { close(); onCreateProject(); } },
    { icon: <LayoutGrid size={14} className="text-[#8b5cf6]" />, label: 'Nuevo Tablero', action: () => { close(); onCreateBoard(); } },
    { icon: <FileText size={14} className="text-[#10b981]" />, label: 'Nueva Nota', action: () => { close(); onCreateNote(); } },
  ];

  const allItems = results.length > 0 ? results : [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const total = allItems.length + (query ? 0 : actions.length);
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => (i + 1) % total); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => (i - 1 + total) % total); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[activeIndex]) navigate(allItems[activeIndex]);
      else if (!query && actions[activeIndex - allItems.length]) actions[activeIndex - allItems.length].action();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={close}
    >
      <div className="absolute inset-0 bg-black/30" />

      <div
        className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl border border-[#e0e0e0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f0f0f2]">
          <Search size={16} className="text-[#a0a0a8] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar proyectos, tableros, notas, tareas..."
            className="flex-1 text-[14px] text-[#1d1d1f] placeholder:text-[#a0a0a8] outline-none bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[#a0a0a8] hover:text-[#1d1d1f]">
              <X size={14} />
            </button>
          )}
          <kbd className="text-[10px] text-[#a0a0a8] bg-[#f5f5f7] px-1.5 py-0.5 rounded border border-[#e0e0e0]">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1.5">
          {loading && (
            <div className="px-4 py-3 text-[13px] text-[#a0a0a8]">Buscando...</div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="px-4 py-3 text-[13px] text-[#a0a0a8]">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && results.map((r, i) => (
            <button
              key={r.id}
              onClick={() => navigate(r)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === activeIndex ? 'bg-[#f0f0f2]' : 'hover:bg-[#f5f5f7]'
              }`}
            >
              <span className="shrink-0">{TYPE_ICONS[r.type]}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] text-[#1d1d1f] truncate">{r.title}</span>
                {r.subtitle && (
                  <span className="block text-[11px] text-[#7a7a7a] truncate">{r.subtitle}</span>
                )}
              </span>
              <span className="text-[10px] text-[#a0a0a8] bg-[#f5f5f7] px-1.5 py-0.5 rounded shrink-0">
                {TYPE_LABELS[r.type]}
              </span>
            </button>
          ))}

          {!query && (
            <>
              <div className="px-4 py-1.5">
                <span className="text-[11px] font-semibold text-[#a0a0a8] uppercase tracking-wider">
                  Acciones rápidas
                </span>
              </div>
              {actions.map((a, i) => (
                <button
                  key={a.label}
                  onClick={a.action}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === activeIndex ? 'bg-[#f0f0f2]' : 'hover:bg-[#f5f5f7]'
                  }`}
                >
                  <Plus size={14} className="text-[#a0a0a8] shrink-0" />
                  <span className="text-[13px] text-[#1d1d1f]">{a.label}</span>
                  <span className="ml-auto">{a.icon}</span>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="px-4 py-2 border-t border-[#f0f0f2] flex items-center gap-3 text-[11px] text-[#a0a0a8]">
          <span><kbd className="bg-[#f5f5f7] px-1 py-0.5 rounded border border-[#e0e0e0]">↑↓</kbd> navegar</span>
          <span><kbd className="bg-[#f5f5f7] px-1 py-0.5 rounded border border-[#e0e0e0]">↵</kbd> abrir</span>
          <span><kbd className="bg-[#f5f5f7] px-1 py-0.5 rounded border border-[#e0e0e0]">Esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  );
}
