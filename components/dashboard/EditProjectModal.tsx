'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { updateProject } from '@/actions/project-actions';
import { IProject } from '@/types';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: IProject;
}

export default function EditProjectModal({ isOpen, onClose, project }: EditProjectModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Inicializar con datos del proyecto
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
    }
  }, [project]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('El nombre del proyecto es requerido');
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateProject(project._id.toString(), {
        name: name.trim(),
        description: description.trim(),
      });

      if (result.success) {
        onClose();
        router.refresh();
      } else {
        setError(result.error || 'Error al actualizar el proyecto');
      }
    } catch (err) {
      setError('Error inesperado al actualizar el proyecto');
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Editar Proyecto">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nombre del proyecto */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[#1d1d1f] mb-2">
            Nombre del proyecto
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Rediseño de la app móvil"
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
            placeholder="Describe brevemente el proyecto..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none transition-all text-[#1d1d1f] placeholder:text-gray-400 resize-none"
            disabled={isLoading}
          />
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
