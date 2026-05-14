'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { updateTask } from '@/actions/task-actions';
import { ITag, ITask } from '@/types';
import { X, Plus } from 'lucide-react';
import { generateRandomColor } from '@/lib/utils';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ITask;
}

export default function EditTaskModal({ isOpen, onClose, task }: EditTaskModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'todo' | 'in-progress' | 'done'>('todo');
  const [tags, setTags] = useState<ITag[]>([]);
  const [newTagText, setNewTagText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Inicializar con datos de la tarea
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setTags(task.tags || []);
    }
  }, [task]);

  const handleAddTag = () => {
    if (newTagText.trim() && tags.length < 5) {
      setTags([
        ...tags,
        {
          text: newTagText.trim(),
          color: generateRandomColor(),
        },
      ]);
      setNewTagText('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('El título es requerido');
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateTask(task._id.toString(), {
        title: title.trim(),
        description: description.trim(),
        status,
        tags,
      });

      if (result.success) {
        onClose();
        router.refresh();
      } else {
        setError(result.error || 'Error al actualizar la tarea');
      }
    } catch (err) {
      setError('Error inesperado al actualizar la tarea');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Editar Tarea">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Título */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-[#1d1d1f] mb-2">
            Título de la tarea
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Diseñar pantalla de login"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none transition-all text-[#1d1d1f] placeholder:text-gray-400"
            disabled={isLoading}
            autoFocus
          />
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-[#1d1d1f] mb-2">
            Descripción (opcional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Agrega detalles sobre la tarea..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none transition-all text-[#1d1d1f] placeholder:text-gray-400 resize-none"
            disabled={isLoading}
          />
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
            Estado
          </label>
          <div className="flex gap-2">
            {[
              { value: 'todo', label: 'Pendiente' },
              { value: 'in-progress', label: 'En Proceso' },
              { value: 'done', label: 'Finalizado' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value as any)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  status === option.value
                    ? 'bg-[#0066cc] text-white'
                    : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-gray-200'
                }`}
                disabled={isLoading}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
            Etiquetas (máximo 5)
          </label>
          
          {/* Tags existentes */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag, index) => (
                <div key={index} className="inline-flex items-center gap-1">
                  <Badge variant="tag" color={tag.color}>
                    {tag.text}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input para nuevo tag */}
          {tags.length < 5 && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagText}
                onChange={(e) => setNewTagText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Agregar etiqueta..."
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none transition-all text-sm"
                disabled={isLoading}
                maxLength={30}
              />
              <Button
                type="button"
                onClick={handleAddTag}
                disabled={!newTagText.trim() || isLoading}
                size="sm"
              >
                <Plus size={16} />
              </Button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading} className="flex-1">
            Guardar Cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
}
