'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Users, MoreHorizontal, Edit2, Trash2, Lock, LayoutGrid, ExternalLink, Copy } from 'lucide-react';
import EditBoardModal from './EditBoardModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import FavoriteButton from '@/components/ui/FavoriteButton';
import { deleteBoard, duplicateBoard } from '@/actions/board-actions';
import { IBoard } from '@/types';
import { formatDate } from '@/lib/utils';
import { useTabContext } from '@/components/tabs/TabContext';
import SidebarContextMenu, { ContextMenuItem } from '@/components/layout/SidebarContextMenu';

interface BoardCardProps {
  board: IBoard;
  index?: number;
  onDragStart?: (boardId: string, index: number, projectId?: string | null) => void;
  onDragEnd?: () => void;
  onDrop?: (boardId: string, index: number) => void;
  dragOverCompatible?: boolean;
  isFavorite?: boolean;
}

export default function BoardCard({
  board,
  index = 0,
  onDragStart,
  onDragEnd,
  onDrop,
  dragOverCompatible = false,
  isFavorite = false
}: BoardCardProps) {

  const router = useRouter();
  const { data: session } = useSession();
  const { openTab } = useTabContext();
  const isBoardOwner = board.owner?.toString() === session?.user?.id;
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  const openBoard = () => {
    openTab({
      id: `board-${board._id}`,
      type: 'board',
      title: board.name,
      url: `/board/${board._id}`,
      resourceId: board._id.toString(),
    });
    router.push(`/board/${board._id}`);
  };

  const handleClick = () => {
    if (isDragging) return;
    openBoard();
  };

  const handleDuplicate = async () => {
    const result = await duplicateBoard(board._id.toString());
    if (result.success) {
      router.refresh();
    } else {
      console.error('Error al duplicar tablero:', result.error);
    }
  };

  const ctxItems: ContextMenuItem[] = [
    { label: 'Editar', icon: Edit2, onClick: () => setShowEditModal(true) },
    { label: 'Abrir', icon: ExternalLink, onClick: openBoard },
    { label: 'Duplicar', icon: Copy, onClick: handleDuplicate, separator: true },
    ...(isBoardOwner ? [{ label: 'Eliminar', icon: Trash2, onClick: () => setShowDeleteDialog(true), variant: 'danger' as const, separator: true }] : []),
  ];

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('boardId', board._id.toString());
    e.dataTransfer.setData('boardIndex', index.toString());
    e.dataTransfer.setData('projectId', board.projectId?.toString() || '');
    setIsDragging(true);
    onDragStart?.(board._id.toString(), index, board.projectId?.toString() || null);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd?.();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCompatible) setIsOver(true);
  };

  const handleDragLeave = () => setIsOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    
    const draggedBoardId = e.dataTransfer.getData('boardId');
    const draggedProjectId = e.dataTransfer.getData('projectId') || null;
    
    // Solo permitir reordenamiento si es del mismo proyecto (o ambos sin proyecto)
    if ((board.projectId?.toString() || undefined) === (draggedProjectId || undefined) && draggedBoardId !== board._id.toString()) {
      onDrop?.(draggedBoardId, index);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteBoard(board._id.toString());
      if (result.success) {
        setShowDeleteDialog(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Error al eliminar tablero:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const members = board.members || [];

  return (
    <>
    <div
      draggable
      onClick={handleClick}
      onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative bg-white rounded-xl border border-[#e0e0e0] overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isOver ? 'ring-2 ring-[#0066cc] ring-offset-1' : ''}`}
    >
      {/* Color accent — left border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: board.color || '#6b7280' }}
      />

      <div className="pl-4 pr-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: (board.color || '#6b7280') + '1a' }}
            >
              {board.icon ? (
                <span className="text-[14px] leading-none">{board.icon}</span>
              ) : (
                <LayoutGrid size={13} style={{ color: board.color || '#6b7280' }} />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold text-[#1d1d1f] truncate tracking-[-0.2px]">
                {board.name}
              </h3>
              {board.description && (
                <p className="text-[11px] text-[#7a7a7a] line-clamp-1 mt-0.5">{board.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <FavoriteButton kind="board" resourceId={board._id.toString()} initialFavorite={isFavorite} />
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

        <div className="flex items-center gap-1 mt-2 mb-0.5">
          {members.length > 0 ? (
            <><Users size={11} className="text-[#a0a0a8]" /><span className="text-[11px] text-[#a0a0a8]">{members.length} {members.length === 1 ? 'miembro' : 'miembros'}</span></>
          ) : (
            <><Lock size={11} className="text-[#a0a0a8]" /><span className="text-[11px] text-[#a0a0a8]">Privado</span></>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f0f0f2]">
          <span className="text-[11px] text-[#a0a0a8]">{formatDate(board.updatedAt)}</span>
        </div>
      </div>
    </div>

    {/* Modal de edición */}
    <EditBoardModal
      isOpen={showEditModal}
      onClose={() => setShowEditModal(false)}
      board={board}
    />

    {ctxMenu && (
      <SidebarContextMenu
        x={ctxMenu.x}
        y={ctxMenu.y}
        items={ctxItems}
        onClose={() => setCtxMenu(null)}
      />
    )}

    {/* Diálogo de confirmación de eliminación */}
    <ConfirmDialog
      isOpen={showDeleteDialog}
      onClose={() => setShowDeleteDialog(false)}
      onConfirm={handleDelete}
      title="Eliminar Tablero"
      message={
        <div className="space-y-2">
          <p className="text-[#7a7a7a]">
            ¿Estás seguro de que deseas eliminar el tablero <strong>&quot;{board.name}&quot;</strong>?
          </p>
          <p className="text-sm text-[#7a7a7a]">
            El tablero y sus tareas irán a la papelera y podrás restaurarlos.
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
