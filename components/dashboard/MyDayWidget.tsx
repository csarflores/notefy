'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ITask, IBoardColumn } from '@/types';
import { getMyDayTasks } from '@/actions/dashboard-actions';
import { updateTask } from '@/actions/task-actions';
import { getDoneColumnId } from '@/lib/board-columns';
import { useNotification } from '@/components/ui/NotificationContext';
import { differenceInCalendarDays, format, addDays, nextMonday, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Sun,
  ChevronDown,
  CalendarDays,
  CalendarClock,
  Check,
  Loader2,
  Filter,
} from 'lucide-react';

type SectionKey = 'overdue' | 'today' | 'week';
type MyDayData = Record<SectionKey, ITask[]>;

interface BoardInfo {
  _id?: { toString(): string };
  name?: string;
  color?: string;
  columns?: IBoardColumn[];
  toString(): string;
}

function boardOf(task: ITask): BoardInfo {
  return task.boardId as unknown as BoardInfo;
}

function boardIdOf(task: ITask): string {
  const b = boardOf(task);
  return b?._id?.toString() ?? b?.toString();
}

// Etiqueta relativa de la fecha de entrega (ayer, hoy, mañana, EEE d, d MMM)
function dueLabel(deliveryDate: string | Date): string {
  const d = new Date(deliveryDate);
  const diff = differenceInCalendarDays(d, new Date());
  if (diff <= -30) return format(d, 'd MMM', { locale: es });
  if (diff <= -7) return `hace ${Math.round(-diff / 7)} sem`;
  if (diff <= -2) return `hace ${-diff} días`;
  if (diff === -1) return 'ayer';
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'mañana';
  if (diff < 7) return format(d, 'EEE d', { locale: es });
  return format(d, 'd MMM', { locale: es });
}

const SECTIONS: { key: SectionKey; label: string; accent: string; text: string }[] = [
  { key: 'overdue', label: 'Vencidas', accent: 'bg-[#e03131]', text: 'text-[#e03131]' },
  { key: 'today', label: 'Hoy', accent: 'bg-[#e8590c]', text: 'text-[#e8590c]' },
  { key: 'week', label: 'Esta semana', accent: 'bg-[#8e8e93]', text: 'text-[#7a7a7a]' },
];

const COLLAPSED_KEY = 'myday:collapsed';

