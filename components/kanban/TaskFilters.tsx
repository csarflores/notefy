'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { IUser, ITag } from '@/types';
import Badge from '@/components/ui/Badge';

export type FilterType = 'all' | 'my-tasks' | 'todo' | 'in-progress' | 'done' | string;

interface TaskFiltersProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  currentUserId?: string;
  projectUsers?: IUser[];
  projectTags?: ITag[];
}

export default function TaskFilters({ 
  currentFilter, 
  onFilterChange,
  currentUserId,
  projectUsers = [],
  projectTags = []
}: TaskFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const filters = [
    { id: 'all', label: 'Todas', icon: null },
    { id: 'my-tasks', label: 'Mis tareas', icon: null, requiresUser: true },
    { id: 'todo', label: 'Pendientes', icon: null },
    { id: 'in-progress', label: 'En proceso', icon: null },
    { id: 'done', label: 'Finalizadas', icon: null },
  ];

  const handleFilterClick = (filterId: string) => {
    onFilterChange(filterId);
    setShowFilters(false);
  };

  const activeFilter = filters.find(f => f.id === currentFilter) || 
                       projectUsers.find(u => u._id.toString() === currentFilter) ||
                       projectTags.find(t => t.text === currentFilter);
  
  const activeLabel = activeFilter 
    ? ('label' in activeFilter ? activeFilter.label : ('name' in activeFilter ? activeFilter.name : activeFilter.text))
    : 'Todas';

  return (
    <div className="relative">
      {/* Botón de filtro */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-[12px] ${
          currentFilter !== 'all'
            ? 'border-[#0066cc] bg-[#0066cc]/5 text-[#0066cc]'
            : 'border-[#e0e0e0] text-[#7a7a7a] hover:border-[#7a7a7a]'
        }`}
      >
        <Filter size={14} />
        <span className="hidden sm:inline">{activeLabel}</span>
        {currentFilter !== 'all' && (
          <X 
            size={12} 
            onClick={(e) => {
              e.stopPropagation();
              onFilterChange('all');
            }}
            className="hover:text-[#0071e3]"
          />
        )}
      </button>

      {/* Panel de filtros */}
      {showFilters && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowFilters(false)}
          />
          
          {/* Menú de filtros */}
          <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-[#e0e0e0] py-2 z-50">
            {/* Filtros básicos */}
            <div className="px-2">
              <p className="text-[10px] font-semibold text-[#7a7a7a] px-2 mb-1 tracking-[-0.08px]">
                FILTROS
              </p>
              {filters.map((filter) => {
                if (filter.requiresUser && !currentUserId) return null;
                
                return (
                  <button
                    key={filter.id}
                    onClick={() => handleFilterClick(filter.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-[12px] transition-all tracking-[-0.12px] ${
                      currentFilter === filter.id
                        ? 'bg-[#0066cc]/10 text-[#0066cc] font-medium'
                        : 'text-[#1d1d1f] hover:bg-[#f5f5f7]'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {/* Filtros por etiqueta */}
            {projectTags.length > 0 && (
              <>
                <div className="h-px bg-[#e0e0e0] my-2" />
                <div className="px-2">
                  <p className="text-[10px] font-semibold text-[#7a7a7a] px-2 mb-1 tracking-[-0.08px]">
                    POR ETIQUETA
                  </p>
                  <div className="px-2 py-1">
                    <div className="flex flex-wrap gap-1.5">
                      {projectTags.map((tag, index) => (
                        <button
                          key={index}
                          onClick={() => handleFilterClick(tag.text)}
                          className={`transition-all ${
                            currentFilter === tag.text
                              ? 'ring-2 ring-[#0066cc] ring-offset-1'
                              : 'hover:opacity-80'
                          }`}
                        >
                          <Badge variant="tag" color={tag.color} className="text-[10px]">
                            {tag.text}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Filtros por miembro */}
            {projectUsers.length > 0 && (
              <>
                <div className="h-px bg-[#e0e0e0] my-2" />
                <div className="px-2">
                  <p className="text-[10px] font-semibold text-[#7a7a7a] px-2 mb-1 tracking-[-0.08px]">
                    POR MIEMBRO
                  </p>
                  {projectUsers.map((user) => (
                    <button
                      key={user._id.toString()}
                      onClick={() => handleFilterClick(user._id.toString())}
                      className={`w-full text-left px-3 py-2 rounded-lg text-[12px] transition-all tracking-[-0.12px] ${
                        currentFilter === user._id.toString()
                          ? 'bg-[#0066cc]/10 text-[#0066cc] font-medium'
                          : 'text-[#1d1d1f] hover:bg-[#f5f5f7]'
                      }`}
                    >
                      {user.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
