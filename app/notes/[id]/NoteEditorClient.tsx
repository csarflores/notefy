'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NoteEditor from '@/components/notes/NoteEditor';
import { ArrowLeft, Trash2, Lock, Users, Edit2, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import { INote } from '@/types';
import { updateNote, deleteNote } from '@/actions/note-actions';

export function NoteEditorClient({ note, userId }: { note: INote; userId: string }) {
  const router = useRouter();
  const [content, setContent] = useState(note.content);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateNote(note._id.toString(), userId, {
        content,
      });
      if (result.success) {
        setIsEditing(false);
      } else {
        alert(result.error || 'Error al guardar la nota');
      }
    } catch (error) {
      alert('Error al guardar la nota');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
      return;
    }
    setIsDeleting(true);
    try {
      const result = await deleteNote(note._id.toString(), userId);
      if (result.success) {
        alert('Nota eliminada');
        router.push(note.projectId ? `/parent-project/${note.projectId}` : '/dashboard');
      } else {
        alert(result.error || 'Error al eliminar la nota');
      }
    } catch (error) {
      alert('Error al eliminar la nota');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm w-full overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Botón volver */}
              <button
                onClick={() => router.push(note.projectId ? `/parent-project/${note.projectId}` : '/dashboard')}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors shrink-0"
              >
                <ArrowLeft size={18} className="text-[#7a7a7a]" />
              </button>

              {/* Información de la nota */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  {note.visibility === 'private' ? (
                    <Lock size={16} className="text-[#7a7a7a] shrink-0" />
                  ) : (
                    <Users size={16} className="text-[#0066cc] shrink-0" />
                  )}
                  <h1 className="text-[20px] sm:text-[24px] font-semibold text-[#1d1d1f] tracking-tight truncate">
                    {note.title}
                  </h1>
                </div>

                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] sm:text-[12px] text-[#7a7a7a]">
                  {note.visibility === 'shared' && (
                    <>
                      <Users size={12} className="shrink-0" />
                      <span>
                        {note.members.length} miembro{note.members.length > 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  className="flex-1 sm:flex-none text-[13px] py-1.5"
                >
                  <Edit2 size={15} className="sm:mr-1.5" />
                  <span className="hidden sm:inline">Editar</span>
                  <span className="sm:hidden">Editar</span>
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  size="sm"
                  isLoading={isSaving}
                  className="flex-1 sm:flex-none text-[13px] py-1.5"
                >
                  <Save size={15} className="sm:mr-1.5" />
                  <span className="hidden sm:inline">Guardar</span>
                  <span className="sm:hidden">Guardar</span>
                </Button>
              )}
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1.5 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                title="Eliminar"
              >
                <Trash2 size={18} className="text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <NoteEditor
            content={content}
            onChange={setContent}
            editable={isEditing}
            placeholder="Escribe el contenido de tu nota..."
          />
        </div>
      </div>
    </>
  );
}
