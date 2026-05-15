'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Folder, MoreVertical, Edit2, Trash2, ChevronRight } from 'lucide-react';
import EditProjectModal from './EditProjectModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { deleteProject } from '@/actions/project-actions';
import { IProject } from '@/types';
import { formatDate } from '@/lib/utils';

interface ProjectCardProps {
  project: IProject;
  boardCount: number;
  onBoardDrop?: (boardId: string, projectId: string) => void;
}

export default function ProjectCard({ project, boardCount, onBoardDrop }: ProjectCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOver, setIsOver] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteProject(project._id.toString());
      if (result.success) {
        setShowDeleteDialog(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    setShowMenu(false);
    setShowEditModal(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    
    const boardId = e.dataTransfer.getData('boardId');
    if (boardId && onBoardDrop) {
      onBoardDrop(boardId, project._id.toString());
    }
  };

  return (
    <>
    {/* Tarjeta de Proyecto - Diseño distintivo con gradiente y más prominente */}
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-linear-to-br from-[#0066cc] to-[#0052a3] rounded-xl p-4 sm:p-5 shadow-md hover:shadow-lg transition-all duration-200 relative group ${
        isOver ? 'ring-4 ring-white ring-opacity-50 scale-105' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Ícono de carpeta */}
          <div className="p-2.5 bg-white/10 rounded-lg backdrop-blur-sm shrink-0">
            <Folder size={20} className="text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-[17px] font-bold text-white mb-1 tracking-[-0.32px] truncate">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-[13px] text-white/80 line-clamp-2 tracking-[-0.12px]">
                {project.description}
              </p>
            )}
          </div>
        </div>

        <div className="relative shrink-0 ml-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <MoreVertical size={16} className="text-white" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
              <button
                onClick={handleEdit}
                className="w-full px-3 py-2 text-left text-[12px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2 tracking-[-0.12px]"
              >
                <Edit2 size={14} />
                Editar
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowDeleteDialog(true);
                }}
                className="w-full px-3 py-2 text-left text-[12px] text-red-500 hover:bg-red-50 flex items-center gap-2 tracking-[-0.12px]"
              >
                <Trash2 size={14} />
                Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contador de tableros */}
      <div className="flex items-center justify-between pt-3 border-t border-white/20">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-lg">
            <span className="text-[13px] font-semibold text-white tracking-[-0.12px]">
              {boardCount} {boardCount === 1 ? 'Tablero' : 'Tableros'}
            </span>
          </div>
          <span className="text-[11px] text-white/70 tracking-[-0.08px]">
            {formatDate(project.updatedAt)}
          </span>
        </div>
        
        <Link
          href={`/project/${project._id}`}
          className="flex items-center gap-1 text-[13px] font-medium text-white hover:text-white/80 transition-colors tracking-[-0.12px]"
        >
          Ver tableros
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>

    {/* Modal de edición */}
    <EditProjectModal
      isOpen={showEditModal}
      onClose={() => setShowEditModal(false)}
      project={project}
    />

    {/* Diálogo de confirmación de eliminación */}
    <ConfirmDialog
      isOpen={showDeleteDialog}
      onClose={() => setShowDeleteDialog(false)}
      onConfirm={handleDelete}
      title="Eliminar Proyecto"
      message={
        <div className="space-y-2">
          <p className="text-[#7a7a7a]">
            ¿Estás seguro de que deseas eliminar el proyecto <strong>"{project.name}"</strong>?
          </p>
          <p className="text-sm text-red-500">
            Esta acción eliminará permanentemente el proyecto, sus {boardCount} tablero{boardCount === 1 ? '' : 's'} y todas sus tareas.
          </p>
        </div>
      }
      confirmText="Eliminar"
      isLoading={isDeleting}
      variant="danger"
    />
  </>
  );
}
