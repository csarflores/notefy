'use client';

import { useState } from 'react';
import { Plus, Users, ArrowLeft, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import CreateTaskModal from '@/components/kanban/CreateTaskModal';
import EditProjectModal from '@/components/dashboard/EditProjectModal';
import InviteMemberModal from '@/components/project/InviteMemberModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { deleteProject } from '@/actions/project-actions';
import { IProject } from '@/types';

interface ProjectClientProps {
  project: IProject;
}

export default function ProjectClient({ project }: ProjectClientProps) {
  const router = useRouter();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteProject = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteProject(project._id.toString());
      if (result.success) {
        router.push('/dashboard');
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
      {/* Header del proyecto */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Botón volver */}
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft size={20} className="text-[#7a7a7a]" />
              </button>

              {/* Información del proyecto */}
              <div>
                <h1 className="text-2xl font-bold text-[#1d1d1f] mb-1">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="text-sm text-[#7a7a7a]">{project.description}</p>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-3">
              {/* Botón invitar miembros */}
              <Button 
                variant="secondary" 
                size="md"
                onClick={() => setIsInviteModalOpen(true)}
              >
                <Users size={18} className="mr-2" />
                Invitar Miembros
              </Button>

              {/* Botón nueva tarea */}
              <Button onClick={() => setIsTaskModalOpen(true)} size="md">
                <Plus size={18} className="mr-2" />
                Nueva Tarea
              </Button>

              {/* Menú de opciones del proyecto */}
              <div className="relative">
                <button
                  onClick={() => setShowProjectMenu(!showProjectMenu)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <MoreVertical size={20} className="text-[#7a7a7a]" />
                </button>

                {showProjectMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                    <button
                      onClick={() => {
                        setShowProjectMenu(false);
                        setShowEditModal(true);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-[#1d1d1f] hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit2 size={14} />
                      Editar Proyecto
                    </button>
                    <button
                      onClick={() => {
                        setShowProjectMenu(false);
                        setShowDeleteDialog(true);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      Eliminar Proyecto
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Miembros del proyecto */}
          {project.members.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-[#7a7a7a]">
              <Users size={16} />
              <span>
                {project.members.length} miembro{project.members.length > 1 ? 's' : ''} colaborando
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modal de crear tarea */}
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        projectId={project._id.toString()}
      />

      {/* Modal de invitar miembros */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        project={project}
      />

      {/* Modal de editar proyecto */}
      <EditProjectModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        project={project}
      />

      {/* Diálogo de confirmación de eliminación */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteProject}
        title="Eliminar Proyecto"
        message={
          <div className="space-y-2">
            <p className="text-[#7a7a7a]">
              ¿Estás seguro de que deseas eliminar el proyecto <strong>"{project.name}"</strong>?
            </p>
            <p className="text-sm text-red-500">
              Esta acción eliminará permanentemente el proyecto y todas sus tareas. No se puede deshacer.
            </p>
          </div>
        }
        confirmText="Eliminar Proyecto"
        isLoading={isDeleting}
        variant="danger"
      />
    </>
  );
}
