'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ITask, IUser } from '@/types';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EditTaskModal from './EditTaskModal';
import { Image as ImageIcon, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { deleteTask } from '@/actions/task-actions';

interface TaskCardProps {
  task: ITask;
}

export default function TaskCard({ task }: TaskCardProps) {
  const router = useRouter();
  const assignedUsers = task.assignedTo as unknown as IUser[];
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  return (
    <>
      <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 cursor-grab active:cursor-grabbing relative group">
      {/* Imagen si existe */}
      {task.imageUrl && (
        <div className="mb-3 -mx-4 -mt-4">
          <img
            src={task.imageUrl}
            alt={task.title}
            className="w-full h-32 object-cover rounded-t-xl"
          />
        </div>
      )}

      {/* Título */}
      <h4 className="text-sm font-semibold text-[#1d1d1f] mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Descripción */}
      {task.description && (
        <p className="text-xs text-[#7a7a7a] mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {task.tags.map((tag, index) => (
            <Badge key={index} variant="tag" color={tag.color}>
              {tag.text}
            </Badge>
          ))}
        </div>
      )}

      {/* Footer con avatares */}
      {assignedUsers && assignedUsers.length > 0 && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
          <div className="flex -space-x-2">
            {assignedUsers.slice(0, 3).map((user) => (
              <Avatar
                key={user._id.toString()}
                src={user.image}
                name={user.name}
                size="sm"
              />
            ))}
            {assignedUsers.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-[#f5f5f7] text-[#7a7a7a] text-xs flex items-center justify-center ring-2 ring-white font-medium">
                +{assignedUsers.length - 3}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Indicador de imagen si no hay URL pero podría tenerla */}
      {!task.imageUrl && task.description && (
        <div className="mt-2 pt-2 border-t border-gray-50">
          <div className="flex items-center gap-1.5 text-xs text-[#7a7a7a]">
            <ImageIcon size={12} />
            <span>Sin imagen</span>
          </div>
        </div>
      )}

      {/* Botón de opciones */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <MoreVertical size={16} className="text-[#7a7a7a]" />
        </button>

        {/* Menú desplegable */}
        {showMenu && (
          <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                setShowEditModal(true);
              }}
              className="w-full px-4 py-2 text-left text-sm text-[#1d1d1f] hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit2 size={14} />
              Editar
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                setShowDeleteDialog(true);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 size={14} />
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
