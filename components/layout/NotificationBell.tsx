'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { INotification } from '@/types';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '@/actions/notification-actions';

// Versión serializada de INotification (lo que devuelve la server action)
type NotificationItem = {
  _id: string;
  type: INotification['type'];
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
};

function formatRelative(date: Date | string): string {
  const d = new Date(date);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    const res = await getUnreadCount();
    if (res.success && res.data !== undefined) setUnread(res.data);
  }, []);

  const loadAll = useCallback(async () => {
    const res = await getNotifications();
    if (res.success && res.data) setItems(res.data as unknown as NotificationItem[]);
    setLoaded(true);
  }, []);

  // Badge al montar + refresco periódico ligero
  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 60_000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleToggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      await loadAll();
      refreshCount();
    }
  };

  const handleOpen = async (n: NotificationItem) => {
    if (!n.read) {
      await markNotificationRead(n._id);
      setItems((prev) => prev.map((i) => (i._id === n._id ? { ...i, read: true } : i)));
      setUnread((c) => Math.max(0, c - 1));
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnread(0);
  };

  const handleDelete = async (e: React.MouseEvent, n: NotificationItem) => {
    e.stopPropagation();
    await deleteNotification(n._id);
    setItems((prev) => prev.filter((i) => i._id !== n._id));
    if (!n.read) setUnread((c) => Math.max(0, c - 1));
  };

  return (
    <div ref={containerRef} className="relative shrink-0 h-8 flex items-center">
      <button
        onClick={handleToggle}
        aria-label="Notificaciones"
        className="relative p-1.5 mx-1 rounded-md text-[#7a7a7a] hover:bg-white/60 hover:text-[#1d1d1f] transition-colors"
      >
        <Bell size={14} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#ff3b30] text-white text-[9px] font-semibold flex items-center justify-center leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-1 top-full mt-1 w-80 bg-white rounded-xl shadow-xl border border-[#e5e5e5] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#f0f0f0]">
            <p className="text-[12px] font-semibold text-[#1d1d1f]">Notificaciones</p>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-[11px] text-[#0066cc] hover:text-[#0055aa] transition-colors"
              >
                <CheckCheck size={12} />
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {!loaded ? (
              <p className="px-4 py-6 text-center text-[12px] text-[#8e8e93]">Cargando…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-[#8e8e93]">
                Sin notificaciones
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n._id.toString()}
                  onClick={() => handleOpen(n)}
                  className={`group w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors ${
                    n.read ? 'hover:bg-[#f9f9fb]' : 'bg-[#f0f6ff]/60 hover:bg-[#f0f6ff]'
                  }`}
                >
                  <span
                    className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                      n.read ? 'bg-transparent' : 'bg-[#0066cc]'
                    }`}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12px] text-[#1d1d1f] leading-snug">
                      {n.message}
                    </span>
                    <span className="block text-[10px] text-[#a0a0a8] mt-0.5">
                      {formatRelative(n.createdAt)}
                    </span>
                  </span>
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => handleDelete(e, n)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#a0a0a8] hover:text-red-500 transition-all shrink-0"
                  >
                    <Trash2 size={11} />
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
