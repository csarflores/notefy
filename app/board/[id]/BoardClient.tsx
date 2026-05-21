'use client';

import { useState } from 'react';
import { Plus, Users, ArrowLeft, MoreVertical, Edit2, Trash2, LayoutGrid, Calendar, Tags } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CreateTaskModal from '@/components/kanban/CreateTaskModal';
import EditTaskModal from '@/components/kanban/EditTaskModal';
import EditBoardModal from '@/components/dashboard/EditBoardModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import TagManagerModal from '@/components/kanban/TagManagerModal';
import BoardWithFilters from './BoardWithFilters';
import TaskCalendar from '@/components/calendar/TaskCalendar';
import { deleteBoard } from '@/actions/board-actions';
import { updateTask } from '@/actions/task-actions';
import { IBoard, ITask, IUser, ITag } from '@/types';

interface BoardClientProps {
  board: IBoard;
  tasks: ITask[];
  boardUsers: IUser[];
  boardTags: ITag[];
}

type ViewType = 'kanban' | 'calendar';

export default function BoardClient({ board, tasks, boardUsers, boardTags }: BoardClientProps) {
  const router = useRouter();
  const [view, setView] = useState<ViewType>('kanban');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingTask, setEditingTask] = useState<ITask | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);

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

  const handleEventDrop = async (task: ITask, newDate: Date) => {
    await updateTask(task._id.toString(), { deliveryDate: newDate.toISOString() });
    router.refresh();
  };

  return (
    <>
      {/* Header del tablero */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 w-full">
        <div className="w-full px-2 sm:px-5 h-11 flex items-center gap-1.5">

          {/* Volver */}
          <button
            onClick={() => router.push(board.projectId ? `/parent-project/${board.projectId}` : '/dashboard')}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[#7a7a7a] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all shrink-0 group"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          </button>

          {/* Separador */}
          <div className="w-px h-4 bg-[#e5e5e5] shrink-0" />

          {/* Título */}
          <div className="flex items-center gap-2 min-w-0 flex-1 px-1">
            <span className="text-[14px] font-semibold text-[#1d1d1f] tracking-tight truncate leading-none">
              {board.name}
            </span>
            <span className="hidden sm:flex items-center gap-1 shrink-0 text-[11px] text-[#a0a0a8] bg-[#f5f5f7] px-1.5 py-0.5 rounded-md font-medium">
              <Users size={10} />
              {board.members.length}
            </span>
          </div>

          {/* Toggle de vista */}
          <div className="flex items-center bg-[#f5f5f7] rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setView('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-all duration-150 ${
                view === 'kanban'
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#a0a0a8] hover:text-[#1d1d1f]'
              }`}
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">Tablero</span>
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-all duration-150 ${
                view === 'calendar'
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#a0a0a8] hover:text-[#1d1d1f]'
              }`}
            >
              <Calendar size={13} />
              <span className="hidden sm:inline">Calendario</span>
            </button>
          </div>

          {/* Nueva tarea */}
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066cc] hover:bg-[#0055b3] active:bg-[#004499] text-white rounded-lg text-[12px] font-medium transition-colors shrink-0 shadow-sm"
          >
            <Plus size={13} strokeWidth={2.5} />
            <span className="hidden sm:inline">Nueva Tarea</span>
          </button>

          {/* Menú de opciones */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowBoardMenu(!showBoardMenu)}
              className={`p-1.5 rounded-lg transition-colors ${
                showBoardMenu ? 'bg-[#f5f5f7] text-[#1d1d1f]' : 'text-[#a0a0a8] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'
              }`}
            >
              <MoreVertical size={15} />
            </button>

            {showBoardMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowBoardMenu(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-[#e5e5e5] overflow-hidden z-50">
                  <div className="p-1">
                    <button
                      onClick={() => { setShowBoardMenu(false); setShowEditModal(true); }}
                      className="w-full px-3 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2.5 rounded-lg transition-colors"
                    >
                      <Edit2 size={13} className="text-[#7a7a7a]" />
                      Editar tablero
                    </button>
                    <button
                      onClick={() => { setShowBoardMenu(false); setShowTagManager(true); }}
                      className="w-full px-3 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2.5 rounded-lg transition-colors"
                    >
                      <Tags size={13} className="text-[#7a7a7a]" />
                      Administrar etiquetas
                    </button>
                  </div>
                  <div className="h-px bg-[#f0f0f0] mx-1" />
                  <div className="p-1">
                    <button
                      onClick={() => { setShowBoardMenu(false); setShowDeleteDialog(true); }}
                      className="w-full px-3 py-2 text-left text-[13px] text-red-500 hover:bg-red-50 flex items-center gap-2.5 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} />
                      Eliminar tablero
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {view === 'kanban' ? (
        <BoardWithFilters
          tasks={tasks}
          boardId={board._id.toString()}
          boardUsers={boardUsers}
          boardTags={boardTags}
        />
      ) : (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <TaskCalendar
            tasks={tasks}
            onTaskClick={(task) => setEditingTask(task)}
            onEventDrop={handleEventDrop}
            hideProjectFilter={true}
          />
        </div>
      )}

      {/* Modal de crear tarea */}
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        projectId={board._id.toString()}
      />

      {/* Modal de editar tarea (desde calendario) */}
      {editingTask && (
        <EditTaskModal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          task={editingTask}
        />
      )}

      {/* Modal de editar tablero */}
      <EditBoardModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        board={board}
      />

      {/* Modal de administrar etiquetas */}
      <TagManagerModal
        isOpen={showTagManager}
        onClose={() => setShowTagManager(false)}
        boardId={board._id.toString()}
        initialTags={boardTags}
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
