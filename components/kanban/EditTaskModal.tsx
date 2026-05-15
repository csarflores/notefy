'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { updateTask } from '@/actions/task-actions';
import { getProjectUsers } from '@/actions/project-actions';
import { getProjectTags } from '@/actions/tag-actions';
import { ITag, ITask, IUser } from '@/types';
import { X, Plus, Check } from 'lucide-react';
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
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [projectUsers, setProjectUsers] = useState<IUser[]>([]);
  const [projectTags, setProjectTags] = useState<ITag[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const hasLoadedRef = useRef<string | null>(null);

  // Inicializar con datos de la tarea
  useEffect(() => {
    if (task && isOpen) {
      const loadKey = `${isOpen}-${task._id}`;
      if (hasLoadedRef.current !== loadKey) {
        setTitle(task.title);
        setDescription(task.description || '');
        setStatus(task.status);
        setTags(task.tags || []);
        setAssignedTo(task.assignedTo.map(id => id.toString()));
        setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
        setDeliveryDate(task.deliveryDate ? new Date(task.deliveryDate).toISOString().split('T')[0] : '');
        loadProjectData();
        hasLoadedRef.current = loadKey;
      }
    }
    if (!isOpen) {
      hasLoadedRef.current = null;
    }
  }, [task, isOpen]);

  const loadProjectData = async () => {
    if (!task?.projectId) return;

    const [usersResult, tagsResult] = await Promise.all([
      getProjectUsers(task.projectId.toString()),
      getProjectTags(task.projectId.toString()),
    ]);

    if (usersResult.success && usersResult.data) {
      setProjectUsers(usersResult.data);
    }

    if (tagsResult.success && tagsResult.data) {
      setProjectTags(tagsResult.data);
    }
  };

  const handleAddTag = () => {
    if (!newTagText.trim() || tags.length >= 5) return;

    const newTag = {
      text: newTagText.trim(),
      color: generateRandomColor(),
    };

    // Verificar si ya existe en las etiquetas del proyecto
    const tagExists = projectTags.some(
      (t) => t.text.toLowerCase() === newTag.text.toLowerCase()
    );

    if (!tagExists) {
      setProjectTags([...projectTags, newTag]);
    }
    
    setTags([...tags, newTag]);
    setNewTagText('');
  };

  const handleToggleTag = (tag: ITag) => {
    const isSelected = tags.some(t => t.text === tag.text);
    if (isSelected) {
      setTags(tags.filter(t => t.text !== tag.text));
    } else {
      if (tags.length < 5) {
        setTags([...tags, tag]);
      }
    }
  };

  const handleToggleUser = (userId: string) => {
    if (assignedTo.includes(userId)) {
      setAssignedTo(assignedTo.filter(id => id !== userId));
    } else {
      setAssignedTo([...assignedTo, userId]);
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
        assignedTo,
        dueDate: dueDate || null,
        deliveryDate: deliveryDate || null,
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
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Tarea">
      <form onSubmit={handleSubmit} className="space-y-2.5">
        {/* Título */}
        <div>
          <label htmlFor="title" className="block text-[13px] font-semibold text-[#1d1d1f] mb-1 tracking-[-0.224px]">
            Título
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-[#e0e0e0] focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]/20 outline-none transition-all text-[13px] text-[#1d1d1f]"
            placeholder="Nombre de la tarea"
            required
            disabled={isLoading}
          />
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="description" className="block text-[13px] font-semibold text-[#1d1d1f] mb-1 tracking-[-0.224px]">
            Descripción
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-[#e0e0e0] focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]/20 outline-none transition-all resize-none text-[13px] text-[#1d1d1f] max-h-20 overflow-y-auto"
            placeholder="Descripción de la tarea (opcional)"
            rows={3}
            disabled={isLoading}
          />
        </div>

        {/* Estado */}
        <div>
          <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1 tracking-[-0.224px]">
            Estado
          </label>
          <div className="flex gap-1.5">
          {[
            { value: 'todo', label: 'Pendiente' },
            { value: 'in-progress', label: 'En Proceso' },
            { value: 'done', label: 'Finalizado' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value as any)}
              className={`flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all tracking-[-0.12px] ${
                status === option.value
                  ? 'bg-[#0066cc] text-white'
                  : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e0e0e0]'
              }`}
              disabled={isLoading}
            >
              {option.label}
            </button>
          ))}
          </div>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="dueDate" className="block text-[12px] font-semibold text-[#1d1d1f] mb-1 tracking-[-0.224px]">
              Fecha Máximo
            </label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#e0e0e0] focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]/20 outline-none transition-all text-[11px] text-[#1d1d1f]"
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="deliveryDate" className="block text-[12px] font-semibold text-[#1d1d1f] mb-1 tracking-[-0.224px]">
              Fecha Entrega
            </label>
            <input
              id="deliveryDate"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#e0e0e0] focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]/20 outline-none transition-all text-[11px] text-[#1d1d1f]"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Asignar miembros */}
        <div>
          <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1 tracking-[-0.224px]">
            Asignar a
          </label>
          <div className="flex flex-wrap gap-1.5">
            {projectUsers.map((user) => (
              <button
                key={user._id.toString()}
                type="button"
                onClick={() => handleToggleUser(user._id.toString())}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${
                  assignedTo.includes(user._id.toString())
                    ? 'border-[#0066cc] bg-[#0066cc]/5'
                    : 'border-[#e0e0e0] hover:border-[#7a7a7a]'
                }`}
                disabled={isLoading}
              >
                <Avatar src={user.image} name={user.name} size="sm" />
                <span className="text-[12px] text-[#1d1d1f] tracking-[-0.12px]">{user.name}</span>
                {assignedTo.includes(user._id.toString()) && (
                  <Check size={12} className="text-[#0066cc]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1 tracking-[-0.224px]">
            Etiquetas (máx. 5)
          </label>
          
          {/* Etiquetas del proyecto */}
          {projectTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {projectTags.map((tag, index) => {
                const isSelected = tags.some(t => t.text === tag.text);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`inline-flex items-center gap-1 transition-all ${
                      isSelected ? 'opacity-100 scale-105' : 'opacity-60 hover:opacity-100'
                    }`}
                    disabled={isLoading || (!isSelected && tags.length >= 5)}
                  >
                    <Badge variant="tag" color={tag.color}>
                      {tag.text}
                    </Badge>
                    {isSelected && <Check size={12} className="text-[#0066cc]" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-[#7a7a7a] mb-1.5 tracking-[-0.12px]">No hay etiquetas en este proyecto</p>
          )}

          {/* Crear nueva etiqueta */}
          <div className="flex gap-1">
            <input
              type="text"
              value={newTagText}
              onChange={(e) => setNewTagText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#e0e0e0] focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]/20 outline-none transition-all text-[11px]"
              placeholder="Nueva etiqueta"
              maxLength={30}
              disabled={isLoading || tags.length >= 5}
            />
            <Button
              type="button"
              onClick={handleAddTag}
              variant="secondary"
              size="sm"
              disabled={!newTagText.trim() || isLoading || tags.length >= 5}
            >
              <Plus size={14} />
            </Button>
          </div>
          <p className="text-[10px] text-[#7a7a7a] mt-0.5">
            Las etiquetas se comparten con todas las tareas del proyecto
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-[12px] text-red-600 tracking-[-0.12px]">{error}</p>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            size="sm"
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            size="sm"
            className="flex-1"
          >
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
