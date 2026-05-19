'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';

interface CalendarFiltersProps {
  onFilterChange: (filters: CalendarFilters) => void;
}

export interface CalendarFilters {
  status?: 'todo' | 'in-progress' | 'done' | 'all';
  projectId?: string | 'all';
  boardId?: string | 'all';
  assignedTo?: string | 'all';
}

export default function CalendarFilters({ onFilterChange }: CalendarFiltersProps) {
  const [filters, setFilters] = useState<CalendarFilters>({
    status: 'all',
    projectId: 'all',
    boardId: 'all',
    assignedTo: 'all',
  });

  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (key: keyof CalendarFilters, value: string) => {
    const newFilters = { ...filters, [key]: value === 'all' ? 'all' : value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: CalendarFilters = {
      status: 'all',
      projectId: 'all',
      boardId: 'all',
      assignedTo: 'all',
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== 'all');

  return (
    <div className="relative">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
          showFilters || hasActiveFilters
            ? 'bg-[#0066cc] text-white border-[#0066cc]'
            : 'bg-white text-[#1d1d1f] border-[#e0e0e0] hover:border-[#7a7a7a]'
        }`}
      >
        <Filter size={16} />
        <span className="text-sm font-medium">Filtros</span>
        {hasActiveFilters && (
          <span className="w-2 h-2 bg-white rounded-full" />
        )}
      </button>

      {showFilters && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-[#e0e0e0] p-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#1d1d1f]">Filtros</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-[#0066cc] hover:underline flex items-center gap-1"
              >
                <X size={12} />
                Limpiar
              </button>
            )}
          </div>

          <div className="space-y-3">
            {/* Estado */}
            <div>
              <label className="block text-xs font-medium text-[#7a7a7a] mb-1">
                Estado
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-[#e0e0e0] text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]/20 outline-none"
              >
                <option value="all">Todos</option>
                <option value="todo">Por hacer</option>
                <option value="in-progress">En progreso</option>
                <option value="done">Completado</option>
              </select>
            </div>

            {/* Proyecto - Placeholder para cuando se implemente */}
            <div>
              <label className="block text-xs font-medium text-[#7a7a7a] mb-1">
                Proyecto
              </label>
              <select
                value={filters.projectId}
                onChange={(e) => handleFilterChange('projectId', e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-[#e0e0e0] text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]/20 outline-none"
              >
                <option value="all">Todos los proyectos</option>
                {/* Se llenará dinámicamente */}
              </select>
            </div>

            {/* Tablero - Placeholder para cuando se implemente */}
            <div>
              <label className="block text-xs font-medium text-[#7a7a7a] mb-1">
                Tablero
              </label>
              <select
                value={filters.boardId}
                onChange={(e) => handleFilterChange('boardId', e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-[#e0e0e0] text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]/20 outline-none"
              >
                <option value="all">Todos los tableros</option>
                {/* Se llenará dinámicamente */}
              </select>
            </div>

            {/* Asignado a - Placeholder para cuando se implemente */}
            <div>
              <label className="block text-xs font-medium text-[#7a7a7a] mb-1">
                Asignado a
              </label>
              <select
                value={filters.assignedTo}
                onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-[#e0e0e0] text-xs text-[#1d1d1f] focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]/20 outline-none"
              >
                <option value="all">Todos</option>
                {/* Se llenará dinámicamente */}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
