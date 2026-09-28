'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import TaskListView from '@/components/kanban/TaskListView';
import TaskFilters, { FilterType } from '@/components/kanban/TaskFilters';
import { ITask, IUser, ITag, IBoardColumn } from '@/types';
import { Inbox, KanbanSquare, List } from 'lucide-react';

interface BoardWithFiltersProps {
  tasks: ITask[];
  boardId: string;
  boardOwnerId: string;
  boardUsers: IUser[];
  boardTags: ITag[];
  canEdit?: boolean;
  canComment?: boolean;
  columns?: IBoardColumn[];
}

export default function BoardWithFilters({
  tasks,
  boardId,
  boardOwnerId,
  boardUsers,
  boardTags,
  canEdit = true,
  canComment = true,
  columns
}: BoardWithFiltersProps) {
  const { data: session } = useSession();
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
  const [view, setView] = useState<'kanban' | 'list'>(() =>
    typeof window !== 'undefined' && localStorage.getItem('board-view') === 'list' ? 'list' : 'kanban'
  );

  const handleViewChange = (v: 'kanban' | 'list') => {
    setView(v);
    try { localStorage.setItem('board-view', v); } catch {}
  };

  // Si no hay tags en el tablero, extraer todas las tags únicas de las tareas
  const allTags = useMemo(() => {
    if (boardTags && boardTags.length > 0) {
      return boardTags;
    }
    
    // Extraer tags únicas de todas las tareas
    const tagsMap = new Map<string, ITag>();
    tasks.forEach(task => {
      if (task.tags && task.tags.length > 0) {
        task.tags.forEach(tag => {
          if (!tagsMap.has(tag.text)) {
            tagsMap.set(tag.text, tag);
          }
        });
      }
    });
    
    return Array.from(tagsMap.values());
  }, [tasks, boardTags]);

  // Filtrar tareas según el filtro activo
  const filteredTasks = useMemo(() => {
    if (currentFilter === 'all') {
      return tasks;
    }

    if (currentFilter === 'my-tasks' && session?.user?.id) {
      return tasks.filter(task => {
        // assignedTo puede ser array de objetos de usuario o IDs
        return (task.assignedTo as unknown as ({ _id?: { toString(): string } } | string)[]).some((user) => {
          // Si es un objeto, acceder a _id, si es string, usar directamente
          const userId = typeof user === 'object' && user !== null
            ? (user._id?.toString() || String(user))
            : String(user);
          return userId === session.user.id;
        });
      });
    }

    // Filtro por columna del tablero (col:<id>)
    if (currentFilter.startsWith('col:')) {
      const columnId = currentFilter.slice(4);
      return tasks.filter(task => task.status === columnId);
    }

    // Filtro por prioridad
    if (currentFilter.startsWith('priority:')) {
      const p = currentFilter.split(':')[1];
      return tasks.filter((task) =>
        p === 'none' ? !task.priority : task.priority === p
      );
    }

    // Verificar si es un filtro por etiqueta
    const isTagFilter = allTags.some(tag => tag.text === currentFilter);
    if (isTagFilter) {
      return tasks.filter(task => {
        return task.tags && task.tags.some(tag => tag.text === currentFilter);
      });
    }

    // Filtrar por usuario específico
    return tasks.filter(task => {
      return (task.assignedTo as unknown as ({ _id?: { toString(): string } } | string)[]).some((user) => {
        // Si es un objeto, acceder a _id, si es string, usar directamente
        const userId = typeof user === 'object' && user !== null
          ? (user._id?.toString() || String(user))
          : String(user);
        return userId === currentFilter;
      });
    });
  }, [tasks, currentFilter, session?.user?.id, allTags]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
      {tasks.length === 0 ? (
        // Estado vacío - sin tareas en el tablero
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-24 h-24 rounded-full bg-[#f5f5f7] flex items-center justify-center mb-6">
            <Inbox size={40} className="text-[#7a7a7a]" />
          </div>
          <h3 className="text-2xl font-semibold text-[#1d1d1f] mb-2">
            No hay tareas aún
          </h3>
          <p className="text-[#7a7a7a] text-center max-w-md mb-6">
            Comienza creando tu primera tarea para organizar el trabajo de este tablero
          </p>
          <p className="text-sm text-[#7a7a7a]">
            Haz clic en <span className="font-semibold text-[#0066cc]">Nueva Tarea</span> para empezar
          </p>
        </div>
      ) : (
        <>
          {/* Barra de filtros */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TaskFilters
                currentFilter={currentFilter}
                onFilterChange={setCurrentFilter}
                currentUserId={session?.user?.id}
                projectUsers={boardUsers}
                projectTags={allTags}
                columns={columns}
              />
              {filteredTasks.length !== tasks.length && (
                <span className="text-[11px] text-[#7a7a7a] tracking-[-0.08px]">
                  {filteredTasks.length} de {tasks.length} tareas
                </span>
              )}
            </div>

            {/* Toggle kanban/lista */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#f0f0f2]">
              <button
                type="button"
                onClick={() => handleViewChange('kanban')}
                title="Vista kanban"
                className={`p-1.5 rounded-md transition-all ${
                  view === 'kanban' ? 'bg-white shadow-sm text-[#1d1d1f]' : 'text-[#8e8e93] hover:text-[#3a3a3c]'
                }`}
              >
                <KanbanSquare size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleViewChange('list')}
                title="Vista lista"
                className={`p-1.5 rounded-md transition-all ${
                  view === 'list' ? 'bg-white shadow-sm text-[#1d1d1f]' : 'text-[#8e8e93] hover:text-[#3a3a3c]'
                }`}
              >
                <List size={15} />
              </button>
            </div>
          </div>

          {/* Tablero Kanban con tareas filtradas */}
          {filteredTasks.length === 0 ? (
            // Estado vacío - filtro sin resultados
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-[#f5f5f7] flex items-center justify-center mb-4">
                <Inbox size={32} className="text-[#7a7a7a]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1d1d1f] mb-1">
                No hay tareas con este filtro
              </h3>
              <p className="text-[13px] text-[#7a7a7a]">
                Intenta con otro filtro o crea una nueva tarea
              </p>
            </div>
          ) : view === 'list' ? (
            <TaskListView tasks={filteredTasks} columns={columns} canEdit={canEdit} canComment={canComment} />
          ) : (
            <KanbanBoard initialTasks={filteredTasks} boardId={boardId} boardOwnerId={boardOwnerId} canEdit={canEdit} canComment={canComment} columns={columns} />
          )}
        </>
      )}
    </div>
  );
}
