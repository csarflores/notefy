'use client';

import { useState } from 'react';
import { Plus, Users, ArrowLeft, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import CreateTaskModal from '@/components/kanban/CreateTaskModal';
import EditBoardModal from '@/components/dashboard/EditBoardModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { deleteBoard, addBoardMember, removeBoardMember } from '@/actions/board-actions';
import { IBoard } from '@/types';

interface BoardClientProps {
  board: IBoard;
}

export default function BoardClient({ board }: BoardClientProps) {
  const router = useRouter();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteBoard = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteBoard(board._id.toString());
      if (result.success) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      console.error('Error al eliminar tablero:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Header del tablero */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm w-full overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Botón volver */}
              <button
                onClick={() => router.push('/dashboard')}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors shrink-0"
              >
                <ArrowLeft size={18} className="text-[#7a7a7a]" />
              </button>

              {/* Información del tablero */}
              <div className="min-w-0 flex-1">
                <h1 className="text-[20px] sm:text-[24px] font-semibold text-[#1d1d1f] mb-0.5 tracking-tight truncate">
                  {board.name}
                </h1>
                {board.description && (
                  <p className="text-[12px] sm:text-[13px] text-[#7a7a7a] tracking-[-0.12px] truncate">{board.description}</p>
                )}

                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] sm:text-[12px] text-[#7a7a7a]">
                  <Users size={12} className="shrink-0" />
                  <span>
                    {board.members.length} miembro{board.members.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto z-10">
              {/* Botón nueva tarea */}
              <Button 
                onClick={() => setIsTaskModalOpen(true)} 
                size="sm"
                className="flex-1 sm:flex-none text-[13px] py-1.5"
              >
                <Plus size={15} className="sm:mr-1.5" />
                <span className="hidden sm:inline">Nueva Tarea</span>
                <span className="sm:hidden">Tarea</span>
              </Button>

              {/* Menú de opciones del tablero */}
              <div className="relative">
                <button
                  onClick={() => setShowBoardMenu(!showBoardMenu)}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <MoreVertical size={18} className="text-[#7a7a7a]" />
                </button>

                {showBoardMenu && (
                  <>
                    {/* Overlay para cerrar al hacer click fuera */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowBoardMenu(false)}
                    />
                    {/* Menú desplegable */}
                    <div className="fixed right-4 top-16 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                      <button
                        onClick={() => {
                          setShowBoardMenu(false);
                          setShowEditModal(true);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-[#1d1d1f] hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit2 size={14} />
                        Editar Tablero
                      </button>
                      <button
                        onClick={() => {
                          setShowBoardMenu(false);
                          setShowDeleteDialog(true);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        Eliminar Tablero
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de crear tarea */}
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        projectId={board._id.toString()}
      />

      {/* Modal de editar tablero */}
      <EditBoardModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        board={board}
      />

      {/* Diálogo de confirmación de eliminación */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteBoard}
        title="Eliminar Tablero"
        message={
          <div className="space-y-2">
            <p className="text-[#7a7a7a]">
              ¿Estás seguro de que deseas eliminar el tablero <strong>"{board.name}"</strong>?
            </p>
            <p className="text-sm text-red-500">
              Esta acción eliminará permanentemente el tablero y todas sus tareas. No se puede deshacer.
            </p>
          </div>
        }
        confirmText="Eliminar Tablero"
        isLoading={isDeleting}
        variant="danger"
      />
    </>
  );
}
