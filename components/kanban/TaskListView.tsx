'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ITask, IUser, TaskPriority, IBoardColumn, ITag } from '@/types';
import Avatar from '@/components/ui/Avatar';
import TaskDetailPanel from './TaskDetailPanel';
import { PRIORITY_META } from './PriorityPicker';
import { getBoardColumns, getDoneColumnId } from '@/lib/board-columns';
import {
  bulkUpdateTaskStatus,
  bulkAssignTasks,
  bulkAddTagToTasks,
  deleteMultipleTasks,
} from '@/actions/task-actions';
import { restoreItem } from '@/actions/trash-actions';
import { useNotification } from '@/components/ui/NotificationContext';
import {
  Calendar,
  Flag,
  ListChecks,
  MessageSquare,
  Paperclip,
  MoveRight,
  UserPlus,
  Tags,
  Trash2,
  X,
  Loader2,
  Check,
} from 'lucide-react';

function formatDate(date?: Date | string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

function dateTone(date: Date | string, isDone: boolean): string {
  if (isDone) return 'text-[#7a7a7a]';
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d.getTime() < today.getTime()) return 'text-[#e03131] font-medium';
  if (d.getTime() === today.getTime()) return 'text-[#e8590c] font-medium';
  return 'text-[#7a7a7a]';
}

