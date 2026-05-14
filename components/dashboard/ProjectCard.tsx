'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Calendar, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
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

  return (
    <>
      <Card hover onClick={handleClick} className="p-6 relative group">
      <div className="space-y-4">
        {/* Nombre del proyecto */}
        <div>
          <h3 className="text-xl font-semibold text-[#1d1d1f] mb-2 line-clamp-1">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-[#7a7a7a] line-clamp-2">
              {project.description}
            </p>
          )}
        </div>

        {/* Información adicional */}
        <div className="flex items-center gap-4 text-sm text-[#7a7a7a]">
          {/* Miembros */}
          <div className="flex items-center gap-1.5">
            <Users size={16} />
            <span>
              {project.members.length === 0
                ? 'Solo tú'
                : `${project.members.length + 1} miembro${project.members.length > 0 ? 's' : ''}`}
            </span>
          </div>

          {/* Fecha de actualización */}
          <div className="flex items-center gap-1.5">
            <Calendar size={16} />
            <span>{formatDate(project.updatedAt)}</span>
          </div>
        </div>

        {/* Botón de opciones */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
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
    </Card>

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
