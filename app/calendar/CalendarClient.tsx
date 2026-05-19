'use client';

import { useState } from 'react';
import { ITask } from '@/types';
import TaskCalendar from '@/components/calendar/TaskCalendar';
import UpcomingTasks from '@/components/calendar/UpcomingTasks';
import EditTaskModal from '@/components/kanban/EditTaskModal';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { updateTaskDeliveryDate } from '@/actions/calendar-actions';

interface CalendarClientProps {
  initialTasks: ITask[];
  upcomingTasks: ITask[];
  overdueTasks: ITask[];
  userId: string;
}

export default function CalendarClient({ initialTasks, upcomingTasks, overdueTasks, userId }: CalendarClientProps) {
  const [tasks, setTasks] = useState<ITask[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'upcoming' | 'overdue'>('calendar');

  const handleTaskClick = (task: ITask) => {
    setSelectedTask(task);
    setShowEditModal(true);
  };

  const handleEventDrop = async (task: ITask, newDate: Date) => {
    try {
      const result = await updateTaskDeliveryDate(task._id.toString(), newDate);
      if (result.success) {
        // Recargar la página para obtener datos actualizados
        window.location.reload();
      }
    } catch (error) {
      console.error('Error al actualizar fecha de entrega:', error);
    }
  };

  const handleTaskUpdate = () => {
    // Recargar la página para obtener datos actualizados
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Tabs de navegación */}
      <div className="flex items-center gap-2 bg-white rounded-xl border border-[#e0e0e0] p-1">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'calendar'
              ? 'bg-[#0066cc] text-white'
              : 'text-[#7a7a7a] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
          }`}
        >
          <Calendar size={16} />
          Calendario
        </button>
        
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'upcoming'
              ? 'bg-[#0066cc] text-white'
              : 'text-[#7a7a7a] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
          }`}
        >
          <Clock size={16} />
          Próximas a Vencer
          {upcomingTasks.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
              {upcomingTasks.length}
            </span>
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'overdue'
              ? 'bg-[#0066cc] text-white'
              : 'text-[#7a7a7a] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
          }`}
        >
          <AlertCircle size={16} />
          Vencidas
          {overdueTasks.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-red-500 rounded-full text-xs">
              {overdueTasks.length}
            </span>
          )}
        </button>
      </div>

      {/* Contenido según el tab activo */}
      {activeTab === 'calendar' && (
        <TaskCalendar
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onEventDrop={handleEventDrop}
        />
      )}

      {activeTab === 'upcoming' && (
        <UpcomingTasks
          tasks={upcomingTasks}
          onTaskClick={handleTaskClick}
        />
      )}

      {activeTab === 'overdue' && (
        <UpcomingTasks
          tasks={overdueTasks}
          onTaskClick={handleTaskClick}
        />
      )}

      {/* Modal de edición de tarea */}
      {selectedTask && (
        <EditTaskModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
        />
      )}
    </div>
  );
}