const TAG_COLORS = ['#0066cc', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5856d6', '#ff2d55', '#5ac8fa'];

interface TaskListViewProps {
  tasks: ITask[];
  columns?: IBoardColumn[];
  canEdit?: boolean;
  canComment?: boolean;
  boardUsers?: IUser[];
  boardTags?: ITag[];
}

export default function TaskListView({ tasks, columns: columnsProp, canEdit = true, canComment = true, boardUsers = [], boardTags = [] }: TaskListViewProps) {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [editingTask, setEditingTask] = useState<ITask | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [assignIds, setAssignIds] = useState<string[]>([]);
  const [tagText, setTagText] = useState('');
  const [tagColor, setTagColor] = useState(TAG_COLORS[0]);

  const columns = getBoardColumns(columnsProp);
  const doneColumnId = getDoneColumnId(columns);
  const columnMeta = new Map(columns.map((c) => [c.id, c]));

  const allSelected = tasks.length > 0 && selected.size === tasks.length;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(tasks.map((t) => t._id.toString())));
  };

  const clearSelection = () => {
    setSelected(new Set());
    setAssignOpen(false);
    setTagOpen(false);
  };

  const selectedIds = useMemo(() => [...selected], [selected]);

  const runBulk = async (fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) => {
    setBusy(true);
    const result = await fn();
    setBusy(false);
    if (result.success) {
      showNotification(okMsg, 'success');
      clearSelection();
      router.refresh();
    } else {
      showNotification(result.error || 'Error en la acción en lote', 'error');
    }
  };

  const handleBulkDelete = () => {
    const ids = selectedIds;
    setBusy(true);
    deleteMultipleTasks(ids).then((result) => {
      setBusy(false);
      if (result.success) {
        clearSelection();
        router.refresh();
        showNotification(`${ids.length} tarea${ids.length !== 1 ? 's' : ''} eliminada${ids.length !== 1 ? 's' : ''}`, 'success', {
          action: {
            label: 'Deshacer',
            onClick: async () => {
              for (const id of ids) await restoreItem('task', id);
              router.refresh();
            },
          },
        });
      } else {
        showNotification(result.error || 'Error al eliminar las tareas', 'error');
      }
    });
  };

  const applyAssign = () =>
    runBulk(() => bulkAssignTasks(selectedIds, assignIds), 'Responsables actualizados');

  const applyTag = (tag: ITag) =>
    runBulk(() => bulkAddTagToTasks(selectedIds, tag), 'Etiqueta aplicada');

  return (
    <>
      <div className="bg-white rounded-xl border border-[#e0e0e0] overflow-hidden">
        {/* Header */}
        <div className={`hidden sm:grid ${canEdit ? 'grid-cols-[28px_1fr_110px_90px_110px_110px_80px]' : 'grid-cols-[1fr_110px_90px_110px_110px_80px]'} gap-3 px-4 py-2.5 border-b border-[#e0e0e0] bg-[#fafafa] text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest items-center`}>
          {canEdit && (
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              aria-label="Seleccionar todas las tareas"
              className="w-3.5 h-3.5 accent-[#0066cc] cursor-pointer"
            />
          )}
          <span>Tarea</span>
          <span>Estado</span>
          <span>Prioridad</span>
          <span>Fecha límite</span>
          <span>Entrega</span>
          <span className="text-right">Asignados</span>
        </div>

        <ul className="divide-y divide-[#f0f0f2]">
          {tasks.map((task) => {
            const col = columnMeta.get(task.status) || columns[0];
            const priority = task.priority as TaskPriority | undefined;
            const checklistDone = task.checklist?.filter((c) => c.done).length ?? 0;
            const checklistTotal = task.checklist?.length ?? 0;
            const metaCount =
              (task.comments?.length ?? 0) + (task.attachments?.length ?? 0) + checklistTotal;
            const assignees = task.assignedTo as unknown as IUser[];
            const id = task._id.toString();
            const isSelected = selected.has(id);

            return (
              <li key={id} className={isSelected ? 'bg-[#f0f6ff]' : ''}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setEditingTask(task)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setEditingTask(task); }}
                  className={`w-full grid grid-cols-1 ${canEdit ? 'sm:grid-cols-[28px_1fr_110px_90px_110px_110px_80px]' : 'sm:grid-cols-[1fr_110px_90px_110px_110px_80px]'} gap-1.5 sm:gap-3 px-4 py-3 items-center hover:bg-[#f9f9fb] transition-colors cursor-pointer text-left`}
                >
                  {canEdit && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Seleccionar "${task.title}"`}
                      className="hidden sm:block w-3.5 h-3.5 accent-[#0066cc] cursor-pointer"
                    />
                  )}
                  {/* Título + meta */}
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-[#1d1d1f] truncate">
                      {task.title}
                    </span>
                    {metaCount > 0 && (
                      <span className="mt-0.5 flex items-center gap-2.5 text-[11px] text-[#8e8e93]">
                        {checklistTotal > 0 && (
                          <span className="flex items-center gap-0.5">
                            <ListChecks size={11} />
                            {checklistDone}/{checklistTotal}
                          </span>
                        )}
                        {(task.comments?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5">
                            <MessageSquare size={10} />
                            {task.comments!.length}
                          </span>
                        )}
                        {(task.attachments?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Paperclip size={10} />
                            {task.attachments!.length}
                          </span>
                        )}
                      </span>
                    )}
                  </span>

                  {/* Estado */}
                  <span className="inline-flex w-fit items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f5f5f7] text-[#3a3a3c]">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.color }} />
                    {col.title}
                  </span>

                  {/* Prioridad */}
                  <span className="inline-flex items-center gap-1 text-[12px] text-[#3a3a3c]">
                    {priority ? (
                      <>
                        <Flag size={11} color={PRIORITY_META[priority].color} fill={PRIORITY_META[priority].color} />
                        {PRIORITY_META[priority].label}
                      </>
                    ) : (
                      <span className="text-[#c7c7cc]">—</span>
                    )}
                  </span>

                  {/* Fechas */}
                  <span className={`inline-flex items-center gap-1 text-[12px] ${task.dueDate ? dateTone(task.dueDate, task.status === doneColumnId) : 'text-[#c7c7cc]'}`}>
                    {task.dueDate && <Calendar size={11} />}
                    {formatDate(task.dueDate)}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[12px] ${task.deliveryDate ? dateTone(task.deliveryDate, task.status === doneColumnId) : 'text-[#c7c7cc]'}`}>
                    {formatDate(task.deliveryDate)}
                  </span>

                  {/* Asignados */}
                  <span className="flex sm:justify-end -space-x-1.5">
                    {assignees.slice(0, 3).map((u) => (
                      <Avatar key={u._id.toString()} src={u.image} name={u.name} size="sm" />
                    ))}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Barra de acciones en lote */}
      {selected.size > 0 && canEdit && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-1.5 bg-white/95 backdrop-blur-xl border border-[#e5e5ea] shadow-[0_12px_40px_rgba(0,0,0,0.16)] rounded-full pl-4 pr-2 py-2 dark:bg-[#2c2c2e]/95 dark:border-[#48484a]">
          {busy ? (
            <Loader2 size={14} className="animate-spin text-[#0066cc]" />
          ) : (
            <span className="text-[12px] font-semibold text-[#1d1d1f]">
              {selected.size} seleccionada{selected.size !== 1 ? 's' : ''}
            </span>
          )}

          <div className="w-px h-5 bg-[#e5e5ea] mx-1" />

          {/* Mover a columna */}
          <div className="relative flex items-center">
            <MoveRight size={13} className="absolute left-2.5 text-[#7a7a7a] pointer-events-none" />
            <select
              disabled={busy}
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                runBulk(
                  () => bulkUpdateTaskStatus(selectedIds, e.target.value),
                  `Tareas movidas a "${columns.find((c) => c.id === e.target.value)?.title ?? e.target.value}"`
                );
              }}
              className="pl-7 pr-2 py-1.5 rounded-full text-[12px] font-medium text-[#3a3a3c] bg-[#f5f5f7] hover:bg-[#ebebed] border-none outline-none cursor-pointer appearance-none transition-colors"
              aria-label="Mover a columna"
            >
              <option value="">Mover a…</option>
              {columns.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          {/* Asignar */}
          <div className="relative">
            <button
              disabled={busy}
              onClick={() => { setAssignOpen((v) => !v); setTagOpen(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium text-[#3a3a3c] bg-[#f5f5f7] hover:bg-[#ebebed] transition-colors"
            >
              <UserPlus size={13} />
              Asignar
            </button>
            {assignOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAssignOpen(false)} />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-white rounded-xl shadow-xl border border-[#e5e5ea] z-50 p-2">
                  <p className="text-[10px] font-semibold text-[#a0a0a8] uppercase tracking-wide px-2 py-1">
                    Responsables
                  </p>
                  <div className="max-h-48 overflow-y-auto">
                    {boardUsers.map((u) => {
                      const uid = u._id.toString();
                      const checked = assignIds.includes(uid);
                      return (
                        <label key={uid} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#f5f5f7] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setAssignIds((prev) =>
                                checked ? prev.filter((x) => x !== uid) : [...prev, uid]
                              )
                            }
                            className="w-3.5 h-3.5 accent-[#0066cc]"
                          />
                          <Avatar src={u.image} name={u.name} size="sm" />
                          <span className="text-[12px] text-[#1d1d1f] truncate">{u.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => { setAssignOpen(false); applyAssign(); }}
                    disabled={busy}
                    className="mt-1.5 w-full py-1.5 rounded-lg bg-[#0066cc] hover:bg-[#0055aa] text-white text-[12px] font-medium transition-colors"
                  >
                    Aplicar a {selected.size} tarea{selected.size !== 1 ? 's' : ''}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Etiquetar */}
          <div className="relative">
            <button
              disabled={busy}
              onClick={() => { setTagOpen((v) => !v); setAssignOpen(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium text-[#3a3a3c] bg-[#f5f5f7] hover:bg-[#ebebed] transition-colors"
            >
              <Tags size={13} />
              Etiquetar
            </button>
            {tagOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setTagOpen(false)} />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-60 bg-white rounded-xl shadow-xl border border-[#e5e5ea] z-50 p-2">
                  <p className="text-[10px] font-semibold text-[#a0a0a8] uppercase tracking-wide px-2 py-1">
                    Etiquetas del tablero
                  </p>
                  {boardTags.length > 0 && (
                    <div className="max-h-32 overflow-y-auto mb-1">
                      {boardTags.map((t) => (
                        <button
                          key={t.text}
                          onClick={() => { setTagOpen(false); applyTag(t); }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#f5f5f7] text-left"
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                          <span className="text-[12px] text-[#1d1d1f] truncate">{t.text}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-[#f0f0f2] pt-2">
                    <p className="text-[10px] font-semibold text-[#a0a0a8] uppercase tracking-wide px-2 pb-1">
                      Nueva etiqueta
                    </p>
                    <input
                      value={tagText}
                      onChange={(e) => setTagText(e.target.value)}
                      placeholder="Nombre"
                      maxLength={30}
                      className="w-full px-2 py-1.5 mb-1.5 rounded-lg border border-[#e5e5ea] text-[12px] outline-none focus:border-[#0066cc]"
                    />
                    <div className="flex items-center gap-1 px-1 pb-1.5">
                      {TAG_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setTagColor(c)}
                          className="w-5 h-5 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                          style={{ backgroundColor: c }}
                          aria-label={`Color ${c}`}
                        >
                          {tagColor === c && <Check size={11} className="text-white" />}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        if (!tagText.trim()) return;
                        setTagOpen(false);
                        applyTag({ text: tagText.trim(), color: tagColor });
                        setTagText('');
                      }}
                      disabled={busy || !tagText.trim()}
                      className="w-full py-1.5 rounded-lg bg-[#0066cc] hover:bg-[#0055aa] disabled:opacity-40 text-white text-[12px] font-medium transition-colors"
                    >
                      Crear y aplicar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Eliminar */}
          <button
            disabled={busy}
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium text-[#ff3b30] bg-[#ffeceb] hover:bg-[#ffd6d2] transition-colors"
          >
            <Trash2 size={13} />
            Eliminar
          </button>

          <button
            onClick={clearSelection}
            className="p-1.5 rounded-full text-[#a0a0a8] hover:bg-[#f0f0f2] hover:text-[#1d1d1f] transition-colors"
            aria-label="Cancelar selección"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {editingTask && (
        <TaskDetailPanel
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          task={editingTask}
          canEdit={canEdit}
          canComment={canComment}
        />
      )}
    </>
  );
}
