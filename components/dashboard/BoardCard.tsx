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

interface BoardCardProps {
  board: IBoard;
}

export default function BoardCard({ board }: BoardCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = () => {
    router.push(`/board/${board._id}`);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('boardId', board._id.toString());
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
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
      className={`bg-white rounded-lg p-3 sm:p-3.5 border border-[#e0e0e0] hover:border-[#7a7a7a] transition-all duration-200 relative group cursor-move ${
        isDragging ? 'opacity-50 scale-95' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-0.5 tracking-[-0.32px] truncate">
            {board.name}
          </h3>
          {board.description && (
            <p className="text-[12px] text-[#7a7a7a] line-clamp-1 tracking-[-0.12px]">
              {board.description}
            </p>
          )}
        </div>

        <div className="relative shrink-0 ml-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-lg hover:bg-[#f5f5f7] transition-colors"
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
            Tablero privado
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pt-2 border-t border-[#e0e0e0]">
        <span className="text-[10px] text-[#7a7a7a] tracking-[-0.08px]">
          {formatDate(board.updatedAt)}
        </span>
        <Link
          href={`/board/${board._id}`}
          className="text-[12px] font-medium text-[#0066cc] hover:text-[#0071e3] transition-colors tracking-[-0.12px]"
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
