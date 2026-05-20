'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NoteEditor from '@/components/notes/NoteEditor';
import { ArrowLeft, Trash2, Lock, Globe, Edit2, Save } from 'lucide-react';
import { INote } from '@/types';
import { updateNote, deleteNote } from '@/actions/note-actions';
import { useNotification } from '@/components/ui/NotificationContext';
import ConfirmModal from '@/components/ui/ConfirmModal';

export function NoteEditorClient({ note, userId }: { note: INote; userId: string }) {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [content, setContent] = useState(note.content);
  const [savedContent, setSavedContent] = useState(note.content);
  const [editorKey, setEditorKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateNote(note._id.toString(), userId, {
        content,
      });
      if (result.success) {
        setSavedContent(content);
        setIsEditing(false);
      } else {
        showNotification(result.error || 'Error al guardar la nota', 'error');
      }
    } catch (error) {
      showNotification('Error al guardar la nota', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(savedContent);
    setEditorKey((k) => k + 1);
    setIsEditing(false);
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
        router.push(note.projectId ? `/parent-project/${note.projectId}` : '/dashboard');
      } else {
        showNotification(result.error || 'Error al eliminar la nota', 'error');
      }
    } catch (error) {
      showNotification('Error al eliminar la nota', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 w-full">
        <div className="w-full px-2 sm:px-5 h-11 flex items-center gap-1.5">

          {/* Volver */}
          <button
            onClick={() => router.push(note.projectId ? `/parent-project/${note.projectId}` : '/dashboard')}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[#7a7a7a] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all shrink-0 group"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          </button>

          {/* Separador */}
          <div className="w-px h-4 bg-[#e5e5e5] shrink-0" />

          {/* Título + visibilidad */}
          <div className="flex items-center gap-2 min-w-0 flex-1 px-1">
            <span className="text-[14px] font-semibold text-[#1d1d1f] tracking-tight truncate leading-none">
              {note.title}
            </span>
            <span className={`hidden sm:flex items-center gap-1 shrink-0 text-[11px] px-1.5 py-0.5 rounded-md font-medium ${
              note.visibility === 'private'
                ? 'text-[#a0a0a8] bg-[#f5f5f7]'
                : 'text-[#0066cc] bg-[#0066cc]/8'
            }`}>
              {note.visibility === 'private'
                ? <><Lock size={10} />Privada</>
                : <><Globe size={10} />Compartida</>
              }
            </span>
          </div>

          {/* Acciones */}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066cc] hover:bg-[#0055b3] active:bg-[#004499] text-white rounded-lg text-[12px] font-medium transition-colors shrink-0 shadow-sm"
            >
              <Edit2 size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">Editar</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-3 py-1.5 text-[12px] font-medium text-[#636366] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-lg transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066cc] hover:bg-[#0055b3] active:bg-[#004499] text-white rounded-lg text-[12px] font-medium transition-colors shadow-sm disabled:opacity-60"
              >
                {isSaving
                  ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Save size={13} strokeWidth={2.5} />
                }
                <span className="hidden sm:inline">{isSaving ? 'Guardando…' : 'Guardar'}</span>
              </button>
            </div>
          )}

          {/* Eliminar */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-[#a0a0a8] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 shrink-0"
            title="Eliminar nota"
          >
            <Trash2 size={15} />
          </button>

        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <NoteEditor
            key={editorKey}
            content={content}
            onChange={setContent}
            editable={isEditing}
            placeholder="Escribe el contenido de tu nota..."
          />
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
    </>
  );
}
