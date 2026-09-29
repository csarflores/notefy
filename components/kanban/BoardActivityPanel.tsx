'use client';

import { useEffect, useState } from 'react';
import Drawer from '@/components/ui/Drawer';
import Avatar from '@/components/ui/Avatar';
import { getBoardActivity } from '@/actions/activity-actions';
import { IActivity } from '@/types';
import { X, History, ChevronDown, Loader2 } from 'lucide-react';

const ACTION_LABELS: Record<IActivity['action'], string> = {
  created: 'creó la tarea',
  updated: 'actualizó la tarea',
  moved: 'movió la tarea',
  completed: 'completó la tarea',
  deleted: 'eliminó la tarea',
  commented: 'comentó en',
  assigned: 'cambió los asignados de',
};

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `hace ${diffDays}d`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function groupByDay(items: IActivity[]): [string, IActivity[]][] {
  const groups = new Map<string, IActivity[]>();
  for (const item of items) {
    const d = new Date(item.createdAt);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = 'Hoy';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Ayer';
    else label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(item);
  }
  return [...groups.entries()];
}

export default function BoardActivityPanel({
  isOpen,
  onClose,
  boardId,
}: {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
}) {
  const [items, setItems] = useState<IActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const load = async (before?: string) => {
    if (before) setLoadingMore(true);
    else setLoading(true);
    const res = await getBoardActivity(boardId, 30, before);
    if (res.success && res.data) {
      setItems((prev) => (before ? [...prev, ...res.data!] : res.data!));
      setHasMore(res.data.length === 30);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    if (isOpen) {
      setItems([]);
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, boardId]);

  const groups = groupByDay(items);
  const oldest = items[items.length - 1]?.createdAt;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} className="sm:w-[420px]">
      <div className="flex items-center gap-2 px-5 h-12 border-b border-[#f0f0f0] shrink-0">
        <History size={14} className="text-[#8e8e93]" />
        <h2 className="text-[14px] font-semibold text-[#1d1d1f]">Actividad del tablero</h2>
        <button
          onClick={onClose}
          className="ml-auto text-[#aaaaaa] hover:text-[#1d1d1f] transition-colors"
          aria-label="Cerrar actividad"
        >
          <X size={17} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={18} className="animate-spin text-[#a0a0a8]" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <History size={22} className="text-[#d1d1d6] mb-2" />
            <p className="text-[13px] text-[#7a7a7a]">Sin actividad registrada aún</p>
            <p className="text-[11.5px] text-[#a0a0a8] mt-1">
              Las acciones sobre las tareas aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map(([label, group]) => (
              <div key={label}>
                <p className="text-[10px] font-semibold text-[#a0a0a8] uppercase tracking-widest mb-2">
                  {label}
                </p>
                <ul className="space-y-3">
                  {group.map((item) => (
                    <li key={item._id.toString()} className="flex items-start gap-2.5">
                      <Avatar src={item.actorImage} name={item.actorName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] text-[#3a3a3c] leading-snug">
                          <span className="font-semibold">{item.actorName}</span>{' '}
                          {ACTION_LABELS[item.action]}
                          {item.taskTitle ? (
                            <>
                              {' '}
                              <span className="font-medium">&quot;{item.taskTitle}&quot;</span>
                            </>
                          ) : null}
                          {item.detail ? ` → ${item.detail}` : ''}
                        </p>
                        <p className="text-[10.5px] text-[#c7c7cc] mt-0.5">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={() => load(oldest ? String(oldest) : undefined)}
                disabled={loadingMore}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-medium text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors"
              >
                {loadingMore ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <>
                    <ChevronDown size={13} />
                    Cargar más
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
