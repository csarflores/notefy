'use client';

import { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import type { View, EventProps, ToolbarProps, CalendarProps } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import type { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ITask } from '@/types';
import CalendarFilters, { CalendarFilters as CalendarFiltersType, FilterOption } from './CalendarFilters';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Evento del calendario: envuelve la tarea en el recurso
interface TaskCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: ITask;
}

// boardId/assignedTo vienen "populated" en runtime aunque el tipo base sea ObjectId
interface PopulatedRef {
  _id?: { toString(): string };
  name?: string;
  toString(): string;
}

interface PopulatedBoard {
  _id?: { toString(): string };
  name?: string;
  color?: string;
  projectId?: PopulatedRef | null;
}

const getBoard = (task: ITask): PopulatedBoard | undefined =>
  task.boardId as unknown as PopulatedBoard | undefined;

const getAssignees = (task: ITask): (PopulatedRef | string)[] =>
  task.assignedTo as unknown as (PopulatedRef | string)[];

const getRefId = (ref: PopulatedRef | string | null | undefined): string | undefined => {
  if (!ref) return undefined;
  if (typeof ref === 'string') return ref;
  return ref._id?.toString() ?? ref.toString();
};

const DnDCalendar = withDragAndDrop<TaskCalendarEvent>(
  Calendar as unknown as React.ComponentType<CalendarProps<TaskCalendarEvent>>
);

const locales = { 'es': es };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const VIEWS = [
  { key: Views.MONTH, label: 'Mes' },
  { key: Views.WEEK, label: 'Semana' },
  { key: Views.DAY, label: 'Día' },
  { key: Views.AGENDA, label: 'Lista' },
];

interface TaskCalendarProps {
  tasks: ITask[];
  onTaskClick?: (task: ITask) => void;
  onEventDrop?: (task: ITask, newDate: Date) => void;
  hideProjectFilter?: boolean;
}

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
};

