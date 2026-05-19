'use client';

import { ITask } from '@/types';
import { Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';

interface UpcomingTasksProps {
  tasks: ITask[];
  onTaskClick?: (task: ITask) => void;
}

export default function UpcomingTasks({ tasks, onTaskClick }: UpcomingTasksProps) {
  const getDaysUntilDue = (deliveryDate: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(deliveryDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyColor = (days: number) => {
    if (days < 0) return 'text-red-600 bg-red-50 border-red-200';
    if (days === 0) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (days <= 2) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (days <= 7) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getUrgencyIcon = (days: number) => {
    if (days < 0) return <AlertCircle size={16} />;
    if (days === 0) return <Clock size={16} />;
    return <Calendar size={16} />;
  };

  const getUrgencyLabel = (days: number) => {
    if (days < 0) return 'Vencida';
    if (days === 0) return 'Vence hoy';
    if (days === 1) return 'Vence mañana';
    return `Vence en ${days} días`;
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.deliveryDate || !b.deliveryDate) return 0;
    return new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime();
  });

  if (sortedTasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#e0e0e0] p-8 text-center">
        <Calendar size={48} className="mx-auto mb-4 text-[#e0e0e0]" />
        <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2">
          No hay tareas próximas
        </h3>
        <p className="text-sm text-[#7a7a7a]">
          ¡Buen trabajo! No tienes tareas con fecha de entrega próxima.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#e0e0e0] p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#1d1d1f]">
          Tareas Próximas a Vencer
        </h2>
        <span className="text-sm text-[#7a7a7a]">
          {sortedTasks.length} tarea{sortedTasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {sortedTasks.map((task) => {
          if (!task.deliveryDate) return null;
          
          const daysUntil = getDaysUntilDue(task.deliveryDate);
          const urgencyColor = getUrgencyColor(daysUntil);
          const urgencyIcon = getUrgencyIcon(daysUntil);
          const urgencyLabel = getUrgencyLabel(daysUntil);
          const assignedUsers = task.assignedTo as unknown as { name: string; email: string; image?: string }[];

          return (
            <div
              key={task._id.toString()}
              onClick={() => onTaskClick?.(task)}
              className="p-4 rounded-lg border border-[#e0e0e0] hover:border-[#0066cc] hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[#1d1d1f] mb-2 truncate">
                    {task.title}
                  </h3>
                  
                  <div className="flex items-center gap-3 text-xs">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${urgencyColor}`}>
                      {urgencyIcon}
                      <span className="font-medium">{urgencyLabel}</span>
                    </div>

                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-[#7a7a7a]">
                        <Clock size={12} />
                        <span>
                          Máx: {format(new Date(task.dueDate), 'dd MMM', { locale: es })}
                        </span>
                      </div>
                    )}
                  </div>

                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {task.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="tag" color={tag.color} className="text-[10px]">
                          {tag.text}
                        </Badge>
                      ))}
                      {task.tags.length > 3 && (
                        <span className="text-[10px] text-[#7a7a7a]">+{task.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {assignedUsers && assignedUsers.length > 0 && (
                    <div className="flex -space-x-2">
                      {assignedUsers.slice(0, 3).map((user) => (
                        <Avatar
                          key={user.email}
                          src={user.image}
                          name={user.name}
                          size="sm"
                        />
                      ))}
                      {assignedUsers.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-[#f5f5f7] border-2 border-white flex items-center justify-center">
                          <span className="text-[10px] font-medium text-[#7a7a7a]">
                            +{assignedUsers.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {task.status === 'done' && (
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircle size={12} />
                      <span>Completado</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
