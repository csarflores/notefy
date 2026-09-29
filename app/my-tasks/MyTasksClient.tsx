'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ITask, IBoardColumn, TaskPriority, MemberRole } from '@/types';
import { updateTask } from '@/actions/task-actions';
import { getDoneColumnId, getBoardColumns } from '@/lib/board-columns';
import { useNotification } from '@/components/ui/NotificationContext';
import { PRIORITY_META } from '@/components/kanban/PriorityPicker';
import TaskDetailPanel from '@/components/kanban/TaskDetailPanel';
import Avatar from '@/components/ui/Avatar';
import { differenceInCalendarDays, startOfToday, endOfToday, addDays } from 'date-fns';
import {
  CheckCircle2,
  Search,
  Filter,
  Flag,
  Repeat,
  Inbox,
} from 'lucide-react';

type BucketKey = 'overdue' | 'today' | 'week' | 'later' | 'nodate';

interface BoardInfo {
  _id?: { toString(): string };
  name?: string;
  color?: string;
  icon?: string;
  columns?: IBoardColumn[];
  owner?: { toString(): string };
  memberRoles?: Record<string, MemberRole>;
  projectId?: { _id?: { toString(): string }; name?: string; color?: string } | null;
  toString(): string;
}

function boardOf(task: ITask): BoardInfo {
  return task.boardId as unknown as BoardInfo;
}

function boardIdOf(task: ITask): string {
  const b = boardOf(task);
  return b?._id?.toString() ?? b?.toString();
}

function projectOf(task: ITask): { id: string; name: string } | null {
  const p = boardOf(task)?.projectId;
  if (!p?.name) return null;
  return { id: p._id?.toString() ?? '', name: p.name };
}

function bucketOf(task: ITask): BucketKey {
  if (!task.deliveryDate) return 'nodate';
  const d = new Date(task.deliveryDate);
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const weekEnd = addDays(todayStart, 7);
  if (d < todayStart) return 'overdue';
  if (d < todayEnd) return 'today';
  if (d <= weekEnd) return 'week';
  return 'later';
}

const BUCKETS: { key: BucketKey; label: string; accent: string; text: string }[] = [
  { key: 'overdue', label: 'Vencidas', accent: 'bg-[#e03131]', text: 'text-[#e03131]' },
  { key: 'today', label: 'Hoy', accent: 'bg-[#e8590c]', text: 'text-[#e8590c]' },
  { key: 'week', label: 'Esta semana', accent: 'bg-[#0066cc]', text: 'text-[#0066cc]' },
  { key: 'later', label: 'Más adelante', accent: 'bg-[#8e8e93]', text: 'text-[#7a7a7a]' },
  { key: 'nodate', label: 'Sin fecha', accent: 'bg-[#c7c7cc]', text: 'text-[#a0a0a8]' },
];

