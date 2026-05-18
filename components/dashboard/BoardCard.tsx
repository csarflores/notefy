'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, MoreVertical, Edit2, Trash2, Lock } from 'lucide-react';
import EditBoardModal from './EditBoardModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { deleteBoard } from '@/actions/board-actions';
import { IBoard } from '@/types';
import { formatDate } from '@/lib/utils';
import { getProjectGradient } from '@/constants/project-colors';

interface BoardCardProps {
  board: IBoard;
  index?: number;
  onDragStart?: (boardId: string, index: number, projectId?: string | null) => void;
  onDragEnd?: () => void;
  onDrop?: (boardId: string, index: number) => void;
  isDragOver?: boolean;
}

export default function BoardCard({ 
  board, 
  index = 0, 
  onDragStart, 
  onDragEnd, 
  onDrop, 
  isDragOver = false 
}: BoardCardProps) {
  
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    // No hacer click si estamos arrastrando
    if (isDragging) return;
    router.push(`/board/${board._id}`);
  };

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
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    const draggedBoardId = e.dataTransfer.getData('boardId');
    const draggedBoardIndex = parseInt(e.dataTransfer.getData('boardIndex'));
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

  const handleEdit = () => {
    setShowMenu(false);
    setShowEditModal(true);
  };

  const members = board.members || [];

  return (
    <>
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`bg-white rounded-lg p-2.5 border border-[#e0e0e0] hover:border-[#7a7a7a] transition-all duration-200 relative group cursor-move ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${
        isDragOver ? 'ring-2 ring-blue-400 scale-105' : ''
      }`}
      style={{ borderColor: board.color ? board.color : undefined }}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-semibold text-[#1d1d1f] mb-0.5 tracking-[-0.32px] truncate">
            {board.name}
          </h3>
          {board.description && (
            <p className="text-[11px] text-[#7a7a7a] line-clamp-1 tracking-[-0.12px]">
              {board.description}
            </p>
          )}
        </div>

        <div className="relative shrink-0 ml-1.5">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-lg hover:bg-[#f5f5f7] transition-colors"
          >
            <MoreVertical size={13} className="text-[#7a7a7a]" />
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
        <div className="flex items-center gap-1 mb-1.5">
          <Users size={11} className="text-[#7a7a7a]" />
          <span className="text-[10px] text-[#7a7a7a] tracking-[-0.08px]">
            {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1 mb-1.5">
          <Lock size={11} className="text-[#7a7a7a]" />
          <span className="text-[10px] text-[#7a7a7a] tracking-[-0.08px]">
            Tablero privado
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pt-1.5 border-t border-[#e0e0e0]">
        <span className="text-[9px] text-[#7a7a7a] tracking-[-0.08px]">
          {formatDate(board.updatedAt)}
        </span>
        <Link
          href={`/board/${board._id}`}
          className="text-[11px] font-medium text-[#0066cc] hover:text-[#0071e3] transition-colors tracking-[-0.12px]"
        >
          Ver tablero →
        </Link>
      </div>
    </div>

    {/* Modal de edición */}
    <EditBoardModal
      isOpen={showEditModal}
      onClose={() => setShowEditModal(false)}
      board={board}
    />

    {/* Diálogo de confirmación de eliminación */}
    <ConfirmDialog
      isOpen={showDeleteDialog}
      onClose={() => setShowDeleteDialog(false)}
      onConfirm={handleDelete}
      title="Eliminar Tablero"
      message={
        <div className="space-y-2">
          <p className="text-[#7a7a7a]">
            ¿Estás seguro de que deseas eliminar el tablero <strong>"{board.name}"</strong>?
          </p>
          <p className="text-sm text-red-500">
            Esta acción eliminará permanentemente el tablero y todas sus tareas.
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
