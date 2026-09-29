'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ITask, IBoardColumn } from '@/types';
import { getBoardColumns } from '@/lib/board-columns';
import TaskCard from './TaskCard';
import TaskDetailPanel from './TaskDetailPanel';
import { moveTask, deleteMultipleTasks, bulkUpdateTaskStatus } from '@/actions/task-actions';
import { restoreItem } from '@/actions/trash-actions';
import { useRouter } from 'next/navigation';
import { Trash2, X, Plus, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useNotification } from '@/components/ui/NotificationContext';

interface KanbanBoardProps {
  initialTasks: ITask[];
  boardId: string;
  boardOwnerId?: string;
  canEdit?: boolean;
  canComment?: boolean;
  columns?: IBoardColumn[];
  compact?: boolean;
}

type TasksByStatus = Record<string, ITask[]>;

export default function KanbanBoard({ initialTasks, boardId, boardOwnerId, canEdit = true, canComment = true, columns: columnsProp, compact = false }: KanbanBoardProps) {
  const columns = useMemo(() => getBoardColumns(columnsProp), [columnsProp]);
  const router = useRouter();
  const { data: session } = useSession();
  const { showNotification } = useNotification();
  const currentUserId = session?.user?.id;

  // Solo puede eliminar una tarea quien la creó o el propietario del tablero
  const canDeleteTask = (task: ITask) =>
    !!currentUserId &&
    (task.createdBy?.toString() === currentUserId || boardOwnerId === currentUserId);
  const [tasks, setTasks] = useState<TasksByStatus>(() =>
    Object.fromEntries(columns.map((c) => [c.id, [] as ITask[]]))
  );
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<string | null>(null);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  // Organizar tareas por columna (status desconocidos van a la primera columna)
  useEffect(() => {
    const organized: TasksByStatus = Object.fromEntries(columns.map((c) => [c.id, [] as ITask[]]));

    initialTasks.forEach((task) => {
      const key = organized[task.status] ? task.status : columns[0].id;
      organized[key].push(task);
    });

    // Ordenar por order
    Object.keys(organized).forEach((status) => {
      organized[status].sort((a, b) => a.order - b.order);
    });

    // Limpiar selección si las tareas cambian
    setSelectedTasks(new Set());
    setSelectionMode(false);

    setTasks(organized);
  }, [initialTasks, columns]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Si no hay destino, no hacer nada
    if (!destination) return;

    // Si se soltó en el mismo lugar, no hacer nada
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceStatus = source.droppableId;
    const destStatus = destination.droppableId;

    // Optimistic update
    const newTasks = { ...tasks };
    const [movedTask] = newTasks[sourceStatus].splice(source.index, 1);
    movedTask.status = destStatus;
    newTasks[destStatus].splice(destination.index, 0, movedTask);

    // Actualizar orden
    newTasks[destStatus].forEach((task, index) => {
      task.order = index;
    });

    setTasks(newTasks);

    // Server action
    try {
      const result = await moveTask(draggableId, destStatus, destination.index);
      
      if (!result.success) {
        // Revertir si falla
        setTasks(tasks);
        console.error('Error al mover tarea:', result.error);
      } else {
        // Refrescar para asegurar sincronización
        router.refresh();
      }
    } catch (error) {
      // Revertir si hay error
      setTasks(tasks);
      console.error('Error al mover tarea:', error);
    }
  };

  const handleToggleSelection = (taskId: string) => {
    const task = Object.values(tasks).flat().find((t) => t._id.toString() === taskId);
    if (task && !canDeleteTask(task)) return;

    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteMultipleTasks(Array.from(selectedTasks));
      if (result.success) {
        const deletedIds = Array.from(selectedTasks);
        setShowDeleteDialog(false);
        setSelectedTasks(new Set());
        setSelectionMode(false);
        showNotification(`${deletedIds.length} ${deletedIds.length === 1 ? 'tarea eliminada' : 'tareas eliminadas'}`, 'success', {
          action: {
            label: 'Deshacer',
            onClick: async () => {
              for (const id of deletedIds) await restoreItem('task', id);
              router.refresh();
            },
          },
        });
        router.refresh();
      } else {
        showNotification(result.error || 'Error al eliminar las tareas', 'error');
      }
    } catch (error) {
      console.error('Error al eliminar tareas:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelSelection = () => {
    setSelectedTasks(new Set());
    setSelectionMode(false);
    setShowMoveMenu(false);
  };

  const handleMoveSelected = async (status: string) => {
    setIsMoving(true);
    try {
      const result = await bulkUpdateTaskStatus(Array.from(selectedTasks), status);
      if (result.success) {
        handleCancelSelection();
        showNotification('Tareas actualizadas', 'success');
        router.refresh();
      } else {
        showNotification(result.error || 'Error al mover las tareas', 'error');
      }
    } catch {
      showNotification('Error al mover las tareas', 'error');
    } finally {
      setIsMoving(false);
      setShowMoveMenu(false);
    }
  };

  return (
    <>
      {/* Botón para activar modo de selección (solo si hay tareas que el usuario pueda eliminar) */}
      {!selectionMode && canEdit && initialTasks.some(canDeleteTask) && (
        <div className="mb-3 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectionMode(true)}
            className="text-[12px]"
          >
            Seleccionar tareas
          </Button>
        </div>
      )}

      {/* Barra de acciones flotante */}
      {selectionMode && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 z-50 bg-white shadow-lg rounded-lg border border-[#e0e0e0] px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <span className="text-[12px] sm:text-[14px] font-medium text-[#1d1d1f] tracking-[-0.12px] text-center sm:text-left">
            {selectedTasks.size} {selectedTasks.size === 1 ? 'tarea' : 'tareas'}
          </span>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowMoveMenu(!showMoveMenu)}
                disabled={selectedTasks.size === 0 || isMoving}
                className="w-full sm:w-auto"
              >
                <ArrowRight size={14} className="sm:mr-1" />
                Mover a
              </Button>
              {showMoveMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMoveMenu(false)} />
                  <div className="absolute bottom-full left-0 mb-1 w-40 bg-white rounded-lg shadow-lg border border-[#e0e0e0] py-1 z-20">
                    {columns.map((col) => (
                      <button
                        key={col.id}
                        onClick={() => handleMoveSelected(col.id)}
                        disabled={isMoving}
                        className="w-full px-3 py-1.5 text-left text-[12px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2 disabled:opacity-50"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                        {col.title}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancelSelection}
              className="flex-1 sm:flex-none"
            >
              <X size={14} className="sm:mr-1" />
              <span className="hidden sm:inline">Cancelar</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={selectedTasks.size === 0}
              className="flex-1 sm:flex-none"
            >
              <Trash2 size={14} className="sm:mr-1" />
              Eliminar
            </Button>
          </div>
        </div>
      )}

      {/* Diálogo de confirmación */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteSelected}
        title="Eliminar Tareas"
        message={
          <p className="text-[#7a7a7a]">
            ¿Estás seguro de que deseas eliminar <strong>{selectedTasks.size}</strong> {selectedTasks.size === 1 ? 'tarea' : 'tareas'}? Esta acción no se puede deshacer.
          </p>
        }
        confirmText="Eliminar"
        isLoading={isDeleting}
        variant="danger"
      />

    <DragDropContext onDragEnd={handleDragEnd}>
      <div
        className="flex flex-col md:grid gap-4 md:gap-6"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {columns.map((column) => (
          <div key={column.id} className="flex flex-col">
            {/* Header de columna */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <h3 className="text-[12px] sm:text-[14px] font-semibold text-[#1d1d1f] uppercase tracking-wide">
                    {column.title}
                  </h3>
                  <span className="text-[10px] sm:text-[12px] text-[#7a7a7a] bg-[#f5f5f7] px-2 py-0.5 rounded-full tracking-[-0.08px]">
                    {tasks[column.id].length}
                  </span>
                </div>
                {canEdit && (
                  <button
                    onClick={() => setNewTaskStatus(column.id)}
                    className="p-1 hover:bg-[#f5f5f7] rounded-full transition-colors"
                    title="Crear nueva tarea"
                  >
                    <Plus size={16} className="text-[#7a7a7a]" />
                  </button>
                )}
              </div>
            </div>

            {/* Droppable area */}
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 ${compact ? 'space-y-1.5' : 'space-y-2 sm:space-y-3'} ${compact ? 'p-1.5' : 'p-2 sm:p-3'} rounded-lg transition-colors min-h-[120px] sm:min-h-[200px] ${
                    snapshot.isDraggingOver
                      ? 'bg-[#0066cc]/5 ring-1 ring-[#0066cc]/20'
                      : 'bg-transparent'
                  }`}
                >
                  {tasks[column.id].length === 0 ? (
                    <div className="flex items-center justify-center h-20 sm:h-32 text-[12px] text-[#7a7a7a] border-2 border-dashed border-[#e0e0e0] rounded-lg tracking-[-0.12px]">
                      Sin tareas
                    </div>
                  ) : (
                    tasks[column.id].map((task, index) => (
                      <Draggable
                        key={task._id.toString()}
                        draggableId={task._id.toString()}
                        index={index}
                        isDragDisabled={!canEdit}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`${
                              snapshot.isDragging ? 'opacity-50 rotate-2' : ''
                            }`}
                          >
                            <TaskCard
                              task={task}
                              isDone={column.id === columns[columns.length - 1].id}
                              canDelete={canDeleteTask(task)}
                              selectionMode={selectionMode}
                              isSelected={selectedTasks.has(task._id.toString())}
                              onToggleSelection={handleToggleSelection}
                              canEdit={canEdit}
                              canComment={canComment}
                              compact={compact}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* Botón de nueva tarea al pie de la columna */}
            {canEdit && (
              <div className="mt-2 px-2 sm:px-3">
                <button
                  type="button"
                  onClick={() => setNewTaskStatus(column.id)}
                  className="flex items-center gap-1.5 w-full px-2.5 py-2 rounded-lg text-[12px] text-[#8e8e93] hover:bg-[#f5f5f7] hover:text-[#3a3a3c] transition-all"
                >
                  <Plus size={14} />
                  Nueva tarea
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </DragDropContext>

    {/* Panel de crear tarea */}
    <TaskDetailPanel
      isOpen={newTaskStatus !== null}
      onClose={() => setNewTaskStatus(null)}
      boardId={boardId}
      defaultStatus={newTaskStatus ?? undefined}
      columns={columns}
    />
    </>
  );
}
