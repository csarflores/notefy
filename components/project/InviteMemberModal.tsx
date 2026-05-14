'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { addProjectMember, removeProjectMember } from '@/actions/project-actions';
import { IProject } from '@/types';
import { Mail, X, UserPlus } from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: IProject;
}

export default function InviteMemberModal({ isOpen, onClose, project }: InviteMemberModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('El email es requerido');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Por favor ingresa un email válido');
      return;
    }

    setIsLoading(true);

    try {
      const result = await addProjectMember(project._id.toString(), email.toLowerCase().trim());

      if (result.success) {
        setSuccess(`¡Miembro agregado exitosamente!`);
        setEmail('');
        router.refresh();
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        setError(result.error || 'Error al agregar miembro');
      }
    } catch (err) {
      setError('Error inesperado al agregar miembro');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberEmail: string) => {
    try {
      const result = await removeProjectMember(project._id.toString(), memberEmail);
      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      console.error('Error al eliminar miembro:', error);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEmail('');
      setError('');
      setSuccess('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invitar Miembros">
      <div className="space-y-6">
        {/* Formulario de invitación */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#1d1d1f] mb-2">
              Email del miembro
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a7a7a]"
              />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@email.com"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none transition-all text-[#1d1d1f] placeholder:text-gray-400"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Mensajes */}
          {error && (
            <div className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
              {success}
            </div>
          )}

          {/* Botón de invitar */}
          <Button type="submit" isLoading={isLoading} className="w-full">
            <UserPlus size={18} className="mr-2" />
            Agregar Miembro
          </Button>
        </form>

        {/* Lista de miembros actuales */}
        {project.members.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-[#1d1d1f] mb-3">
              Miembros del proyecto ({project.members.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {project.members.map((memberEmail, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={memberEmail} size="sm" />
                    <span className="text-sm text-[#1d1d1f]">{memberEmail}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(memberEmail)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
                    title="Eliminar miembro"
                  >
                    <X size={16} className="text-[#7a7a7a] group-hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botón cerrar */}
        <Button
          type="button"
          variant="ghost"
          onClick={handleClose}
          disabled={isLoading}
          className="w-full"
        >
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
