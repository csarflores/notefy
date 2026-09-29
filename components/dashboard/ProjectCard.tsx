'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MoreHorizontal, Edit2, Trash2, ChevronRight, Folder, ExternalLink } from 'lucide-react';
import EditProjectModal from './EditProjectModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { deleteProject } from '@/actions/project-actions';
import { IProject } from '@/types';
import { formatDate } from '@/lib/utils';
import { useTabContext } from '@/components/tabs/TabContext';
import SidebarContextMenu from '@/components/layout/SidebarContextMenu';
import FavoriteButton from '@/components/ui/FavoriteButton';

interface ProjectCardProps {
  project: IProject;
  boardCount: number;
  onBoardDrop?: (boardId: string, projectId: string) => void;
  isFavorite?: boolean;
  progress?: { total: number; done: number };
}

export default function ProjectCard({ project, boardCount, onBoardDrop, isFavorite = false, progress }: ProjectCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { openTab } = useTabContext();
  const isProjectOwner = project.owner?.toString() === session?.user?.id;
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  const color = project.color || '#0066cc';

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

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsOver(true); };
  const handleDragLeave = () => setIsOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const boardId = e.dataTransfer.getData('boardId');
    if (boardId && onBoardDrop) onBoardDrop(boardId, project._id.toString());
  };

  const handleOpen = () => {
    openTab({
      id: `project-${project._id}`,
      type: 'project',
      title: project.name,
      url: `/parent-project/${project._id}`,
      resourceId: project._id.toString(),
    });
    router.push(`/parent-project/${project._id}`);
  };

  return (
    <>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
        className={`group relative bg-white rounded-xl border border-[#e0e0e0] overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer ${
          isOver ? 'ring-2 ring-[#0066cc] ring-offset-1' : ''
        }`}
        onClick={handleOpen}
      >
        {/* Color accent — left border */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: color }} />

        <div className="pl-4 pr-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: color + '1a' }}
              >
                {project.icon ? (
                  <span className="text-[14px] leading-none">{project.icon}</span>
                ) : (
                  <Folder size={13} style={{ color }} />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-[14px] font-semibold text-[#1d1d1f] truncate tracking-[-0.2px]">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-[11px] text-[#7a7a7a] line-clamp-1 mt-0.5">
                    {project.description}
                  </p>
                )}
              </div>
            </div>

            {/* Favorito + Menu */}
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <FavoriteButton kind="project" resourceId={project._id.toString()} initialFavorite={isFavorite} />
              <button
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setCtxMenu({ x: rect.left, y: rect.bottom + 4 });
                }}
                className="p-1 rounded-md hover:bg-[#f5f5f7] transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal size={14} className="text-[#7a7a7a]" />
              </button>
            </div>
          </div>

          {/* Barra de progreso */}
          {progress && progress.total > 0 && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[10px] text-[#a0a0a8] mb-1">
                <span>{progress.done}/{progress.total} tareas</span>
                <span>{Math.round((progress.done / progress.total) * 100)}%</span>
              </div>
              <div className="h-1 rounded-full bg-[#f0f0f2] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(progress.done / progress.total) * 100}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#f0f0f2]">
            <span className="text-[11px] text-[#a0a0a8]">
              {boardCount} {boardCount === 1 ? 'tablero' : 'tableros'} · {formatDate(project.updatedAt)}
            </span>
            <span className="flex items-center gap-0.5 text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }}>
              Abrir <ChevronRight size={11} />
            </span>
          </div>
        </div>
      </div>

      {ctxMenu && (
        <SidebarContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={[
            { label: 'Editar', icon: Edit2, onClick: () => setShowEditModal(true) },
            { label: 'Abrir', icon: ExternalLink, onClick: handleOpen },
            ...(isProjectOwner ? [{ label: 'Eliminar', icon: Trash2, onClick: () => setShowDeleteDialog(true), variant: 'danger' as const, separator: true }] : []),
          ]}
          onClose={() => setCtxMenu(null)}
        />
      )}

      <EditProjectModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        project={project}
      />
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Eliminar Proyecto"
        message={
          <div className="space-y-2">
            <p className="text-[#7a7a7a]">
              ¿Eliminar el proyecto <strong>&quot;{project.name}&quot;</strong>?
            </p>
            <p className="text-sm text-[#7a7a7a]">
              El proyecto irá a la papelera y sus {boardCount} tablero{boardCount === 1 ? '' : 's'} quedarán sin proyecto.
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
