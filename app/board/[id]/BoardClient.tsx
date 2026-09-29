'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Users, ArrowLeft, MoreVertical, Edit2, Trash2, LayoutGrid, Calendar, Tags, Folder, Eye, Columns3, Share2, MessageSquare, History, FileDown, Upload } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import TaskDetailPanel from '@/components/kanban/TaskDetailPanel';
import EditBoardModal from '@/components/dashboard/EditBoardModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import TagManagerModal from '@/components/kanban/TagManagerModal';
import ColumnsModal from '@/components/kanban/ColumnsModal';
import BoardActivityPanel from '@/components/kanban/BoardActivityPanel';
import ShareDialog from '@/components/share/ShareDialog';
import ImportBoardModal from '@/components/kanban/ImportBoardModal';
import BoardSyncer from '@/components/kanban/BoardSyncer';
import BoardWithFilters from './BoardWithFilters';
import TaskCalendar from '@/components/calendar/TaskCalendar';
import { deleteBoard } from '@/actions/board-actions';
import { exportBoardCSV } from '@/actions/export-actions';
import { updateTask } from '@/actions/task-actions';
import { useNotification } from '@/components/ui/NotificationContext';
import { IBoard, ITask, IUser, ITag, MemberRole } from '@/types';

interface BoardClientProps {
  board: IBoard;
  tasks: ITask[];
  boardUsers: IUser[];
  boardTags: ITag[];
  projectName?: string;
}

type ViewType = 'kanban' | 'calendar';

