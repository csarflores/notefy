'use client';

import { useState } from 'react';
import { ITask } from '@/types';
import TaskCalendar from '@/components/calendar/TaskCalendar';
import UpcomingTasks from '@/components/calendar/UpcomingTasks';
import TaskDetailPanel from '@/components/kanban/TaskDetailPanel';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { updateTaskDeliveryDate } from '@/actions/calendar-actions';
import { getMyTaskPermissions } from '@/actions/task-actions';

interface CalendarClientProps {
  initialTasks: ITask[];
  upcomingTasks: ITask[];
  overdueTasks: ITask[];
}

export default function CalendarClient({ initialTasks, upcomingTasks, overdueTasks }: CalendarClientProps) {
  const [tasks, setTasks] = useState<ITask[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'upcoming' | 'overdue'>('calendar');
  const [taskPerms, setTaskPerms] = useState({ canEdit: false, canComment: false });

  const handleTaskClick = async (task: ITask) => {
    setTaskPerms({ canEdit: false, canComment: false });
    setSelectedTask(task);
    setShowEditModal(true);
    const result = await getMyTaskPermissions(task._id.toString());
    if (result.success && result.data) {
      setTaskPerms(result.data);
    }
  };

  const handleEventDrop = async (task: ITask, newDate: Date) => {
    const prevTasks = tasks;
    setTasks(prev =>
      prev.map(t =>
        t._id.toString() === task._id.toString()
          ? { ...t, deliveryDate: newDate }
          : t
      ) as ITask[]
    );
    try {
      const result = await updateTaskDeliveryDate(task._id.toString(), newDate);
      if (!result.success) setTasks(prevTasks);
    } catch {
      setTasks(prevTasks);
    }
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

      {/* Panel de edición de tarea */}
      {selectedTask && (
        <TaskDetailPanel
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          canEdit={taskPerms.canEdit}
          canComment={taskPerms.canComment}
        />
      )}
    </div>
  );
}
