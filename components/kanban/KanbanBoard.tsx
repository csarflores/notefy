'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ITask } from '@/types';
import TaskCard from './TaskCard';
import { moveTask } from '@/actions/task-actions';
import { useRouter } from 'next/navigation';

interface KanbanBoardProps {
  initialTasks: ITask[];
  projectId: string;
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

export default function KanbanBoard({ initialTasks, projectId }: KanbanBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TasksByStatus>({
    todo: [],
    'in-progress': [],
    done: [],
  });

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

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map((column) => (
          <div key={column.id} className="flex flex-col">
            {/* Header de columna */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
                <h3 className="text-sm font-semibold text-[#1d1d1f] uppercase tracking-wide">
                  {column.title}
                </h3>
                <span className="text-xs text-[#7a7a7a] bg-[#f5f5f7] px-2 py-0.5 rounded-full">
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
                  className={`flex-1 space-y-3 p-3 rounded-2xl transition-colors min-h-[200px] ${
                    snapshot.isDraggingOver
                      ? 'bg-[#0066cc]/5 ring-2 ring-[#0066cc]/20'
                      : 'bg-transparent'
                  }`}
                >
                  {tasks[column.id].length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-sm text-[#7a7a7a] border-2 border-dashed border-gray-200 rounded-xl">
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
                            <TaskCard task={task} />
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
  );
}