export default function TaskCalendar({ tasks, onTaskClick, onEventDrop, hideProjectFilter = false }: TaskCalendarProps) {
  const router = useRouter();
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [filters, setFilters] = useState<CalendarFiltersType>({
    status: 'all',
    projectId: 'all',
    boardId: 'all',
    assignedTo: 'all',
  });

  const projects = useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();
    tasks.forEach(task => {
      const project = getBoard(task)?.projectId;
      const projectId = getRefId(project);
      if (project && typeof project === 'object' && projectId && project.name) {
        map.set(projectId, project.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const boards = useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();
    tasks.forEach(task => {
      const board = getBoard(task);
      if (board?._id && board?.name) {
        map.set(board._id.toString(), board.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const users = useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();
    tasks.forEach(task => {
      const assigned = getAssignees(task);
      assigned.forEach(user => {
        const uid = getRefId(user);
        const name = typeof user === 'object' ? user.name : undefined;
        if (uid && name) map.set(uid, name);
      });
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const events: TaskCalendarEvent[] = tasks
    .filter(task => {
      if (!task.deliveryDate) return false;
      if (filters.status !== 'all' && task.status !== filters.status) return false;
      if (filters.projectId !== 'all') {
        const taskProjectId = getRefId(getBoard(task)?.projectId);
        if (taskProjectId !== filters.projectId) return false;
      }
      if (filters.boardId !== 'all') {
        const taskBoardId = getBoard(task)?._id?.toString();
        if (taskBoardId !== filters.boardId) return false;
      }
      if (filters.assignedTo !== 'all') {
        const isAssigned = getAssignees(task).some(user => getRefId(user) === filters.assignedTo);
        if (!isAssigned) return false;
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

  const handleNavigate = useCallback((newDate: Date) => setDate(newDate), []);
  const handleViewChange = useCallback((newView: View) => setView(newView), []);
  const handleFilterChange = useCallback((newFilters: CalendarFiltersType) => setFilters(newFilters), []);

  const handleEventClick = useCallback((event: TaskCalendarEvent) => {
    if (onTaskClick) {
      onTaskClick(event.resource);
    } else {
      const boardId = getBoard(event.resource)?._id?.toString();
      if (boardId) router.push(`/board/${boardId}`);
    }
  }, [onTaskClick, router]);

  const handleEventDrop = useCallback(({ event, start }: EventInteractionArgs<TaskCalendarEvent>) => {
    if (onEventDrop) {
      onEventDrop(event.resource, start instanceof Date ? start : new Date(start));
    }
  }, [onEventDrop]);

  const CustomToolbar = useCallback((toolbar: ToolbarProps<TaskCalendarEvent>) => {
    const { label, onNavigate, onView } = toolbar;
    return (
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e0e0e0]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onNavigate('PREV')}
            className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors text-[#7a7a7a] hover:text-[#1d1d1f]"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => onNavigate('TODAY')}
            className="px-3 py-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors text-[13px] font-medium text-[#1d1d1f]"
          >
            Hoy
          </button>
          <button
            onClick={() => onNavigate('NEXT')}
            className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors text-[#7a7a7a] hover:text-[#1d1d1f]"
          >
            <ChevronRight size={18} />
          </button>
          <h2 className="text-[15px] font-semibold text-[#1d1d1f] ml-2 capitalize">{label}</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#f5f5f7] rounded-lg p-0.5">
            {VIEWS.map(v => (
              <button
                key={v.key}
                onClick={() => onView(v.key)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                  view === v.key
                    ? 'bg-white text-[#1d1d1f] shadow-sm'
                    : 'text-[#7a7a7a] hover:text-[#1d1d1f]'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <CalendarFilters onFilterChange={handleFilterChange} projects={projects} boards={boards} users={users} hideProjectFilter={hideProjectFilter} />
        </div>
      </div>
    );
  }, [view, handleFilterChange, projects, boards, users, hideProjectFilter]);

  // Compact pill event — single line with colored dot
  const EventComponent = useCallback(({ event }: EventProps<TaskCalendarEvent>) => {
    const task = event.resource;
    if (!task) return null;
    const boardColor = getBoard(task)?.color || '#6b7280';
    const isDone = task.status === 'done';
    return (
      <div className="cal-event-pill" title={task.title}>
        <span className="cal-event-dot" style={{ backgroundColor: boardColor }} />
        <span className={`cal-event-title${isDone ? ' line-through opacity-60' : ''}`}>{task.title}</span>
      </div>
    );
  }, []);

  // For week/day views, show a richer card
  const AgendaEvent = useCallback(({ event }: EventProps<TaskCalendarEvent>) => {
    const task = event.resource;
    if (!task) return null;
    const board = getBoard(task);
    const boardColor = board?.color || '#6b7280';
    const boardName = board?.name || 'Sin tablero';
    const rgb = hexToRgb(boardColor);
    const bg = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.08)` : 'rgba(107,114,128,0.08)';
    const isDone = task.status === 'done';
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
        style={{ backgroundColor: bg, borderLeft: `3px solid ${boardColor}` }}
        title={task.title}
      >
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-medium text-[#1d1d1f] truncate${isDone ? ' line-through opacity-60' : ''}`}>{task.title}</div>
          <div className="text-[11px] text-[#7a7a7a] truncate">{boardName}</div>
        </div>
      </div>
    );
  }, []);

  return (
    <div className="bg-white rounded-xl border border-[#e0e0e0] p-5">
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        onNavigate={handleNavigate}
        onView={handleViewChange}
        date={date}
        view={view}
        components={{
          toolbar: CustomToolbar,
          event: EventComponent,
          agenda: { event: AgendaEvent },
        }}
        onSelectEvent={handleEventClick}
        onEventDrop={handleEventDrop}
        draggableAccessor={() => true}
        resizable={false}
        selectable
        culture="es"
        messages={{
          today: 'Hoy',
          previous: 'Anterior',
          next: 'Siguiente',
          month: 'Mes',
          week: 'Semana',
          day: 'Día',
          agenda: 'Lista',
          date: 'Fecha',
          time: 'Hora',
          event: 'Tarea',
          noEventsInRange: 'Sin tareas en este período',
          showMore: (count: number) => `+${count} más`,
        }}
        style={{ height: 640 }}
        className="rbc-calendar"
        popup
      />
    </div>
  );
}
