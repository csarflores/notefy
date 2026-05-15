'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Calendar, MoreVertical, Edit2, Trash2, Lock } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import EditProjectModal from './EditProjectModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { deleteProject } from '@/actions/project-actions';
import { IProject } from '@/types';
import { formatDate } from '@/lib/utils';

interface ProjectCardProps {
  project: IProject;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClick = () => {
    router.push(`/project/${project._id}`);
  };

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

  const members = project.members;

  return (
    <>
    <div className="bg-white rounded-lg p-3 sm:p-3.5 border border-[#e0e0e0] hover:border-[#7a7a7a] transition-all duration-200 relative group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-0.5 tracking-[-0.32px] truncate">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-[12px] text-[#7a7a7a] line-clamp-1 tracking-[-0.12px]">
              {project.description}
            </p>
          )}
        </div>

        <div className="relative shrink-0 ml-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-lg hover:bg-[#f5f5f7] transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <MoreVertical size={15} className="text-[#7a7a7a]" />
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

      {/* Miembros */}
      {members.length > 0 ? (
        <div className="flex items-center gap-1 mb-2">
          <Users size={12} className="text-[#7a7a7a]" />
          <span className="text-[11px] text-[#7a7a7a] tracking-[-0.08px]">
            {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1 mb-2">
          <Lock size={12} className="text-[#7a7a7a]" />
          <span className="text-[11px] text-[#7a7a7a] tracking-[-0.08px]">
            Proyecto privado
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pt-2 border-t border-[#e0e0e0]">
        <span className="text-[10px] text-[#7a7a7a] tracking-[-0.08px]">
          {formatDate(project.updatedAt)}
        </span>
        <Link
          href={`/project/${project._id}`}
          className="text-[12px] font-medium text-[#0066cc] hover:text-[#0071e3] transition-colors tracking-[-0.12px]"
        >
          Ver proyecto →
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
            Esta acción eliminará permanentemente el proyecto y todas sus tareas.
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
