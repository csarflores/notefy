'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import NoteEditor from '@/components/notes/NoteEditor';
import { createTask } from '@/actions/task-actions';
import { getBoardUsers } from '@/actions/board-actions';
import { getProjectTags } from '@/actions/tag-actions';
import { ITag, IUser } from '@/types';
import { X, Plus, Check } from 'lucide-react';
import { generateRandomColor } from '@/lib/utils';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string; // Still named projectId for compatibility, but used as boardId
  defaultStatus?: 'todo' | 'in-progress' | 'done';
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  projectId,
  defaultStatus = 'todo',
}: CreateTaskModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'todo' | 'in-progress' | 'done'>(defaultStatus);
  const [tags, setTags] = useState<ITag[]>([]);
  const [newTagText, setNewTagText] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [boardUsers, setBoardUsers] = useState<IUser[]>([]);
  const [projectTags, setProjectTags] = useState<ITag[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const hasLoadedRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isOpen && projectId) {
      if (hasLoadedRef.current !== `${isOpen}-${projectId}`) {
        loadProjectData();
        hasLoadedRef.current = `${isOpen}-${projectId}`;
      }
    }
    if (!isOpen) {
      hasLoadedRef.current = null;
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (isOpen) {
      setStatus(defaultStatus);
    }
  }, [isOpen, defaultStatus]);

  const loadProjectData = async () => {
    const [usersResult, tagsResult] = await Promise.all([
      getBoardUsers(projectId),
      getProjectTags(projectId),
    ]);

    if (usersResult.success && usersResult.data) {
      setBoardUsers(usersResult.data);
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

    // Check description length (HTML includes formatting tags)
    if (description.length > 50000) {
      setError('La descripción excede el límite de 50,000 caracteres. El editor de texto rico incluye etiquetas HTML de formato, negritas, enlaces, etc., que aumentan el conteo de caracteres. Intenta reducir el contenido o eliminar formato excesivo.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await createTask({
        title: title.trim(),
        description: description.trim(),
        boardId: projectId,
        status,
        tags,
        assignedTo,
        dueDate: dueDate || null,
        deliveryDate: deliveryDate || null,
      });

      if (result.success) {
        setTitle('');
        setDescription('');
        setTags([]);
        setAssignedTo([]);
        setDueDate('');
        setDeliveryDate('');
        setStatus('todo');
        onClose();
        router.refresh();
      } else {
        setError(result.error || 'Error al crear la tarea');
      }
    } catch (err) {
      setError('Error inesperado al crear la tarea');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setTitle('');
      setDescription('');
      setTags([]);
      setAssignedTo([]);
      setDueDate('');
      setDeliveryDate('');
      setStatus('todo');
      setError('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      headerContent={
        <div className="flex items-center justify-between px-5 py-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-[17px] font-semibold text-[#1d1d1f] tracking-[-0.374px] border-none outline-none bg-transparent w-full max-w-md"
            placeholder="Nombre de la tarea"
            required
            disabled={isLoading}
          />
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="primary"
              isLoading={isLoading}
              size="sm"
              className="text-[13px] py-1.5"
              onClick={() => formRef.current?.requestSubmit()}
            >
              Crear
            </Button>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              title="Cerrar"
            >
              <X size={18} className="text-[#7a7a7a]" />
            </button>
          </div>
        </div>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-2.5">
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
            {boardUsers.map((user) => (
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
                    className={`cursor-pointer transition-all text-[11px] ${
                      isSelected ? 'ring-1 ring-[#0066cc]' : 'hover:opacity-80'
                    }`}
                    disabled={isLoading || (!isSelected && tags.length >= 5)}
                  >
                    <Badge variant="tag" color={tag.color}>
                      {tag.text}
                    </Badge>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px] text-[#7a7a7a] mb-2 tracking-[-0.12px]">No hay etiquetas en este proyecto</p>
          )}

          {/* Crear nueva etiqueta */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newTagText}
              onChange={(e) => setNewTagText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              className="flex-1 px-3 py-1.5 rounded-lg border border-[#e0e0e0] focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]/20 outline-none transition-all text-[12px]"
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
          <p className="text-xs text-[#7a7a7a] mt-1">
            Las etiquetas se comparten con todas las tareas del proyecto
          </p>
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="description" className="block text-[13px] font-semibold text-[#1d1d1f] mb-1 tracking-[-0.224px]">
            Descripción <span className="font-light text-[12px] text-[#7a7a7a]">(opcional)</span>
          </label>
          <div className="w-full rounded-lg focus:ring-1 focus:ring-[#0066cc]/20 outline-none transition-all min-h-[80px]">
            <NoteEditor
              content={description}
              onChange={setDescription}
              editable={true}
              placeholder="Descripción de la tarea..."
              maxLength={50000}
              showCharCount={true}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-[12px] text-red-600 tracking-[-0.12px]">{error}</p>
          </div>
        )}
      </form>
    </Modal>
  );
}