export default function MyTasksClient({ initialTasks }: { initialTasks: ITask[] }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { showNotification } = useNotification();
  const [tasks, setTasks] = useState<ITask[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const [query, setQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [boardFilter, setBoardFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Proyectos y tableros presentes en las tareas
  const { projects, boards } = useMemo(() => {
    const p = new Map<string, string>();
    const b = new Map<string, { name: string; color: string }>();
    for (const t of tasks) {
      const proj = projectOf(t);
      if (proj && proj.id) p.set(proj.id, proj.name);
      const bd = boardOf(t);
      if (bd?.name) b.set(boardIdOf(t), { name: bd.name, color: bd.color || '#8e8e93' });
    }
    return { projects: p, boards: b };
  }, [tasks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q)) return false;
      if (projectFilter !== 'all' && projectOf(t)?.id !== projectFilter) return false;
      if (boardFilter !== 'all' && boardIdOf(t) !== boardFilter) return false;
      if (priorityFilter !== 'all' && (t.priority ?? 'none') !== priorityFilter) return false;
      return true;
    });
  }, [tasks, query, projectFilter, boardFilter, priorityFilter]);

  const grouped = useMemo(() => {
    const map = new Map<BucketKey, ITask[]>();
    for (const b of BUCKETS) map.set(b.key, []);
    for (const t of filtered) map.get(bucketOf(t))!.push(t);
    return map;
  }, [filtered]);

  // El panel llama router.refresh() tras cada autosave: sincronizar el estado
  // local cuando lleguen datos nuevos del servidor
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const openTask = useCallback((task: ITask) => setSelectedTask(task), []);

  const handleComplete = useCallback(
    async (task: ITask) => {
      const id = task._id.toString();
      const board = boardOf(task);
      const prev = tasks;
      setTasks((ts) => ts.filter((t) => t._id.toString() !== id));
      setBusyId(id);
      const result = await updateTask(id, { status: getDoneColumnId(board?.columns) });
      setBusyId(null);
      if (result.success) {
        showNotification('Tarea completada', 'success');
        router.refresh();
      } else {
        setTasks(prev);
        showNotification(result.error || 'Error al completar la tarea', 'error');
      }
    },
    [tasks, showNotification, router]
  );

  const hasFilters = query || projectFilter !== 'all' || boardFilter !== 'all' || priorityFilter !== 'all';

  // Rol del usuario en el tablero de la tarea seleccionada (misma lógica que BoardClient)
  const selectedBoard = selectedTask ? boardOf(selectedTask) : null;
  const isSelectedOwner = selectedBoard?.owner?.toString() === session?.user?.id;
  const selectedRole: 'owner' | MemberRole = isSelectedOwner
    ? 'owner'
    : (selectedBoard?.memberRoles?.[session?.user?.email?.toLowerCase() ?? ''] ?? 'editor');
  const canEditSelected = selectedRole === 'owner' || selectedRole === 'editor';
  const canCommentSelected = canEditSelected || selectedRole === 'commenter';

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="bg-white rounded-xl border border-[#e0e0e0] p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a0a0a8] pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en mis tareas..."
            className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[#e5e5ea] text-[12px] text-[#1d1d1f] placeholder-[#a0a0a8] bg-white outline-none focus:border-[#0066cc]"
            aria-label="Buscar tareas"
          />
        </div>

        {projects.size > 0 && (
          <div className="relative flex items-center">
            <Filter size={11} className="absolute left-2 text-[#a0a0a8] pointer-events-none" />
            <select
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                setBoardFilter('all');
              }}
              className="pl-6 pr-2 py-1.5 rounded-lg border border-[#e5e5ea] text-[12px] text-[#3a3a3c] bg-white outline-none focus:border-[#0066cc] max-w-45"
              aria-label="Filtrar por proyecto"
            >
              <option value="all">Todos los proyectos</option>
              {[...projects.entries()].map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
        )}

        <select
          value={boardFilter}
          onChange={(e) => setBoardFilter(e.target.value)}
          className="px-2 py-1.5 rounded-lg border border-[#e5e5ea] text-[12px] text-[#3a3a3c] bg-white outline-none focus:border-[#0066cc] max-w-45"
          aria-label="Filtrar por tablero"
        >
          <option value="all">Todos los tableros</option>
          {[...boards.entries()].map(([id, b]) => (
            <option key={id} value={id}>{b.name}</option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-2 py-1.5 rounded-lg border border-[#e5e5ea] text-[12px] text-[#3a3a3c] bg-white outline-none focus:border-[#0066cc]"
          aria-label="Filtrar por prioridad"
        >
          <option value="all">Todas las prioridades</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Baja</option>
          <option value="none">Sin prioridad</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => {
              setQuery('');
              setProjectFilter('all');
              setBoardFilter('all');
              setPriorityFilter('all');
            }}
            className="text-[11px] text-[#0066cc] hover:underline px-1"
          >
            Limpiar
          </button>
        )}

        <span className="ml-auto text-[11px] text-[#a0a0a8]">
          {filtered.length} tarea{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Lista agrupada */}
      <div className="bg-white rounded-xl border border-[#e0e0e0] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center px-4">
            <Inbox size={26} className="text-[#d1d1d6] mb-3" />
            <p className="text-[14px] font-medium text-[#3a3a3c]">
              {hasFilters ? 'Ninguna tarea coincide con los filtros' : 'No tienes tareas asignadas'}
            </p>
            <p className="text-[12px] text-[#a0a0a8] mt-1">
              {hasFilters
                ? 'Prueba ajustando o limpiando los filtros.'
                : 'Cuando te asignen tareas en un tablero aparecerán aquí.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#f0f0f2]">
            {BUCKETS.map((bucket) => {
              const list = grouped.get(bucket.key) ?? [];
              if (list.length === 0) return null;
              return (
                <div key={bucket.key} className="py-2">
                  <div className="flex items-center gap-1.5 px-4 pb-1.5 pt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${bucket.accent}`} />
                    <span className={`text-[11px] font-semibold uppercase tracking-wide ${bucket.text}`}>
                      {bucket.label}
                    </span>
                    <span className="text-[10px] text-[#c7c7cc]">{list.length}</span>
                  </div>
                  <ul>
                    {list.map((task) => {
                      const board = boardOf(task);
                      const proj = projectOf(task);
                      const id = task._id.toString();
                      const priority = task.priority as TaskPriority | undefined;
                      return (
                        <li key={id}>
                          <div className="group flex items-center gap-2.5 px-4 py-2 hover:bg-[#f9f9fb] transition-colors">
                            {/* Completar */}
                            <button
                              onClick={() => handleComplete(task)}
                              disabled={busyId === id}
                              title="Marcar como completada"
                              aria-label={`Completar "${task.title}"`}
                              className="shrink-0 w-[18px] h-[18px] rounded-full border-[1.5px] border-[#c7c7cc] hover:border-[#34c759] hover:bg-[#34c759]/10 flex items-center justify-center transition-all disabled:opacity-40"
                            >
                              <CheckCircle2
                                size={11}
                                className="text-transparent group-hover:text-[#34c759] transition-colors"
                              />
                            </button>

                            {/* Título + contexto */}
                            <button onClick={() => openTask(task)} className="flex-1 min-w-0 text-left">
                              <span className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[13px] text-[#1d1d1f] truncate">{task.title}</span>
                                {task.recurrence && (
                                  <Repeat size={11} className="text-[#8e8e93] shrink-0" />
                                )}
                              </span>
                              <span className="flex items-center gap-2 mt-0.5 text-[11px] text-[#8e8e93]">
                                {board?.name && (
                                  <span className="inline-flex items-center gap-1 min-w-0">
                                    <span
                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ backgroundColor: board.color || '#8e8e93' }}
                                    />
                                    <span className="truncate max-w-35">
                                      {proj ? `${proj.name} / ` : ''}{board.name}
                                    </span>
                                  </span>
                                )}
                                {priority && (
                                  <span className="inline-flex items-center gap-0.5">
                                    <Flag size={10} color={PRIORITY_META[priority].color} fill={PRIORITY_META[priority].color} />
                                    {PRIORITY_META[priority].label}
                                  </span>
                                )}
                              </span>
                            </button>

                            {/* Fecha */}
                            {task.deliveryDate && (
                              <span
                                className={`shrink-0 text-[11px] tabular-nums ${
                                  differenceInCalendarDays(new Date(task.deliveryDate), new Date()) < 0
                                    ? 'text-[#e03131] font-medium'
                                    : 'text-[#8e8e93]'
                                }`}
                              >
                                {new Date(task.deliveryDate).toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </span>
                            )}

                            {/* Estado */}
                            <span className="hidden sm:inline-flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#f5f5f7] text-[#3a3a3c]">
                              {getBoardColumns(board?.columns).find((c) => c.id === task.status)?.title ?? task.status}
                            </span>

                            {/* Asignados */}
                            <span className="hidden sm:flex shrink-0 -space-x-1.5">
                              {(task.assignedTo as unknown as { _id: { toString(): string }; name: string; image?: string }[])
                                .slice(0, 2)
                                .map((u) => (
                                  <Avatar key={u._id.toString()} src={u.image} name={u.name} size="sm" />
                                ))}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Panel de detalle de tarea (el mismo que en el tablero/proyecto) */}
      {selectedTask && (
        <TaskDetailPanel
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          task={selectedTask}
          canEdit={canEditSelected}
          canComment={canCommentSelected}
        />
      )}
    </div>
  );
}
