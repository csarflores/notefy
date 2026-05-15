'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ITask, IUser } from '@/types';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EditTaskModal from './EditTaskModal';
import { Image as ImageIcon, MoreVertical, Edit2, Trash2, Check, Calendar, Clock } from 'lucide-react';
import { deleteTask } from '@/actions/task-actions';

interface TaskCardProps {
  task: ITask;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (taskId: string) => void;
}

export default function TaskCard({ task, selectionMode = false, isSelected = false, onToggleSelection }: TaskCardProps) {
  const router = useRouter();
  const assignedUsers = task.assignedTo as unknown as IUser[];
  const [showMenu, setShowMenu] = useState(false);
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
        router.refresh();
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

  const handleClick = (e: React.MouseEvent) => {
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
        className={`bg-white rounded-lg p-3 sm:p-4 border border-[#e0e0e0] hover:border-[#7a7a7a] transition-all duration-200 relative group ${selectionMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
          } ${isSelected ? 'ring-1 ring-[#0066cc] bg-[#0066cc]/5' : ''
          }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        {/* Checkbox de selección */}
        {selectionMode && (
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
          <div className="mb-2 -mx-3 sm:-mx-4 -mt-3 sm:-mt-4">
            <img
              src={task.imageUrl}
              alt={task.title}
              className="w-full h-24 sm:h-32 object-cover rounded-t-lg"
            />
          </div>
        )}

        {/* Título */}
        <h4 className="text-[14px] sm:text-[14px] font-semibold text-[#1d1d1f] mb-1.5 line-clamp-2 tracking-[-0.224px]">
          {task.title}
        </h4>

        {/* Fechas */}
        {(task.dueDate || task.deliveryDate) && (
          <div className="flex flex-row gap-1 mb-2 text-[10px] sm:text-[12px]">
            {task.dueDate && (
              <div className="flex items-center gap-1 text-[#7a7a7a] tracking-[-0.08px]">
                <Calendar size={10} className="sm:hidden" />
                <Calendar size={12} className="hidden sm:block" />
                <span className="truncate">Máx: {new Date(task.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
              </div>
            )}
            {task.deliveryDate && (
              <div className="flex items-center gap-1 text-[#7a7a7a] tracking-[-0.08px]">
                <Clock size={10} className="sm:hidden" />
                <Clock size={12} className="hidden sm:block" />
                <span className="truncate">Entrega: {new Date(task.deliveryDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer con avatares y tags */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#e0e0e0]">
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
            </div>
          )}
        </div>
      </div>

      {/* Modal de edición */}
      <EditTaskModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        task={task}
      />

      {/* Diálogo de confirmación de eliminación */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Eliminar Tarea"
        message={
          <p className="text-[#7a7a7a]">
            ¿Estás seguro de que deseas eliminar la tarea <strong>"{task.title}"</strong>? Esta acción no se puede deshacer.
          </p>
        }
        confirmText="Eliminar"
        isLoading={isDeleting}
        variant="danger"
      />
    </>
  );
}
