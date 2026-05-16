'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { createBoard } from '@/actions/board-actions';
import { getUserProjects } from '@/actions/project-actions';
import { useSession } from 'next-auth/react';
import { X } from 'lucide-react';

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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectId || null);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [error, setError] = useState('');
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
      const result = await createBoard(userId, {
        name: name.trim(),
        description: description.trim(),
        projectId: selectedProjectId,
      });

      if (result.success) {
        onClose();
        router.refresh();
      } else {
        setError(result.error || 'Error al crear el tablero');
      }
    } catch (err) {
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
