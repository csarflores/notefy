'use client';

import { useState, useEffect } from 'react';
import TaskCalendar from '@/components/calendar/TaskCalendar';
import EditTaskModal from '@/components/kanban/EditTaskModal';
import { ITask } from '@/types';
import { getProjectTasksWithDeliveryDate, updateTaskDeliveryDate } from '@/actions/calendar-actions';

interface ProjectCalendarClientProps {
  projectId: string;
  userId: string;
}

export default function ProjectCalendarClient({ projectId, userId }: ProjectCalendarClientProps) {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadTasks = async () => {
    try {
      const result = await getProjectTasksWithDeliveryDate(projectId, userId);
      if (result.success && result.data) {
        setTasks(result.data);
      }
    } catch (error) {
      console.error('Error al cargar tareas del proyecto:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [projectId, userId]);

  const handleTaskClick = (task: ITask) => {
    if (!task) {
      console.error('Task is undefined', task);
      return;
    }
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleTaskUpdated = () => {
    loadTasks();
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

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#e0e0e0] p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#f5f5f7] rounded-lg w-1/4" />
          <div className="h-96 bg-[#f5f5f7] rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <>
      <TaskCalendar
        tasks={tasks}
        onTaskClick={handleTaskClick}
        onEventDrop={handleEventDrop}
        hideProjectFilter
      />
      {selectedTask && (
        <EditTaskModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          task={selectedTask}
        />
      )}
    </>
  );
}
