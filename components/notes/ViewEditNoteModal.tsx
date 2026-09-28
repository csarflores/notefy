'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import NoteEditor from './NoteEditor';
import { Trash2, Lock, Users, Save, X, Palette, Share2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { INote, MemberRole } from '@/types';
import { updateNote, deleteNote } from '@/actions/note-actions';
import { useNotification } from '@/components/ui/NotificationContext';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ShareDialog from '@/components/share/ShareDialog';
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
  const { data: session } = useSession();
  const { showNotification } = useNotification();
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState(note.color || '#f59e0b');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Rol del usuario actual sobre la nota (memberRoles llega serializado como objeto plano)
  const isNoteOwner = note.owner?.toString() === userId;
  const memberRoles = (note.memberRoles ?? {}) as unknown as Record<string, MemberRole>;
  const email = session?.user?.email?.toLowerCase() ?? '';
  const myRole: MemberRole | 'owner' = isNoteOwner
    ? 'owner'
    : note.members?.includes(email)
      ? (memberRoles[email] ?? 'editor')
      : 'viewer';
  const canEditNote = myRole === 'owner' || myRole === 'editor';
  const isShared = note.visibility === 'shared';

  // Actualizar el contenido cuando la nota cambia
  useEffect(() => {
    setContent(note.content);
    setColor(note.color || '#f59e0b');
  }, [note]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateNote(note._id.toString(), userId, {
        content,
        color,
      });
      if (result.success) {
      } else {
        showNotification(result.error || 'Error al guardar la nota', 'error');
      }
    } catch {
      showNotification('Error al guardar la nota', 'error');
    } finally {
      setIsSaving(false);
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
        setIsConfirmModalOpen(false);
        showNotification(result.error || 'Error al eliminar la nota', 'error');
      }
    } catch {
      setIsConfirmModalOpen(false);
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
                    {isShared ? (
                      <Users size={16} className="text-[#0066cc] shrink-0" />
                    ) : (
                      <Lock size={16} className="text-[#7a7a7a] shrink-0" />
                    )}
                    <h1 className="text-[20px] sm:text-[24px] font-semibold text-[#1d1d1f] tracking-tight truncate">
                      {note.title}
                    </h1>
                  </div>

                  {/* Información del propietario */}
                  <div className="mb-3 text-[11px] sm:text-[12px] text-[#7a7a7a]">
                    Propietario: {ownerName || ownerEmail || 'Usuario'}
                  </div>

                  {/* Selector de Color (solo quien puede editar) */}
                  {canEditNote && (
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
                  )}
                </div>
              </div>

              {/* Controles en la esquina superior derecha */}
              <div className="flex items-center gap-2 shrink-0 pt-2 top-0 right-0 relative">
                <button
                  onClick={() => setShareDialogOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors"
                  title="Compartir nota"
                >
                  <Share2 size={15} />
                  <span className="hidden sm:inline">Compartir</span>
                </button>
                {canEditNote && (
                  <Button
                    onClick={handleSave}
                    size="sm"
                    isLoading={isSaving}
                    className="text-[13px] py-1.5"
                  >
                    <Save size={15} className="mr-1.5" />
                    Guardar
                  </Button>
                )}
                {isNoteOwner && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-1.5 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                    title="Eliminar"
                  >
                    <Trash2 size={18} className="text-red-500" />
                  </button>
                )}
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
              editable={canEditNote}
              placeholder="Escribe el contenido de tu nota..."
              uploadScope="note-image"
              uploadResourceId={note._id.toString()}
            />
          </div>
        </div>
      </div>
      {/* Diálogo de compartir */}
      <ShareDialog
        isOpen={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        resourceType="note"
        resourceId={note._id.toString()}
        resourceName={note.title}
        ownerId={note.owner.toString()}
        notePublicToken={note.publicToken}
      />
      <ConfirmDialog
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar nota"
        message="¿Estás seguro de que quieres eliminar esta nota? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}
