'use client';

import { ITask } from '@/types';
import { Calendar, Clock, Users } from 'lucide-react';

interface CalendarEventProps {
  task: ITask;
  onClick?: () => void;
}

export default function CalendarEvent({ task, onClick }: CalendarEventProps) {
  if (!task) return null;
  
  const assignedUsers = (task.assignedTo || []) as unknown as { name: string; email: string; image?: string }[];
  
  // Obtener el color del tablero si está disponible
  const boardColor = (task.boardId as any)?.color || '#6b7280';
  
  // Convertir color hex a RGB para poder usar opacidad
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
  const textColor = '#1d1d1f'; // Color oscuro para mejor legibilidad
  const borderColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)` : 'rgba(107, 114, 128, 0.5)';

  return (
    <div
      onClick={onClick}
      className="p-2 rounded-lg border cursor-pointer hover:shadow-md transition-all"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        borderColor: borderColor,
      }}
    >
      <div className={`font-semibold text-sm mb-1 truncate${task.status === 'done' ? ' line-through opacity-60' : ''}`}>{task.title}</div>
      
      <div className="flex items-center gap-2 text-[10px] opacity-75">
        {task.deliveryDate && (
          <div className="flex items-center gap-1">
            <Calendar size={10} />
            <span>{new Date(task.deliveryDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
          </div>
        )}
        
        {task.dueDate && (
          <div className="flex items-center gap-1">
            <Clock size={10} />
            <span>Máx: {new Date(task.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
          </div>
        )}
      </div>

      {assignedUsers && assignedUsers.length > 0 && (
        <div className="flex items-center gap-1 mt-1 text-[10px] opacity-75">
          <Users size={10} />
          <span className="truncate">{assignedUsers.length} asignado(s)</span>
        </div>
      )}
    </div>
  );
}
