'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { createBoard, createBoardFromTemplate } from '@/actions/board-actions';
import { getUserProjects } from '@/actions/project-actions';
import { IProject } from '@/types';
import { useSession } from 'next-auth/react';
import { X, Palette } from 'lucide-react';
import { PROJECT_COLORS } from '@/constants/project-colors';
import IconPicker from '@/components/ui/IconPicker';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  projectId?: string;
}

export default function CreateBoardModal({ isOpen, onClose, userId, projectId }: CreateBoardModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6b7280');
  const [icon, setIcon] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectId || null);
  const [availableProjects, setAvailableProjects] = useState<IProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [error, setError] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [template, setTemplate] = useState<'none' | 'sprint' | 'personal' | 'client'>('none');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    async function loadProjects() {
      if (!session?.user?.id || !isOpen) return;

      setIsLoadingProjects(true);
      try {
        const result = await getUserProjects(session.user.id);
        if (result.success && result.data) {
          setAvailableProjects(result.data);
        }
      } catch (err) {
        console.error('Error al cargar proyectos:', err);
      } finally {
        setIsLoadingProjects(false);
      }
    }

    loadProjects();
  }, [session?.user?.id, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('El nombre del tablero es requerido');
      return;
    }

    setIsLoading(true);

    try {
      const input = {
        name: name.trim(),
        description: description.trim(),
        color: color,
        icon: icon || undefined,
        projectId: selectedProjectId,
      };
      const result = template === 'none'
        ? await createBoard(userId, input)
        : await createBoardFromTemplate(userId, input, template);

      if (result.success) {
        onClose();
        router.refresh();
      } else {
        setError(result.error || 'Error al crear el tablero');
      }
    } catch {
      setError('Error inesperado al crear el tablero');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError('');
      setName('');
      setDescription('');
      setColor('#6b7280');
      setIcon('');
      setShowColorPicker(false);
      setTemplate('none');
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-[17px] font-semibold text-[#1d1d1f] tracking-[-0.374px] border-none outline-none bg-transparent w-full max-w-md"
            placeholder="Nombre del tablero"
            required
            disabled={isLoading}
            autoFocus
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
              Crear Tablero
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
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

        {/* Selector de Color + Icono */}
        <div>
          <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
            Color e icono
          </label>
          <div className="space-y-3">
            {/* Color seleccionado actual */}
            <div className="flex items-center gap-3">
              <IconPicker value={icon} onChange={setIcon} />
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                disabled={isLoading}
              >
                <div 
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-[#1d1d1f] font-medium">
                  {PROJECT_COLORS.find(c => c.value === color)?.name || 'Personalizado'}
                </span>
                <Palette size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Paleta de colores */}
            {showColorPicker && (
              <div className="grid grid-cols-6 gap-2 p-3 bg-gray-50 rounded-lg">
                {PROJECT_COLORS.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => {
                      setColor(colorOption.value);
                      setShowColorPicker(false);
                    }}
                    className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${
                      color === colorOption.value 
                        ? 'border-gray-800 shadow-lg scale-110' 
                        : 'border-white shadow-sm hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: colorOption.value }}
                    title={colorOption.name}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Plantilla */}
        <div>
          <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
            Plantilla
          </label>
          <div className="flex gap-1.5">
            {([
              { id: 'none', label: 'Vacío' },
              { id: 'sprint', label: 'Sprint' },
              { id: 'personal', label: 'Personal' },
              { id: 'client', label: 'Cliente' },
            ] as const).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t.id)}
                disabled={isLoading}
                className={`flex-1 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                  template === t.id
                    ? 'bg-[#e8f0fb] text-[#0055aa] ring-1 ring-[#0066cc]/25'
                    : 'text-[#8e8e93] hover:bg-[#f5f5f7] border border-[#e5e5ea]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {template !== 'none' && (
            <p className="text-[11px] text-[#a0a0a8] mt-1.5">
              Se crearán tareas de ejemplo en el tablero
            </p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-[#1d1d1f] mb-2">
            Descripción (opcional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe brevemente el tablero..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none transition-all text-[#1d1d1f] placeholder:text-gray-400 resize-none"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="projectId" className="block text-sm font-medium text-[#1d1d1f] mb-2">
            Proyecto (opcional)
          </label>
          <select
            id="projectId"
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none transition-all text-[#1d1d1f] bg-white"
            disabled={isLoading || isLoadingProjects}
          >
            <option value="">Sin proyecto (tablero independiente)</option>
            {availableProjects.map((project) => (
              <option key={project._id.toString()} value={project._id.toString()}>
                {project.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-[#7a7a7a] mt-1.5">
            Selecciona un proyecto para agrupar este tablero
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
