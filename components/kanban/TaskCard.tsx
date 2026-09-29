'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ITask, IUser } from '@/types';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import TaskDetailPanel from './TaskDetailPanel';
import { PriorityFlag } from './PriorityPicker';
import SidebarContextMenu from '@/components/layout/SidebarContextMenu';
import { MoreVertical, Edit2, Trash2, Check, Calendar, Clock, MessageSquare, Paperclip, ListChecks } from 'lucide-react';
import { deleteTask } from '@/actions/task-actions';
import { restoreItem } from '@/actions/trash-actions';
import { useNotification } from '@/components/ui/NotificationContext';

function getDateTone(dateStr: string | Date, isDone: boolean): 'overdue' | 'today' | 'normal' {
  if (isDone) return 'normal';
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() < today.getTime()) return 'overdue';
  if (d.getTime() === today.getTime()) return 'today';
  return 'normal';
}

const DATE_TONE_CLASSES = {
  overdue: 'text-[#e03131] font-medium',
  today: 'text-[#e8590c] font-medium',
  normal: 'text-[#7a7a7a]',
};

interface TaskCardProps {
  task: ITask;
  canDelete?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (taskId: string) => void;
  isDone?: boolean;
  canEdit?: boolean;
  canComment?: boolean;
  compact?: boolean;
}

