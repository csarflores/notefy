'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { updateProject } from '@/actions/project-actions';
import { IProject } from '@/types';
import { Save, X, Palette } from 'lucide-react';
import { PROJECT_COLORS } from '@/constants/project-colors';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: IProject;
}

export default function EditProjectModal({ isOpen, onClose, project }: EditProjectModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#0066cc');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Inicializar con datos del proyecto
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setColor(project.color || '#0066cc');
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
        color: color,
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
            placeholder="Nombre del proyecto"
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
              <Save size={16} className="mr-1" /> Guardar
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

        {/* Selector de Color */}
        <div>
          <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
            Color del Proyecto
          </label>
          <div className="space-y-3">
            {/* Color seleccionado actual */}
            <div className="flex items-center gap-3">
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

        {/* Error */}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
