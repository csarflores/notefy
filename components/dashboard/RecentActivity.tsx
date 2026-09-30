'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRecentActivity, ActivityItem } from '@/actions/dashboard-actions';
import { Activity, ChevronDown } from 'lucide-react';

const COLLAPSED_KEY = 'activity:collapsed';

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export default function RecentActivity() {
  const router = useRouter();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean | null>(null);

  useEffect(() => {
    // Colapsado por defecto hasta que el usuario lo expanda
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) !== '0');
    getRecentActivity(6).then((result) => {
      if (result.success && result.data) setItems(result.data);
      setLoaded(true);
    });
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  };

  if (!loaded || items.length === 0) return null;

  // Barra resumen colapsada
  if (collapsed) {
    return (
      <button
        onClick={toggleCollapsed}
        className="w-full bg-white rounded-xl border border-[#e0e0e0] px-4 py-2.5 mt-4 flex items-center gap-2 hover:border-[#d0d0d5] transition-colors text-left"
      >
        <Activity size={13} className="text-[#8e8e93] shrink-0" />
        <span className="text-[13px] font-semibold text-[#1d1d1f]">Actividad reciente</span>
        <span className="text-[12px] text-[#8e8e93] truncate">
          {items.length} actualizaci{items.length !== 1 ? 'ones' : 'ón'} · última {timeAgo(items[0]?.updatedAt)}
        </span>
        <ChevronDown size={14} className="ml-auto text-[#a0a0a8] shrink-0" />
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#e0e0e0] px-4 py-3 mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Activity size={13} className="text-[#8e8e93]" />
        <h2 className="text-[13px] font-semibold text-[#1d1d1f] tracking-[-0.12px]">
          Actividad reciente
        </h2>
        <button
          onClick={toggleCollapsed}
          className="ml-auto p-1 rounded-lg text-[#a0a0a8] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors"
          title="Colapsar"
        >
          <ChevronDown size={14} className="rotate-180" />
        </button>
      </div>
      <ul className="divide-y divide-[#f0f0f2]">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => router.push(`/board/${item.boardId}?task=${item.id}`)}
              className="w-full flex items-center gap-2.5 py-2 text-left hover:bg-[#f9f9fb] -mx-2 px-2 rounded-lg transition-colors"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.boardColor }}
              />
              <span className="text-[13px] text-[#1d1d1f] truncate flex-1">{item.title}</span>
              <span className="text-[11px] text-[#8e8e93] truncate max-w-25 hidden sm:inline">
                {item.boardName}
              </span>
              <span className="text-[11px] text-[#c7c7cc] shrink-0">{timeAgo(item.updatedAt)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