function TaskRow({
  task,
  onOpen,
  onComplete,
  onPostpone,
  busy,
}: {
  task: ITask;
  onOpen: () => void;
  onComplete: () => void;
  onPostpone: (date: Date) => void;
  busy: boolean;
}) {
  const board = boardOf(task);
  const [postponeOpen, setPostponeOpen] = useState(false);

  const postponeOptions = [
    { label: 'Mañana', date: addDays(startOfToday(), 1) },
    { label: 'En 3 días', date: addDays(startOfToday(), 3) },
    { label: 'Próxima semana', date: nextMonday(new Date()) },
  ];

  return (
    <div className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#f8f8fa] transition-colors">
      {/* Completar */}
      <button
        onClick={onComplete}
        disabled={busy}
        title="Marcar como completada"
        className="shrink-0 w-[18px] h-[18px] rounded-full border-[1.5px] border-[#c7c7cc] hover:border-[#34c759] hover:bg-[#34c759]/10 flex items-center justify-center transition-all disabled:opacity-40"
      >
        {busy ? (
          <Loader2 size={11} className="animate-spin text-[#a0a0a8]" />
        ) : (
          <Check size={11} className="text-transparent group-hover:text-[#34c759] transition-colors" />
        )}
      </button>

      {/* Título + tablero */}
      <button onClick={onOpen} className="flex-1 min-w-0 flex items-center gap-2 text-left">
        <span className="text-[13px] text-[#1d1d1f] truncate">{task.title}</span>
        {board?.name && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-[#8e8e93] shrink-0">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: board.color || '#8e8e93' }}
            />
            <span className="max-w-[110px] truncate">{board.name}</span>
          </span>
        )}
      </button>

      {/* Fecha relativa */}
      {task.deliveryDate && (
        <span className="shrink-0 text-[11px] text-[#8e8e93] tabular-nums w-[86px] text-right">
          {dueLabel(task.deliveryDate)}
        </span>
      )}

      {/* Posponer */}
      <div className="relative shrink-0">
        <button
          onClick={() => setPostponeOpen((v) => !v)}
          disabled={busy}
          title="Posponer entrega"
          className="p-1 rounded-md text-[#c7c7cc] opacity-0 group-hover:opacity-100 hover:bg-[#ececee] hover:text-[#1d1d1f] transition-all disabled:opacity-40"
        >
          <CalendarClock size={13} />
        </button>
        {postponeOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setPostponeOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-[#e5e5e5] overflow-hidden z-50">
              <div className="p-1">
                {postponeOptions.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => {
                      setPostponeOpen(false);
                      onPostpone(opt.date);
                    }}
                    className="w-full px-3 py-1.5 text-left text-[12px] text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-lg transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MyDayWidget({ userId }: { userId: string }) {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [data, setData] = useState<MyDayData | null>(null);
  const [collapsed, setCollapsed] = useState<boolean | null>(null);
  const [boardFilter, setBoardFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await getMyDayTasks();
    if (result.success && result.data) setData(result.data);
  }, []);

  useEffect(() => {
    // Colapsado por defecto hasta que el usuario lo expanda
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) !== '0');
    void load();
  }, [load, userId]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  };

  // Tableros presentes en las tareas (para el filtro)
  const boards = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    if (!data) return map;
    for (const t of [...data.overdue, ...data.today, ...data.week]) {
      const id = boardIdOf(t);
      const b = boardOf(t);
      if (b?.name) map.set(id, { name: b.name, color: b.color || '#8e8e93' });
    }
    return map;
  }, [data]);

  const filterTasks = useCallback(
    (tasks: ITask[]) =>
      boardFilter === 'all' ? tasks : tasks.filter((t) => boardIdOf(t) === boardFilter),
    [boardFilter]
  );

  const openTask = (task: ITask) => {
    router.push(`/board/${boardIdOf(task)}?task=${task._id.toString()}`);
  };

  const handleComplete = async (task: ITask) => {
    const board = boardOf(task);
    const id = task._id.toString();
    setBusyId(id);
    const result = await updateTask(id, { status: getDoneColumnId(board?.columns) });
    setBusyId(null);
    if (result.success) {
      setData((prev) =>
        prev
          ? {
              overdue: prev.overdue.filter((t) => t._id.toString() !== id),
              today: prev.today.filter((t) => t._id.toString() !== id),
              week: prev.week.filter((t) => t._id.toString() !== id),
            }
          : prev
      );
      showNotification('Tarea completada', 'success');
      router.refresh();
    } else {
      showNotification(result.error || 'Error al completar la tarea', 'error');
    }
  };

  const handlePostpone = async (task: ITask, date: Date) => {
    const id = task._id.toString();
    setBusyId(id);
    const result = await updateTask(id, { deliveryDate: date.toISOString() });
    setBusyId(null);
    if (result.success) {
      showNotification('Fecha de entrega actualizada', 'success');
      void load();
      router.refresh();
    } else {
      showNotification(result.error || 'Error al posponer la tarea', 'error');
    }
  };

  if (!data || (data.overdue.length === 0 && data.today.length === 0 && data.week.length === 0)) {
    return null;
  }

  const counts = {
    overdue: data.overdue.length,
    today: data.today.length,
    week: data.week.length,
  };

  // Barra resumen colapsada
  if (collapsed) {
    return (
      <button
        onClick={toggleCollapsed}
        className="w-full bg-white rounded-xl border border-[#e0e0e0] px-4 py-2.5 mb-4 flex items-center gap-2 hover:border-[#d0d0d5] transition-colors text-left"
      >
        <Sun size={14} className="text-[#ff9500] shrink-0" />
        <span className="text-[13px] font-semibold text-[#1d1d1f]">Mi día</span>
        <span className="text-[12px] text-[#8e8e93] truncate">
          {counts.overdue > 0 && (
            <span className="text-[#e03131] font-medium">{counts.overdue} vencida{counts.overdue !== 1 ? 's' : ''}</span>
          )}
          {counts.overdue > 0 && (counts.today > 0 || counts.week > 0) && ' · '}
          {counts.today > 0 && <>{counts.today} para hoy</>}
          {counts.today > 0 && counts.week > 0 && ' · '}
          {counts.week > 0 && <>{counts.week} esta semana</>}
        </span>
        <ChevronDown size={14} className="ml-auto text-[#a0a0a8] shrink-0" />
      </button>
    );
  }

  const visibleSections = SECTIONS.filter((s) => filterTasks(data[s.key]).length > 0);

  return (
    <div className="bg-white rounded-xl border border-[#e0e0e0] mb-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#f0f0f2]">
        <Sun size={14} className="text-[#ff9500] shrink-0" />
        <h2 className="text-[13px] font-semibold text-[#1d1d1f] tracking-[-0.12px]">Mi día</h2>

        {/* Contadores */}
        <div className="flex items-center gap-1.5 ml-1">
          {counts.overdue > 0 && (
            <span className="text-[10px] font-semibold text-[#e03131] bg-red-50 px-1.5 py-0.5 rounded-md">
              {counts.overdue} vencida{counts.overdue !== 1 ? 's' : ''}
            </span>
          )}
          {counts.today > 0 && (
            <span className="text-[10px] font-semibold text-[#e8590c] bg-orange-50 px-1.5 py-0.5 rounded-md">
              {counts.today} hoy
            </span>
          )}
          {counts.week > 0 && (
            <span className="text-[10px] font-semibold text-[#7a7a7a] bg-[#f5f5f7] px-1.5 py-0.5 rounded-md">
              {counts.week} esta semana
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Filtro por tablero */}
          {boards.size > 1 && (
            <div className="relative flex items-center">
              <Filter size={11} className="absolute left-2 text-[#a0a0a8] pointer-events-none" />
              <select
                value={boardFilter}
                onChange={(e) => setBoardFilter(e.target.value)}
                className="pl-6 pr-2 py-1 rounded-lg border border-[#e5e5ea] text-[11px] text-[#3a3a3c] bg-white outline-none focus:border-[#0066cc] max-w-[160px]"
                aria-label="Filtrar por tablero"
              >
                <option value="all">Todos los tableros</option>
                {[...boards.entries()].map(([id, b]) => (
                  <option key={id} value={id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Link
            href="/calendar"
            className="hidden sm:flex items-center gap-1 text-[11px] text-[#7a7a7a] hover:text-[#0066cc] px-2 py-1 rounded-lg hover:bg-[#f5f5f7] transition-colors"
          >
            <CalendarDays size={11} />
            Ver calendario
          </Link>

          <button
            onClick={toggleCollapsed}
            className="p-1 rounded-lg text-[#a0a0a8] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors"
            title="Colapsar"
          >
            <ChevronDown size={14} className="rotate-180" />
          </button>
        </div>
      </div>

      {/* Secciones */}
      <div className="px-2 py-2 divide-y divide-[#f5f5f7]">
        {visibleSections.map((section) => {
          const tasks = filterTasks(data[section.key]);
          return (
            <div key={section.key} className="py-1.5 first:pt-1 last:pb-1">
              <div className="flex items-center gap-1.5 px-2.5 pb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${section.accent}`} />
                <span className={`text-[11px] font-semibold uppercase tracking-wide ${section.text}`}>
                  {section.label}
                </span>
                <span className="text-[10px] text-[#c7c7cc]">{tasks.length}</span>
              </div>
              <div>
                {tasks.map((task) => (
                  <TaskRow
                    key={task._id.toString()}
                    task={task}
                    onOpen={() => openTask(task)}
                    onComplete={() => handleComplete(task)}
                    onPostpone={(date) => handlePostpone(task, date)}
                    busy={busyId === task._id.toString()}
                  />
                ))}
              </div>
            </div>
          );
        })}
        {visibleSections.length === 0 && (
          <p className="text-[12px] text-[#a0a0a8] text-center py-4">
            No hay tareas en este tablero
          </p>
        )}
      </div>
    </div>
  );
}
