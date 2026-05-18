'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NoteEditor from './NoteEditor';
import { Trash2, Lock, Users, Save, X, Palette } from 'lucide-react';
import Button from '@/components/ui/Button';
import { INote } from '@/types';
import { updateNote, deleteNote, shareNote, removeNoteMember } from '@/actions/note-actions';
import { useNotification } from '@/components/ui/NotificationContext';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { PROJECT_COLORS } from '@/constants/project-colors';

interface ViewEditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: INote;
  userId: string;
  ownerEmail?: string;
  ownerName?: string;
}

export default function ViewEditNoteModal({ isOpen, onClose, note, userId, ownerEmail, ownerName }: ViewEditNoteModalProps) {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [content, setContent] = useState(note.content);
  const [visibility, setVisibility] = useState<'private' | 'shared'>(note.visibility as 'private' | 'shared');
  const [color, setColor] = useState(note.color || '#f59e0b');
  const [memberEmail, setMemberEmail] = useState('');
  const [members, setMembers] = useState<string[]>(note.members || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Actualizar el contenido cuando la nota cambia
  useEffect(() => {
    setContent(note.content);
    setVisibility(note.visibility as 'private' | 'shared');
    setColor(note.color || '#f59e0b');
    setMembers(note.members || []);
  }, [note]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateNote(note._id.toString(), userId, {
        content,
        visibility,
        color,
        members,
      });
      if (result.success) {
      } else {
        showNotification(result.error || 'Error al guardar la nota', 'error');
      }
    } catch (error) {
      showNotification('Error al guardar la nota', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addMember = async () => {
    if (memberEmail && /^\S+@\S+\.\S+$/.test(memberEmail) && !members.includes(memberEmail)) {
      setIsSharing(true);
      try {
        const result = await shareNote(note._id.toString(), userId, memberEmail);
        if (result.success) {
          setMembers([...members, memberEmail]);
          setMemberEmail('');
          if (visibility === 'private') {
            setVisibility('shared');
          }
        } else {
          showNotification(result.error || 'Error al compartir la nota', 'error');
        }
      } catch (error) {
        showNotification('Error al compartir la nota', 'error');
      } finally {
        setIsSharing(false);
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

  const removeMember = async (email: string) => {
    setIsSharing(true);
    try {
      const result = await removeNoteMember(note._id.toString(), userId, email);
      if (result.success) {
        setMembers(members.filter(m => m !== email));
        if (members.length === 1) {
          setVisibility('private');
        }
      } else {
        showNotification(result.error || 'Error al eliminar el miembro', 'error');
      }
    } catch (error) {
      showNotification('Error al eliminar el miembro', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = async () => {
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteNote(note._id.toString(), userId);
      if (result.success) {
        showNotification('Nota eliminada', 'success');
        onClose();
        router.refresh();
      } else {
        showNotification(result.error || 'Error al eliminar la nota', 'error');
      }
    } catch (error) {
      showNotification('Error al eliminar la nota', 'error');
    } finally {
      setIsDeleting(false);
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
                    <h1 className="text-[20px] sm:text-[24px] font-semibold text-[#1d1d1f] tracking-tight truncate">
                      {note.title}
                    </h1>
                  </div>

                  {/* Información del propietario */}
                  <div className="mb-3 text-[11px] sm:text-[12px] text-[#7a7a7a]">
                    Propietario: {ownerName || ownerEmail || 'Usuario'}
                  </div>

                  {/* Selector de Color */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div 
                          className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs text-gray-600 font-medium">
                          {PROJECT_COLORS.find(c => c.value === color)?.name || 'Personalizado'}
                        </span>
                        <Palette size={14} className="text-gray-500" />
                      </button>
                    </div>

                    {/* Paleta de colores */}
                    {showColorPicker && (
                      <div className="grid grid-cols-6 gap-1.5 p-2 bg-gray-50 rounded-lg">
                        {PROJECT_COLORS.map((colorOption) => (
                          <button
                            key={colorOption.value}
                            type="button"
                            onClick={() => {
                              setColor(colorOption.value);
                              setShowColorPicker(false);
                            }}
                            className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
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
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-1.5 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                  title="Eliminar"
                >
                  <Trash2 size={18} className="text-red-500" />
                </button>
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
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar nota"
        message="¿Estás seguro de que quieres eliminar esta nota?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}
