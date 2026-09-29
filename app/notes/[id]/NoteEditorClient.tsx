'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import NoteEditor from '@/components/notes/NoteEditor';
import { ArrowLeft, Trash2, Lock, Globe, Edit2, Save, Check, Loader2, MoreHorizontal, FileDown, Printer, Link2, CornerUpLeft, Share2, Eye, History } from 'lucide-react';
import { INote, MemberRole } from '@/types';
import { updateNote, deleteNote, getNoteLinks } from '@/actions/note-actions';
import { exportNoteAsMarkdown, printNoteAsPdf } from '@/lib/export';
import { escapeRegExp } from '@/lib/utils';
import { useNotification } from '@/components/ui/NotificationContext';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ShareDialog from '@/components/share/ShareDialog';
import NoteVersionsPanel from '@/components/notes/NoteVersionsPanel';
import NoteComments from '@/components/notes/NoteComments';

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

interface NoteLinkItem {
  _id: string;
  title: string;
  color: string;
}

export function NoteEditorClient({ note, userId, userRole }: { note: INote; userId: string; userRole: MemberRole | 'owner' }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { showNotification } = useNotification();
  const [noteTitle, setNoteTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [savedContent, setSavedContent] = useState(note.content);
  const [editorKey, setEditorKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [links, setLinks] = useState<NoteLinkItem[]>([]);
  const [backlinks, setBacklinks] = useState<NoteLinkItem[]>([]);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const isNoteOwner = userRole === 'owner';
  const canEditNote = isNoteOwner || userRole === 'editor';

  const save = useCallback(async (value: string) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveState('saving');
    try {
      const result = await updateNote(note._id.toString(), userId, { content: value });
      if (result.success) {
        setSavedContent(value);
        setSaveState('saved');
        void loadLinks();
      } else {
        setSaveState('error');
        showNotification(result.error || 'Error al guardar la nota', 'error');
      }
    } catch {
      setSaveState('error');
      showNotification('Error al guardar la nota', 'error');
    } finally {
      savingRef.current = false;
    }
  }, [note._id, userId, showNotification]); // eslint-disable-line react-hooks/exhaustive-deps

  // [[Links]] a otras notas y backlinks
  const loadLinks = useCallback(async () => {
    const result = await getNoteLinks(note._id.toString());
    if (result.success && result.data) {
      setLinks(result.data.links);
      setBacklinks(result.data.backlinks);
    }
  }, [note._id]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  // En modo lectura, convertir [[Título]] en enlaces clicables
  const displayContent = useMemo(() => {
    if (isEditing || links.length === 0) return content;
    let out = content;
    for (const link of links) {
      out = out.replace(
        new RegExp(`\\[\\[${escapeRegExp(link.title)}\\]\\]`, 'gi'),
        `<a href="/notes/${link._id}" style="color:#0066cc;font-weight:600;text-decoration:none">${link.title}</a>`
      );
    }
    return out;
  }, [content, links, isEditing]);

  // Autosave con debounce mientras se edita
  useEffect(() => {
    if (!isEditing || content === savedContent) return;
    setSaveState('dirty');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void save(content);
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content, isEditing, savedContent, save]);

  // Guardar pendiente al salir del modo edición
  const stopEditing = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (content !== savedContent) await save(content);
    setIsEditing(false);
    setSaveState('idle');
  };

  const handleCancel = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setContent(savedContent);
    setEditorKey((k) => k + 1);
    setIsEditing(false);
    setSaveState('idle');
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteNote(note._id.toString(), userId);
      if (result.success) {
        showNotification('Nota eliminada', 'success');
        router.push(note.projectId ? `/parent-project/${note.projectId}` : '/dashboard');
      } else {
        setIsConfirmOpen(false);
        showNotification(result.error || 'Error al eliminar la nota', 'error');
      }
    } catch {
      setIsConfirmOpen(false);
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
              {noteTitle}
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
            {/* Estado de guardado */}
            {isEditing && (
              <span className="flex items-center gap-1 text-[11px] shrink-0 text-[#a0a0a8]">
                {saveState === 'saving' && <><Loader2 size={11} className="animate-spin" />Guardando…</>}
                {saveState === 'saved' && <><Check size={11} className="text-[#34c759]" />Guardado</>}
                {saveState === 'dirty' && <>Sin guardar…</>}
                {saveState === 'error' && <span className="text-red-500">Error al guardar</span>}
              </span>
            )}
          </div>

          {/* Acciones */}
          {!canEditNote && (
            <span className="flex items-center gap-1 shrink-0 text-[11px] text-[#b36400] bg-[#fff4e0] px-1.5 py-0.5 rounded-md font-medium">
              <Eye size={10} />
              Solo lectura
            </span>
          )}
          {!isEditing && canEditNote && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066cc] hover:bg-[#0055b3] active:bg-[#004499] text-white rounded-lg text-[12px] font-medium transition-colors shrink-0 shadow-sm"
            >
              <Edit2 size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">Editar</span>
            </button>
          )}
          {isEditing && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleCancel}
                disabled={saveState === 'saving'}
                className="px-3 py-1.5 text-[12px] font-medium text-[#636366] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-lg transition-colors disabled:opacity-40"
              >
                Descartar
              </button>
              <button
                onClick={stopEditing}
                disabled={saveState === 'saving'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066cc] hover:bg-[#0055b3] active:bg-[#004499] text-white rounded-lg text-[12px] font-medium transition-colors shadow-sm disabled:opacity-60"
              >
                {saveState === 'saving'
                  ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Save size={13} strokeWidth={2.5} />
                }
                <span className="hidden sm:inline">Listo</span>
              </button>
            </div>
          )}

          {/* Historial de versiones */}
          <button
            onClick={() => setVersionsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors shrink-0"
            title="Historial de versiones"
          >
            <History size={13} />
            <span className="hidden sm:inline">Historial</span>
          </button>

          {/* Compartir */}
          <button
            onClick={() => setShareDialogOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors shrink-0"
            title="Compartir nota"
          >
            <Share2 size={13} />
            <span className="hidden sm:inline">Compartir</span>
          </button>

          {/* Menú exportar */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShareMenuOpen((v) => !v)}
              className={`p-1.5 rounded-lg transition-colors ${
                shareMenuOpen
                  ? 'bg-[#f5f5f7] text-[#1d1d1f]'
                  : 'text-[#a0a0a8] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'
              }`}
              title="Exportar"
            >
              <MoreHorizontal size={15} />
            </button>
            {shareMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShareMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-[#e5e5e5] overflow-hidden z-50">
                  <div className="p-1">
                    <button
                      onClick={() => {
                        exportNoteAsMarkdown(note.title, content);
                        setShareMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2.5 rounded-lg transition-colors"
                    >
                      <FileDown size={13} className="text-[#7a7a7a]" />
                      Exportar Markdown
                    </button>
                    <button
                      onClick={() => {
                        if (!printNoteAsPdf(note.title, displayContent)) {
                          showNotification('El navegador bloqueó la ventana de impresión', 'error');
                        }
                        setShareMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-[13px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2.5 rounded-lg transition-colors"
                    >
                      <Printer size={13} className="text-[#7a7a7a]" />
                      Exportar PDF (imprimir)
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Eliminar (solo propietario) */}
          {isNoteOwner && (
            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={isDeleting}
              className="p-1.5 rounded-lg text-[#a0a0a8] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 shrink-0"
              title="Eliminar nota"
            >
              <Trash2 size={15} />
            </button>
          )}

        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <NoteEditor
            key={editorKey}
            content={isEditing ? content : displayContent}
            onChange={setContent}
            editable={isEditing}
            placeholder="Escribe el contenido de tu nota... (usa [[Título]] para enlazar otra nota)"
            uploadScope="note-image"
            uploadResourceId={note._id.toString()}
          />
        </div>

        {/* Enlaces y backlinks */}
        {(links.length > 0 || backlinks.length > 0) && !isEditing && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {links.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-[#f0f0f2]">
                <h4 className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                  <Link2 size={11} />
                  Enlaces ({links.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {links.map((l) => (
                    <button
                      key={l._id}
                      onClick={() => router.push(`/notes/${l._id}`)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f5f5f7] hover:bg-[#e8f0fb] text-[12px] text-[#1d1d1f] hover:text-[#0066cc] transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                      {l.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {backlinks.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-[#f0f0f2]">
                <h4 className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                  <CornerUpLeft size={11} />
                  Referenciada en ({backlinks.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {backlinks.map((l) => (
                    <button
                      key={l._id}
                      onClick={() => router.push(`/notes/${l._id}`)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f5f5f7] hover:bg-[#e8f0fb] text-[12px] text-[#1d1d1f] hover:text-[#0066cc] transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                      {l.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Comentarios de la nota */}
        {!isEditing && (
          <div className="max-w-7xl mx-auto">
            <NoteComments
              noteId={note._id.toString()}
              initialComments={note.comments ?? []}
              currentUserId={userId}
              currentUserName={session?.user?.name ?? ''}
              currentUserImage={session?.user?.image ?? undefined}
              isNoteOwner={isNoteOwner}
              canComment={canEditNote || note.visibility === 'shared'}
            />
          </div>
        )}
      </div>

      {/* Panel de historial de versiones */}
      <NoteVersionsPanel
        isOpen={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        noteId={note._id.toString()}
        canEdit={canEditNote}
        onRestored={(title, restoredContent) => {
          setNoteTitle(title);
          setContent(restoredContent);
          setSavedContent(restoredContent);
          setEditorKey((k) => k + 1);
          setIsEditing(false);
        }}
      />

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
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar nota"
        message="¿Estás seguro de que quieres eliminar esta nota? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        isLoading={isDeleting}
        variant="danger"
      />
    </>
  );
}