export default function BoardClient({ board, tasks, boardUsers, boardTags, projectName }: BoardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isBoardOwner = board.owner?.toString() === session?.user?.id;
  // memberRoles se serializa como objeto plano desde el servidor
  const memberRoles = (board.memberRoles ?? {}) as unknown as Record<string, MemberRole>;
  const myRole: 'owner' | MemberRole = isBoardOwner
    ? 'owner'
    : (memberRoles[session?.user?.email?.toLowerCase() ?? ''] ?? 'editor');
  const canEdit = myRole === 'owner' || myRole === 'editor';
  const canComment = canEdit || myRole === 'commenter';
  const [view, setView] = useState<ViewType>('kanban');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingTask, setEditingTask] = useState<ITask | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const { showNotification } = useNotification();

  const handleExportCSV = async () => {
    setShowBoardMenu(false);
    const result = await exportBoardCSV(board._id.toString());
    if (result.success && result.data) {
      const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.data.filename;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('Tablero exportado a CSV', 'success');
    } else {
      showNotification(result.error || 'Error al exportar', 'error');
    }
  };

  // Deep-link: abrir una tarea puntual via ?task=<id> (ej. desde la búsqueda)
  // o el modal de creación via ?newTask=1 (desde el command palette)
  useEffect(() => {
    const taskId = searchParams.get('task');
    if (taskId) {
      const task = tasks.find((t) => t._id.toString() === taskId);
      if (task) setEditingTask(task);
    }
    if (searchParams.get('newTask') && canEdit) {
      setIsTaskModalOpen(true);
    }
  // Solo al montar con las tareas iniciales
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!canEdit) return;
    await updateTask(task._id.toString(), { deliveryDate: newDate.toISOString() });
    router.refresh();
  };

  return (
    <>
      {/* Polling ligero para sincronizar cambios de otros usuarios */}
      <BoardSyncer boardId={board._id.toString()} />

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

          {/* Breadcrumb + Título */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 px-1">
            {projectName && (
              <>
                <button
                  onClick={() => router.push(`/parent-project/${board.projectId}`)}
                  className="hidden sm:flex items-center gap-1 text-[12px] text-[#a0a0a8] hover:text-[#0066cc] transition-colors shrink-0"
                >
                  <Folder size={11} />
                  <span className="max-w-35 truncate">{projectName}</span>
                </button>
                <span className="hidden sm:inline text-[#d1d1d6] text-[12px] shrink-0">/</span>
              </>
            )}
            {board.icon && (
              <span className="text-[15px] leading-none shrink-0">{board.icon}</span>
            )}
            <span className="text-[14px] font-semibold text-[#1d1d1f] tracking-tight truncate leading-none">
              {board.name}
            </span>
            <span className="hidden sm:flex items-center gap-1 shrink-0 text-[11px] text-[#a0a0a8] bg-[#f5f5f7] px-1.5 py-0.5 rounded-md font-medium">
              <Users size={10} />
              {board.members.length}
            </span>
            {myRole === 'viewer' && (
              <span className="flex items-center gap-1 shrink-0 text-[11px] text-[#b36400] bg-[#fff4e0] px-1.5 py-0.5 rounded-md font-medium">
                <Eye size={10} />
                Solo lectura
              </span>
            )}
            {myRole === 'commenter' && (
              <span className="flex items-center gap-1 shrink-0 text-[11px] text-[#0066cc] bg-[#e8f0fb] px-1.5 py-0.5 rounded-md font-medium">
                <MessageSquare size={10} />
                Comentarista
              </span>
            )}
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
          {canEdit && (
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066cc] hover:bg-[#0055b3] active:bg-[#004499] text-white rounded-lg text-[12px] font-medium transition-colors shrink-0 shadow-sm"
          >
            <Plus size={13} strokeWidth={2.5} />
            <span className="hidden sm:inline">Nueva Tarea</span>
          </button>
          )}

          {/* Actividad */}
          <button
            onClick={() => setShowActivity(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors shrink-0"
            title="Actividad del tablero"
          >
            <History size={13} />
            <span className="hidden sm:inline">Actividad</span>
          </button>

          {/* Compartir */}
          <button
            onClick={() => setShowShareDialog(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors shrink-0"
            title="Compartir tablero"
          >
            <Share2 size={13} />
            <span className="hidden sm:inline">Compartir</span>
          </button>

          {/* Menú de opciones (oculto para viewer/commenter) */}
          {canEdit && (
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
                    {isBoardOwner && (
                    <button
                      onClick={() => { setShowBoardMenu(false); setShowEditModal(true); }}
                      className="w-full px-3 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2.5 rounded-lg transition-colors"
                    >
                      <Edit2 size={13} className="text-[#7a7a7a]" />
                      Editar tablero
                    </button>
                    )}
                    {canEdit && (
                    <>
                    <button
                      onClick={() => { setShowBoardMenu(false); setShowTagManager(true); }}
                      className="w-full px-3 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2.5 rounded-lg transition-colors"
                    >
                      <Tags size={13} className="text-[#7a7a7a]" />
                      Administrar etiquetas
                    </button>
                    <button
                      onClick={() => { setShowBoardMenu(false); setShowColumnsModal(true); }}
                      className="w-full px-3 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2.5 rounded-lg transition-colors"
                    >
                      <Columns3 size={13} className="text-[#7a7a7a]" />
                      Personalizar columnas
                    </button>
                    <button
                      onClick={() => { setShowBoardMenu(false); setShowImportModal(true); }}
                      className="w-full px-3 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2.5 rounded-lg transition-colors"
                    >
                      <Upload size={13} className="text-[#7a7a7a]" />
                      Importar CSV / Trello
                    </button>
                    </>
                    )}
                    <button
                      onClick={handleExportCSV}
                      className="w-full px-3 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2.5 rounded-lg transition-colors"
                    >
                      <FileDown size={13} className="text-[#7a7a7a]" />
                      Exportar a CSV
                    </button>
                  </div>
                  {isBoardOwner && (
                    <>
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
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      {view === 'kanban' ? (
        <BoardWithFilters
          tasks={tasks}
          boardId={board._id.toString()}
          boardOwnerId={board.owner.toString()}
          boardUsers={boardUsers}
          boardTags={boardTags}
          canEdit={canEdit}
          canComment={canComment}
          columns={board.columns}
        />
      ) : (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <TaskCalendar
            tasks={tasks}
            onTaskClick={(task) => setEditingTask(task)}
            onEventDrop={handleEventDrop}
            hideProjectFilter={true}
            canDrag={canEdit}
          />
        </div>
      )}

      {/* Panel de crear tarea */}
      <TaskDetailPanel
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        boardId={board._id.toString()}
        columns={board.columns}
      />

      {/* Panel de editar tarea (desde calendario) */}
      {editingTask && (
        <TaskDetailPanel
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          task={editingTask}
          canEdit={canEdit}
          canComment={canComment}
        />
      )}

      {/* Panel de actividad */}
      <BoardActivityPanel
        isOpen={showActivity}
        onClose={() => setShowActivity(false)}
        boardId={board._id.toString()}
      />

      {/* Diálogo de compartir */}
      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        resourceType="board"
        resourceId={board._id.toString()}
        resourceName={board.name}
        ownerId={board.owner.toString()}
        boardPublicToken={board.publicToken}
      />

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
        canDeleteTags={isBoardOwner}
      />

      {/* Modal de columnas personalizables */}
      <ColumnsModal
        isOpen={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        boardId={board._id.toString()}
        initialColumns={board.columns}
      />

      {/* Modal de importación */}
      <ImportBoardModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        boardId={board._id.toString()}
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
              ¿Estás seguro de que deseas eliminar el tablero <strong>&quot;{board.name}&quot;</strong>?
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
