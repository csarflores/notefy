'use client';

import { useState } from 'react';
import { ITask, IUser, TaskPriority, IBoardColumn } from '@/types';
import Avatar from '@/components/ui/Avatar';
import TaskDetailPanel from './TaskDetailPanel';
import { PRIORITY_META } from './PriorityPicker';
import { getBoardColumns, getDoneColumnId } from '@/lib/board-columns';
import { Calendar, Flag, ListChecks, MessageSquare, Paperclip } from 'lucide-react';

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

export default function TaskListView({ tasks, columns: columnsProp, canEdit = true, canComment = true }: { tasks: ITask[]; columns?: IBoardColumn[]; canEdit?: boolean; canComment?: boolean }) {
  const [editingTask, setEditingTask] = useState<ITask | null>(null);
  const columns = getBoardColumns(columnsProp);
  const doneColumnId = getDoneColumnId(columns);
  const columnMeta = new Map(columns.map((c) => [c.id, c]));

  return (
    <>
      <div className="bg-white rounded-xl border border-[#e0e0e0] overflow-hidden">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-[1fr_110px_90px_110px_110px_80px] gap-3 px-4 py-2.5 border-b border-[#e0e0e0] bg-[#fafafa] text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest">
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

            return (
              <li key={task._id.toString()}>
                <button
                  type="button"
                  onClick={() => setEditingTask(task)}
                  className="w-full grid grid-cols-1 sm:grid-cols-[1fr_110px_90px_110px_110px_80px] gap-1.5 sm:gap-3 px-4 py-3 text-left hover:bg-[#f9f9fb] transition-colors items-center"
                >
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
                </button>
              </li>
            );
          })}
        </ul>
      </div>

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
