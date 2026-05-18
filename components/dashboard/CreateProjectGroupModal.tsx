'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { createProject } from '@/actions/project-actions';
import { Palette } from 'lucide-react';
import { PROJECT_COLORS } from '@/constants/project-colors';

interface CreateProjectGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function CreateProjectGroupModal({ isOpen, onClose, userId }: CreateProjectGroupModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#0066cc');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('El nombre del proyecto es requerido');
      return;
    }

    setIsLoading(true);

    try {
      const result = await createProject(userId, {
        name: name.trim(),
        description: description.trim(),
        color: color,
      });

      if (result.success) {
        setName('');
        setDescription('');
        onClose();
        router.refresh();
      } else {
        setError(result.error || 'Error al crear el proyecto');
      }
    } catch (err) {
      setError('Error inesperado al crear el proyecto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setDescription('');
      setColor('#0066cc');
      setError('');
      setShowColorPicker(false);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nuevo Proyecto">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nombre del proyecto */}
        <div>
          <label htmlFor="project-name" className="block text-sm font-medium text-[#1d1d1f] mb-2">
            Nombre del proyecto
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Empresa 1"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none transition-all text-[#1d1d1f] placeholder:text-gray-400"
            disabled={isLoading}
            autoFocus
          />
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="project-description" className="block text-sm font-medium text-[#1d1d1f] mb-2">
            Descripción (opcional)
          </label>
          <textarea
            id="project-description"
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

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-[12px] text-blue-800">
            💡 Los proyectos agrupan varios tableros. Después de crear el proyecto, podrás arrastrar tableros hacia él.
          </p>
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
            Crear Proyecto
          </Button>
        </div>
      </form>
    </Modal>
  );
}
