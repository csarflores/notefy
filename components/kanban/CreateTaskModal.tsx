'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
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
  projectId: string;
  defaultStatus?: 'todo' | 'in-progress' | 'done';
}

const STATUS_OPTIONS = [
  {
    value: 'todo',
    label: 'Pendiente',
    dot: '#8e8e93',
    activeClass: 'bg-[#f5f5f7] text-[#3a3a3c] ring-1 ring-[#c7c7cc]',
  },
  {
    value: 'in-progress',
    label: 'En Proceso',
    dot: '#0066cc',
    activeClass: 'bg-[#e8f0fb] text-[#0055aa] ring-1 ring-[#0066cc]/25',
  },
  {
    value: 'done',
    label: 'Finalizado',
    dot: '#34c759',
    activeClass: 'bg-[#e6f9ec] text-[#1a7a33] ring-1 ring-[#34c759]/35',
  },
] as const;

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
    if (isOpen && projectId && hasLoadedRef.current !== projectId) {
      loadProjectData();
      hasLoadedRef.current = projectId;
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (isOpen) setStatus(defaultStatus);
  }, [isOpen, defaultStatus]);

  const loadProjectData = async () => {
    const [usersResult, tagsResult] = await Promise.all([
      getBoardUsers(projectId),
      getProjectTags(projectId),
    ]);

    if (usersResult.success && usersResult.data) {
      setBoardUsers(usersResult.data);
      if (usersResult.data.length === 1) {
        setAssignedTo([usersResult.data[0]._id.toString()]);
      }
    }
    if (tagsResult.success && tagsResult.data) {
      setProjectTags(tagsResult.data);
    }
  };

  const handleAddTag = () => {
    if (!newTagText.trim() || tags.length >= 5) return;
    const newTag = { text: newTagText.trim(), color: generateRandomColor() };
    const tagExists = projectTags.some(
      (t) => t.text.toLowerCase() === newTag.text.toLowerCase()
    );
    if (!tagExists) setProjectTags([...projectTags, newTag]);
    setTags([...tags, newTag]);
    setNewTagText('');
  };

  const handleToggleTag = (tag: ITag) => {
    const isSelected = tags.some((t) => t.text === tag.text);
    if (isSelected) {
      setTags(tags.filter((t) => t.text !== tag.text));
    } else if (tags.length < 5) {
      setTags([...tags, tag]);
    }
  };

  const handleToggleUser = (userId: string) => {
    if (assignedTo.includes(userId)) {
      setAssignedTo(assignedTo.filter((id) => id !== userId));
    } else {
      setAssignedTo([...assignedTo, userId]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('El título es requerido');
      return;
    }
    if (description.length > 50000) {
      setError('La descripción excede el límite de 50,000 caracteres.');
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
    } catch {
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
      className="max-w-xl"
      headerContent={
        <div className="flex items-center gap-3 px-6 py-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight border-none outline-none bg-transparent w-full placeholder:text-[#c7c7cc] placeholder:font-normal"
            placeholder="Nombre de la tarea..."
            required
            disabled={isLoading}
            autoFocus
          />
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              disabled={isLoading || !title.trim()}
              className="px-4 py-1.5 rounded-lg bg-[#0066cc] text-white text-[13px] font-medium hover:bg-[#0055aa] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? 'Creando…' : 'Crear'}
            </button>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-[#aaaaaa] hover:text-[#1d1d1f] transition-colors disabled:opacity-40"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

        {/* Estado */}
        <div>
          <p className="text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-2">
            Estado
          </p>
          <div className="flex gap-1.5">
            {STATUS_OPTIONS.map((option) => {
              const isActive = status === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                    isActive
                      ? option.activeClass
                      : 'text-[#8e8e93] hover:bg-[#f5f5f7]'
                  }`}
                  disabled={isLoading}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
                    style={{ backgroundColor: isActive ? option.dot : '#d1d1d6' }}
                  />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="dueDate"
              className="block text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-1.5"
            >
              Fecha límite
            </label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[13px] text-[#1d1d1f] bg-white"
              disabled={isLoading}
            />
          </div>
          <div>
            <label
              htmlFor="deliveryDate"
              className="block text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-1.5"
            >
              Fecha entrega
            </label>
            <input
              id="deliveryDate"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[13px] text-[#1d1d1f] bg-white"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Asignar miembros */}
        {boardUsers.length > 1 && (
          <div>
            <p className="text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-2">
              Asignar a
            </p>
            <div className="flex flex-wrap gap-2">
              {boardUsers.map((user) => {
                const isSelected = assignedTo.includes(user._id.toString());
                return (
                  <button
                    key={user._id.toString()}
                    type="button"
                    onClick={() => handleToggleUser(user._id.toString())}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] transition-all ${
                      isSelected
                        ? 'border-[#0066cc] bg-[#e8f0fb] text-[#0055aa]'
                        : 'border-[#e5e5ea] text-[#3a3a3c] hover:border-[#c7c7cc]'
                    }`}
                    disabled={isLoading}
                  >
                    <Avatar src={user.image} name={user.name} size="sm" />
                    <span>{user.name}</span>
                    {isSelected && <Check size={11} className="text-[#0066cc]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Etiquetas */}
        <div>
          <p className="text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-2">
            Etiquetas{' '}
            <span className="normal-case font-normal text-[#c7c7cc]">
              ({tags.length}/5)
            </span>
          </p>

          {projectTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {projectTags.map((tag, index) => {
                const isSelected = tags.some((t) => t.text === tag.text);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`transition-opacity ${
                      isSelected ? 'opacity-100' : 'opacity-40 hover:opacity-70'
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
            <p className="text-[12px] text-[#c7c7cc] mb-2.5">
              Sin etiquetas en este proyecto
            </p>
          )}

          <div className="flex gap-1.5">
            <input
              type="text"
              value={newTagText}
              onChange={(e) => setNewTagText(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' && (e.preventDefault(), handleAddTag())
              }
              className="flex-1 px-3 py-2 rounded-lg border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[12px] placeholder:text-[#c7c7cc]"
              placeholder="Nueva etiqueta..."
              maxLength={30}
              disabled={isLoading || tags.length >= 5}
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={!newTagText.trim() || isLoading || tags.length >= 5}
              className="px-3 py-2 rounded-lg border border-[#e5e5ea] text-[#8e8e93] hover:border-[#0066cc] hover:text-[#0066cc] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Descripción */}
        <div>
          <p className="text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-2">
            Descripción{' '}
            <span className="normal-case font-normal text-[#c7c7cc]">(opcional)</span>
          </p>
          <div className="rounded-lg border border-[#e5e5ea] overflow-hidden focus-within:border-[#0066cc] focus-within:ring-2 focus-within:ring-[#0066cc]/10 transition-all">
            <NoteEditor
              content={description}
              onChange={setDescription}
              editable={true}
              placeholder="Descripción de la tarea..."
              maxLength={50000}
              showCharCount={true}
              minHeight="120px"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-[12px] text-red-500">{error}</p>
          </div>
        )}
      </form>
    </Modal>
  );
}
