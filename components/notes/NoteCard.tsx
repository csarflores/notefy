'use client';

import { INote } from '@/types';
import { FileText, Lock, Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface NoteCardProps {
  note: INote;
  onOpenNote: () => void;
  isOwner?: boolean;
}

export default function NoteCard({ note, onOpenNote, isOwner = true }: NoteCardProps) {
  const [preview, setPreview] = useState('');

  // Extraer texto plano del contenido HTML para el preview
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = note.content;
      const text = tempDiv.textContent || tempDiv.innerText || '';
      setPreview(text.length > 100 ? text.substring(0, 100) + '...' : text);
    }
  }, [note.content]);

  const timeAgo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' }).format(
    Math.round((new Date(note.updatedAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    'day'
  );

  return (
    <div
      onClick={onOpenNote}
      className={cn(
        'bg-white border border-gray-200 rounded-lg p-3 cursor-pointer',
        'hover:border-blue-300 hover:shadow-lg transition-all duration-200',
        'group'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-[13px] font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {note.title}
        </h3>
        <div className="flex items-center gap-1 ml-2">
          {note.visibility === 'private' ? (
            <Lock className="w-3 h-3 text-gray-400" />
          ) : (
            <Users className="w-3 h-3 text-blue-500" />
          )}
        </div>
      </div>

      <p className="text-gray-600 text-[11px] mb-2.5 line-clamp-2 min-h-[36px]">
        {preview || 'Sin contenido'}
      </p>

      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>{timeAgo}</span>
        </div>
        {note.members.length > 0 && (
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{note.members.length + 1}</span>
          </div>
        )}
      </div>
    </div>
  );
}
