'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NoteEditor from './NoteEditor';
import { Lock, Users, Save, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { createNote, shareNote } from '@/actions/note-actions';
import { CreateNoteInput } from '@/types';
import { useNotification } from '@/components/ui/NotificationContext';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  projectId?: string | null;
  ownerEmail?: string;
  ownerName?: string;
}

export default function CreateNoteModal({
  isOpen,
  onClose,
  userId,
  projectId,
  ownerEmail,
  ownerName,
}: CreateNoteModalProps) {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'shared'>('private');
  const [memberEmail, setMemberEmail] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      showNotification('Por favor ingresa un título', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const noteData: CreateNoteInput = {
        title,
        content,
        visibility,
        projectId: projectId || null,
      };

      const result = await createNote(userId, noteData);

      if (result.success && result.data) {
        // Si hay miembros, compartir la nota con ellos
        if (visibility === 'shared' && members.length > 0) {
          for (const email of members) {
            await shareNote(result.data._id.toString(), userId, email);
          }
        }

        setTitle('');
        setContent('');
        setVisibility('private');
        setMemberEmail('');
        setMembers([]);
        onClose();
        router.refresh();
      } else {
        showNotification(result.error || 'Error al crear la nota', 'error');
      }
    } catch (error) {
      showNotification('Error al crear la nota', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addMember = () => {
    if (memberEmail && /^\S+@\S+\.\S+$/.test(memberEmail) && !members.includes(memberEmail)) {
      setMembers([...members, memberEmail]);
      setMemberEmail('');
      if (visibility === 'private') {
        setVisibility('shared');
      }
    } else {
      if (!memberEmail) {
        showNotification('Por favor ingresa un email', 'error');
      } else if (!/^\S+@\S+\.\S+$/.test(memberEmail)) {
        showNotification('Email inválido', 'error');
      } else if (members.includes(memberEmail)) {
        showNotification('El usuario ya tiene acceso a esta nota', 'error');
      }
    }
  };

  const removeMember = (email: string) => {
    setMembers(members.filter(m => m !== email));
    if (members.length === 1) {
      setVisibility('private');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white w-full max-w-4xl h-[85vh] sm:h-[80vh] shadow-2xl rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 shrink-0">
          <div className="w-full px-4 sm:px-6 py-4 sm:py-5">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Información de la nota */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    {visibility === 'private' ? (
                      <Lock size={16} className="text-[#7a7a7a] shrink-0" />
                    ) : (
                      <Users size={16} className="text-[#0066cc] shrink-0" />
                    )}
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Título..."
                      className="text-[20px] sm:text-[24px] font-semibold text-[#1d1d1f] tracking-tight bg-transparent border-none focus:outline-none focus:ring-0 placeholder-gray-300 w-full"
                    />
                  </div>

                  {/* Información del propietario */}
                  <div className="mb-3 text-[11px] sm:text-[12px] text-[#7a7a7a]">
                    Propietario: {ownerName || ownerEmail || 'Usuario'}
                  </div>

                  {/* Controles de visibilidad */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="visibility"
                          value="private"
                          checked={visibility === 'private'}
                          onChange={(e) => setVisibility(e.target.value as 'private' | 'shared')}
                          className="w-4 h-4 text-gray-400 focus:ring-gray-300"
                        />
                        <span className="text-xs text-gray-500">Privada</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="visibility"
                          value="shared"
                          checked={visibility === 'shared'}
                          onChange={(e) => setVisibility(e.target.value as 'private' | 'shared')}
                          className="w-4 h-4 text-gray-400 focus:ring-gray-300"
                        />
                        <span className="text-xs text-gray-500">Compartida</span>
                      </label>
                    </div>

                    {/* Campo para agregar miembros si es compartida */}
                    {visibility === 'shared' && (
                      <div className="flex flex-col gap-2">
                        {members.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {members.map((email) => (
                              <span
                                key={email}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                              >
                                {email}
                                <button
                                  type="button"
                                  onClick={() => removeMember(email)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 max-w-3/4">
                          <input
                            type="email"
                            value={memberEmail}
                            onChange={(e) => setMemberEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMember())}
                            placeholder="Agregar email..."
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
                          />
                          <Button
                            onClick={addMember}
                            disabled={isSharing}
                            isLoading={isSharing}
                            size="sm"
                          >
                            Agregar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Controles en la esquina superior derecha */}
              <div className="flex items-center gap-2 shrink-0 pt-2 top-0 right-0 relative">
                <Button
                  onClick={handleSave}
                  size="sm"
                  isLoading={isSaving}
                  className="text-[13px] py-1.5"
                >
                  <Save size={15} className="mr-1.5" />
                  Guardar
                </Button>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  title="Cerrar"
                >
                  <X size={18} className="text-[#7a7a7a]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 sm:py-5">
          <div className="bg-white rounded-xl py-6 h-full">
            <NoteEditor
              content={content}
              onChange={setContent}
              editable={true}
              placeholder="Escribe el contenido de tu nota..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
