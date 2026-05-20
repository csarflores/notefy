'use client';

import { INote } from '@/types';
import { FileText, Lock, Users, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTabContext } from '@/components/tabs/TabContext';
import { formatDate } from '@/lib/utils';
import SidebarContextMenu from '@/components/layout/SidebarContextMenu';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { deleteNote } from '@/actions/note-actions';

interface NoteCardProps {
  note: INote;
  onOpenNote?: () => void;
  isOwner?: boolean;
  userId?: string;
  onDelete?: () => void;
}

export default function NoteCard({ note, onOpenNote, isOwner = true, userId, onDelete }: NoteCardProps) {
  const router = useRouter();
  const { openTab } = useTabContext();
  const [preview, setPreview] = useState('');
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!userId) return;
    setIsDeleting(true);
    try {
      await deleteNote(note._id.toString(), userId);
      onDelete?.();
      router.refresh();
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const tmp = document.createElement('div');
      tmp.innerHTML = note.content;
      const text = tmp.textContent || tmp.innerText || '';
      setPreview(text.length > 90 ? text.substring(0, 90) + '…' : text);
    }
  }, [note.content]);

  const handleOpen = () => {
    if (onOpenNote) {
      onOpenNote();
      return;
    }
    openTab({
      id: `board-${note._id}`,
      type: 'board',
      title: note.title,
      url: `/notes/${note._id}`,
      resourceId: note._id.toString(),
    });
    router.push(`/notes/${note._id}`);
  };

  const noteColor = '#10b981';

  return (
    <>
      <div
        onClick={handleOpen}
        onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
        className="group relative bg-white rounded-xl border border-[#e0e0e0] overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer"
      >
        {/* Color accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: noteColor }} />

        <div className="pl-4 pr-3 py-3">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: noteColor + '1a' }}>
              <FileText size={13} style={{ color: noteColor }} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[14px] font-semibold text-[#1d1d1f] truncate tracking-[-0.2px] group-hover:text-[#0066cc] transition-colors">
                {note.title}
              </h3>
              <p className="text-[11px] text-[#7a7a7a] line-clamp-2 mt-0.5 min-h-[32px]">
                {preview || 'Sin contenido'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#f0f0f2]">
            <div className="flex items-center gap-1">
              {note.visibility === 'private' ? (
                <><Lock size={11} className="text-[#a0a0a8]" /><span className="text-[11px] text-[#a0a0a8]">Privada</span></>
              ) : (
                <><Users size={11} className="text-[#a0a0a8]" /><span className="text-[11px] text-[#a0a0a8]">Compartida</span></>
              )}
            </div>
            <span className="text-[11px] text-[#a0a0a8]">{formatDate(note.updatedAt)}</span>
          </div>
        </div>
      </div>

      {ctxMenu && (
        <SidebarContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={[
            { label: 'Editar', icon: Pencil, onClick: handleOpen },
            { label: 'Abrir', icon: ExternalLink, onClick: handleOpen },
            ...(isOwner && userId ? [{ label: 'Eliminar', icon: Trash2, onClick: () => setShowDeleteDialog(true), variant: 'danger' as const, separator: true }] : []),
          ]}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {isOwner && userId && (
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          title="Eliminar nota"
          message={
            <div className="space-y-2">
              <p className="text-[#7a7a7a]">¿Eliminar la nota <strong>"{note.title}"</strong>?</p>
              <p className="text-sm text-red-500">Esta acción no se puede deshacer.</p>
            </div>
          }
          confirmText="Eliminar"
          isLoading={isDeleting}
          variant="danger"
        />
      )}
    </>
  );
}
