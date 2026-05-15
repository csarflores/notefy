'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ITask } from '@/types';
import TaskCard from './TaskCard';
import { moveTask, deleteMultipleTasks } from '@/actions/task-actions';
import { useRouter } from 'next/navigation';
import { Trash2, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface KanbanBoardProps {
  initialTasks: ITask[];
  boardId: string;
}

type TasksByStatus = {
  todo: ITask[];
  'in-progress': ITask[];
  done: ITask[];
};

const COLUMNS = [
  { id: 'todo' as const, title: 'Pendiente', color: '#ff9500' },
  { id: 'in-progress' as const, title: 'En Proceso', color: '#0066cc' },
  { id: 'done' as const, title: 'Finalizado', color: '#34c759' },
];

export default function KanbanBoard({ initialTasks, boardId }: KanbanBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TasksByStatus>({
    todo: [],
    'in-progress': [],
    done: [],
  });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Organizar tareas por estado
  useEffect(() => {
    const organized: TasksByStatus = {
      todo: [],
      'in-progress': [],
      done: [],
    };

    initialTasks.forEach((task) => {
      organized[task.status].push(task);
    });

    // Ordenar por order
    Object.keys(organized).forEach((status) => {
      organized[status as keyof TasksByStatus].sort((a, b) => a.order - b.order);
    });

    // Limpiar selección si las tareas cambian
    setSelectedTasks(new Set());
    setSelectionMode(false);

    setTasks(organized);
  }, [initialTasks]);

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

    const sourceStatus = source.droppableId as keyof TasksByStatus;
    const destStatus = destination.droppableId as keyof TasksByStatus;

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
        setShowDeleteDialog(false);
        setSelectedTasks(new Set());
        setSelectionMode(false);
        router.refresh();
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
  };

  return (
    <>
      {/* Botón para activar modo de selección */}
      {!selectionMode && (
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
      <div className="flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-6">
        {COLUMNS.map((column) => (
          <div key={column.id} className="flex flex-col">
            {/* Header de columna */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
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
            </div>

            {/* Droppable area */}
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 space-y-2 sm:space-y-3 p-2 sm:p-3 rounded-lg transition-colors min-h-[120px] sm:min-h-[200px] ${
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
                              selectionMode={selectionMode}
                              isSelected={selectedTasks.has(task._id.toString())}
                              onToggleSelection={handleToggleSelection}
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
          </div>
        ))}
      </div>
    </DragDropContext>
    </>
  );
}
