'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { createTask } from '@/actions/task-actions';
import { ITask } from '@/types';

interface AddTaskComposerProps {
  boardId: string;
  status: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (task: ITask) => void;
}

// Composer inline al pie de cada columna (estilo "agregar tarjeta").
// Enter crea y mantiene el composer abierto para seguir agregando.
export default function AddTaskComposer({
  boardId,
  status,
  open,
  onOpenChange,
  onCreated,
}: AddTaskComposerProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed || isCreating) return;
    setError('');
    setIsCreating(true);
    try {
      const result = await createTask({ title: trimmed, boardId, status });
      if (result.success && result.data) {
        setTitle('');
        onCreated?.(result.data);
        router.refresh();
        inputRef.current?.focus();
      } else {
        setError(result.error || 'Error al crear la tarea');
      }
    } catch {
      setError('Error al crear la tarea');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setError('');
    onOpenChange(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="flex items-center gap-1.5 w-full px-2.5 py-2 rounded-lg text-[12px] text-[#8e8e93] hover:bg-[#f5f5f7] hover:text-[#3a3a3c] transition-all"
      >
        <Plus size={14} />
        Nueva tarea
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[#e5e5ea] bg-white p-2 shadow-sm">
      <textarea
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCreate();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
          }
        }}
        rows={2}
        className="w-full text-[13px] text-[#1d1d1f] placeholder:text-[#c7c7cc] border-none outline-none bg-transparent resize-none"
        placeholder="Título de la tarea..."
        disabled={isCreating}
      />
      {error && <p className="text-[11px] text-red-500 mb-1.5">{error}</p>}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!title.trim() || isCreating}
          className="px-3 py-1.5 rounded-lg bg-[#0066cc] text-white text-[12px] font-medium hover:bg-[#0055aa] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isCreating ? 'Creando…' : 'Agregar'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isCreating}
          className="p-1.5 rounded-lg text-[#8e8e93] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-all disabled:opacity-40"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