export default function TaskCard({ task, canDelete = false, selectionMode = false, isSelected = false, onToggleSelection, isDone, canEdit = true, canComment = true, compact = false }: TaskCardProps) {
  const taskDone = isDone ?? task.status === 'done';
  const router = useRouter();
  const { showNotification } = useNotification();
  const assignedUsers = task.assignedTo as unknown as IUser[];
  const [showMenu, setShowMenu] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isDraggingRef = useRef(false);
  const mouseDownTimeRef = useRef(0);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteTask(task._id.toString());
      if (result.success) {
        setShowDeleteDialog(false);
        const taskId = task._id.toString();
        showNotification('Tarea eliminada', 'success', {
          action: {
            label: 'Deshacer',
            onClick: async () => {
              await restoreItem('task', taskId);
              router.refresh();
            },
          },
        });
        router.refresh();
      } else {
        showNotification(result.error || 'Error al eliminar la tarea', 'error');
      }
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMouseDown = () => {
    isDraggingRef.current = false;
    mouseDownTimeRef.current = Date.now();
  };

  const handleMouseMove = () => {
    const timeSinceMouseDown = Date.now() - mouseDownTimeRef.current;
    if (timeSinceMouseDown > 150) {
      isDraggingRef.current = true;
    }
  };

  const handleClick = () => {
    const clickDuration = Date.now() - mouseDownTimeRef.current;
    if (!isDraggingRef.current && clickDuration < 200) {
      if (selectionMode && onToggleSelection) {
        onToggleSelection(task._id.toString());
      } else {
        setShowEditModal(true);
      }
    }
    isDraggingRef.current = false;
  };

  return (
    <>
      <div
        className={`bg-white rounded-lg ${compact ? 'p-2' : 'p-3 sm:p-4'} border border-[#e0e0e0] hover:border-[#7a7a7a] transition-all duration-200 relative group ${selectionMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
          } ${isSelected ? 'ring-1 ring-[#0066cc] bg-[#0066cc]/5' : ''
          }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setCtxMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        {/* Checkbox de selección */}
        {selectionMode && canDelete && (
          <div className="absolute top-2 left-2 z-10">
            <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected
                ? 'bg-[#0066cc] border-[#0066cc]'
                : 'bg-white border-[#e0e0e0] hover:border-[#0066cc]'
              }`}>
              {isSelected && <Check size={12} className="text-white" />}
            </div>
          </div>
        )}
        {/* Imagen si existe */}
        {task.imageUrl && (
          <div className="relative mb-2 -mx-3 sm:-mx-4 -mt-3 sm:-mt-4 h-24 sm:h-32">
            <Image
              src={task.imageUrl}
              alt={task.title}
              fill
              sizes="300px"
              className="object-cover rounded-t-lg"
            />
          </div>
        )}

        {/* Título + prioridad */}
        <div className="flex items-start gap-1.5 mb-1.5 pr-6">
          {task.priority && <PriorityFlag priority={task.priority} size={12} />}
          <h4 className="text-[14px] sm:text-[14px] font-semibold text-[#1d1d1f] line-clamp-2 tracking-[-0.224px]">
            {task.title}
          </h4>
        </div>

        {/* Fechas */}
        {(task.dueDate || task.deliveryDate) && (
          <div className="flex flex-row gap-1 mb-2 text-[10px] sm:text-[12px]">
            {task.dueDate && (
              <div className={`flex items-center gap-1 tracking-[-0.08px] ${DATE_TONE_CLASSES[getDateTone(task.dueDate, taskDone)]}`}>
                <Calendar size={10} className="sm:hidden" />
                <Calendar size={12} className="hidden sm:block" />
                <span className="truncate">Máx: {new Date(task.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
              </div>
            )}
            {task.deliveryDate && (
              <div className={`flex items-center gap-1 tracking-[-0.08px] ${DATE_TONE_CLASSES[getDateTone(task.deliveryDate, taskDone)]}`}>
                <Clock size={10} className="sm:hidden" />
                <Clock size={12} className="hidden sm:block" />
                <span className="truncate">Entrega: {new Date(task.deliveryDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
              </div>
            )}
          </div>
        )}

        {/* Indicadores: checklist, comentarios, adjuntos */}
        {((task.checklist && task.checklist.length > 0) || (task.comments && task.comments.length > 0) || (task.attachments && task.attachments.length > 0)) && (
          <div className="flex items-center gap-2.5 mb-1 text-[#8e8e93]">
            {task.checklist && task.checklist.length > 0 && (
              <span className="flex items-center gap-0.5 text-[11px]">
                <ListChecks size={12} />
                {task.checklist.filter((c) => c.done).length}/{task.checklist.length}
              </span>
            )}
            {task.comments && task.comments.length > 0 && (
              <span className="flex items-center gap-0.5 text-[11px]">
                <MessageSquare size={11} />
                {task.comments.length}
              </span>
            )}
            {task.attachments && task.attachments.length > 0 && (
              <span className="flex items-center gap-0.5 text-[11px]">
                <Paperclip size={11} />
                {task.attachments.length}
              </span>
            )}
          </div>
        )}

        {/* Footer con avatares y tags */}
        <div className={`flex items-center justify-between gap-2 ${compact ? 'mt-1 pt-1.5' : 'mt-2 pt-2'} border-t border-[#e0e0e0]`}>
          {/* Avatares */}
          {assignedUsers && assignedUsers.length > 0 ? (
            <div className="flex -space-x-1.5">
              {assignedUsers.slice(0, 2).map((user) => (
                <Avatar
                  key={user._id.toString()}
                  src={user.image}
                  name={user.name}
                  size="sm"
                />
              ))}
              {assignedUsers.length > 2 && (
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#f5f5f7] border-2 border-white flex items-center justify-center">
                  <span className="text-[10px] font-medium text-[#7a7a7a] tracking-[-0.08px]">+{assignedUsers.length - 2}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-6" />
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-end">
              {task.tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="tag" color={tag.color} className="text-[10px]">
                  {tag.text}
                </Badge>
              ))}
              {task.tags.length > 2 && (
                <span className="text-[10px] text-[#7a7a7a] px-1.5 py-0.5">+{task.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>

        {/* Botón de opciones */}
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded-lg hover:bg-[#f5f5f7] transition-colors"
          >
            <MoreVertical size={14} className="text-[#7a7a7a]" />
          </button>

          {/* Menú desplegable */}
          {showMenu && (
            <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-[#e0e0e0] py-1 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  setShowEditModal(true);
                }}
                className="w-full px-3 py-1.5 text-left text-[12px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-1.5 tracking-[-0.12px]"
              >
                <Edit2 size={12} />
                Editar
              </button>
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    setShowDeleteDialog(true);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[12px] text-red-500 hover:bg-red-50 flex items-center gap-1.5 tracking-[-0.12px]"
                >
                  <Trash2 size={12} />
                  Eliminar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Menú contextual (clic derecho) */}
      {ctxMenu && (
        <SidebarContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={[
            { label: 'Editar', icon: Edit2, onClick: () => setShowEditModal(true) },
            ...(canDelete
              ? [{ label: 'Eliminar', icon: Trash2, onClick: () => setShowDeleteDialog(true), variant: 'danger' as const, separator: true }]
              : []),
          ]}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* Panel de edición */}
      <TaskDetailPanel
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        task={task}
        canEdit={canEdit}
        canComment={canComment}
      />

      {/* Diálogo de confirmación de eliminación */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Eliminar Tarea"
        message={
          <p className="text-[#7a7a7a]">
            ¿Estás seguro de que deseas eliminar la tarea <strong>&quot;{task.title}&quot;</strong>? Esta acción no se puede deshacer.
          </p>
        }
        confirmText="Eliminar"
        isLoading={isDeleting}
        variant="danger"
      />
    </>
  );
}
