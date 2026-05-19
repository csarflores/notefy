'use client';

import { useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ITask } from '@/types';
import CalendarEvent from './CalendarEvent';
import CalendarFilters, { CalendarFilters as CalendarFiltersType } from './CalendarFilters';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Configuración del localizador para date-fns
const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface TaskCalendarProps {
  tasks: ITask[];
  onTaskClick?: (task: ITask) => void;
  onEventDrop?: (task: ITask, newDate: Date) => void;
}

export default function TaskCalendar({ tasks, onTaskClick, onEventDrop }: TaskCalendarProps) {
  const router = useRouter();
  const [view, setView] = useState<string>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [filters, setFilters] = useState<CalendarFiltersType>({
    status: 'all',
    projectId: 'all',
    boardId: 'all',
    assignedTo: 'all',
  });

  // Convertir tareas a eventos del calendario
  const events = tasks
    .filter(task => {
      if (!task.deliveryDate) return false;
      
      // Aplicar filtros
      if (filters.status !== 'all' && task.status !== filters.status) return false;
      
      // Filtrar por proyecto
      if (filters.projectId !== 'all') {
        const taskProjectId = (task.boardId as any)?.projectId?.toString();
        if (taskProjectId !== filters.projectId) return false;
      }
      
      // Filtrar por tablero
      if (filters.boardId !== 'all') {
        const taskBoardId = task.boardId._id?.toString();
        if (taskBoardId !== filters.boardId) return false;
      }
      
      return true;
    })
    .map(task => ({
      id: task._id.toString(),
      title: task.title,
      start: new Date(task.deliveryDate!),
      end: new Date(task.deliveryDate!),
      allDay: true,
      resource: task,
    }));

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: string) => {
    setView(newView);
  }, []);

  const handleEventClick = useCallback((event: any) => {
    if (onTaskClick) {
      onTaskClick(event.resource);
    } else {
      // Navegar al tablero de la tarea
      const boardId = event.resource.boardId._id.toString();
      router.push(`/board/${boardId}`);
    }
  }, [onTaskClick, router]);

  const handleEventDrop = useCallback(({ event, start }: any) => {
    if (onEventDrop) {
      onEventDrop(event.resource, start);
    }
  }, [onEventDrop]);

  const handleFilterChange = useCallback((newFilters: CalendarFiltersType) => {
    setFilters(newFilters);
  }, []);

  // Componente personalizado para la toolbar
  const CustomToolbar = useCallback((toolbar: any) => {
    const { label, onNavigate, onView } = toolbar;

    return (
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#e0e0e0]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('PREV')}
            className="p-2 rounded-lg hover:bg-[#f5f5f7] transition-colors"
          >
            <ChevronLeft size={20} className="text-[#7a7a7a]" />
          </button>
          
          <button
            onClick={() => onNavigate('TODAY')}
            className="px-3 py-2 rounded-lg hover:bg-[#f5f5f7] transition-colors text-sm font-medium text-[#1d1d1f]"
          >
            Hoy
          </button>
          
          <button
            onClick={() => onNavigate('NEXT')}
            className="p-2 rounded-lg hover:bg-[#f5f5f7] transition-colors"
          >
            <ChevronRight size={20} className="text-[#7a7a7a]" />
          </button>
          
          <h2 className="text-lg font-semibold text-[#1d1d1f] ml-2">
            {label}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#f5f5f7] rounded-lg p-1">
            <button
              onClick={() => onView(Views.MONTH)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === Views.MONTH
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#7a7a7a] hover:text-[#1d1d1f]'
              }`}
            >
              <CalendarIcon size={14} className="inline mr-1" />
              Mes
            </button>
            
            <button
              onClick={() => onView(Views.WEEK)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === Views.WEEK
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#7a7a7a] hover:text-[#1d1d1f]'
              }`}
            >
              Semana
            </button>
            
            <button
              onClick={() => onView(Views.DAY)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === Views.DAY
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#7a7a7a] hover:text-[#1d1d1f]'
              }`}
            >
              Día
            </button>
            
            <button
              onClick={() => onView(Views.AGENDA)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === Views.AGENDA
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#7a7a7a] hover:text-[#1d1d1f]'
              }`}
            >
              <List size={14} className="inline mr-1" />
              Lista
            </button>
          </div>

          <CalendarFilters onFilterChange={handleFilterChange} />
        </div>
      </div>
    );
  }, [view, handleFilterChange]);

  // Componente personalizado para el evento
  const EventComponent = useCallback((event: any) => {
    const task = event.resource || event;
    
    if (!task) {
      return <div className="p-2 text-xs">Evento</div>;
    }
    
    const boardColor = (task.boardId as any)?.color || '#6b7280';
    
    // Convertir color hex a RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const rgb = hexToRgb(boardColor);
    const bgColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)` : 'rgba(107, 114, 128, 0.2)';
    
    // Calcular luminosidad para determinar color de texto
    const luminance = rgb ? (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255 : 0.5;
    const textColor = luminance > 0.5 ? '#1d1d1f' : '#ffffff';
    
    const borderColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)` : 'rgba(107, 114, 128, 0.5)';
    
    const boardName = (task.boardId as any)?.name || 'Sin tablero';
    
    return (
      <div
        className="p-2 rounded-lg border cursor-pointer hover:shadow-md transition-all"
        style={{
          backgroundColor: bgColor,
          color: textColor,
          borderColor: borderColor,
        }}
      >
        <div className="text-sm font-medium mb-1 truncate">{task.title}</div>
        <div className="text-xs opacity-75 truncate">{boardName}</div>
      </div>
    );
  }, [handleEventClick]);

  return (
    <div className="bg-white rounded-xl border border-[#e0e0e0] p-6">
      <Calendar
        {...{
          localizer,
          events,
          startAccessor: "start",
          endAccessor: "end",
          onNavigate: handleNavigate,
          onView: handleViewChange,
          date,
          view,
          components: {
            toolbar: CustomToolbar,
            event: EventComponent,
          },
          onSelectEvent: handleEventClick,
          onDrop: handleEventDrop,
          resizable: true,
          selectable: true,
          culture: "es",
          messages: {
            today: 'Hoy',
            previous: 'Anterior',
            next: 'Siguiente',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            agenda: 'Lista',
            date: 'Fecha',
            time: 'Hora',
            event: 'Evento',
            noEventsInRange: 'No hay eventos en este rango',
            showMore: (count: number) => `+${count} más`,
          },
          style: { height: 600 },
          className: "rbc-calendar",
        } as any}
      />
    </div>
  );
}
