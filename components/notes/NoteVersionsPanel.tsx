'use client';

import { useEffect, useState } from 'react';
import Drawer from '@/components/ui/Drawer';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import {
  getNoteVersions,
  restoreNoteVersion,
  deleteNoteVersion,
} from '@/actions/note-actions';
import { INoteVersion } from '@/types';
import { useNotification } from '@/components/ui/NotificationContext';
import { X, History, Loader2, RotateCcw, Trash2, Eye } from 'lucide-react';

function formatVersionDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NoteVersionsPanel({
  isOpen,
  onClose,
  noteId,
  canEdit,
  onRestored,
}: {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  canEdit: boolean;
  onRestored: (title: string, content: string) => void;
}) {
  const { showNotification } = useNotification();
  const [versions, setVersions] = useState<INoteVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<INoteVersion | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await getNoteVersions(noteId);
    if (res.success && res.data) setVersions(res.data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, noteId]);

  const handleRestore = async (versionId: string) => {
    setBusyId(versionId);
    const res = await restoreNoteVersion(noteId, versionId);
    setBusyId(null);
    if (res.success && res.data) {
      showNotification('Versión restaurada', 'success');
      onRestored(res.data.title, res.data.content);
      onClose();
    } else {
      showNotification(res.error || 'Error al restaurar la versión', 'error');
    }
  };

  const handleDelete = async (versionId: string) => {
    setBusyId(versionId);
    const res = await deleteNoteVersion(noteId, versionId);
    setBusyId(null);
    if (res.success) {
      setVersions((prev) => prev.filter((v) => v._id.toString() !== versionId));
    } else {
      showNotification(res.error || 'Error al eliminar la versión', 'error');
    }
  };

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} className="sm:w-[420px]">
        <div className="flex items-center gap-2 px-5 h-12 border-b border-[#f0f0f0] shrink-0">
          <History size={14} className="text-[#8e8e93]" />
          <h2 className="text-[14px] font-semibold text-[#1d1d1f]">Historial de versiones</h2>
          <button
            onClick={onClose}
            className="ml-auto text-[#aaaaaa] hover:text-[#1d1d1f] transition-colors"
            aria-label="Cerrar historial"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={18} className="animate-spin text-[#a0a0a8]" />
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <History size={22} className="text-[#d1d1d6] mb-2" />
              <p className="text-[13px] text-[#7a7a7a]">Sin versiones anteriores</p>
              <p className="text-[11.5px] text-[#a0a0a8] mt-1">
                Cada vez que edites la nota guardamos una copia automáticamente.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {versions.map((v, i) => {
                const id = v._id.toString();
                const busy = busyId === id;
                return (
                  <li
                    key={id}
                    className="rounded-xl border border-[#e5e5ea] px-3.5 py-3 hover:border-[#d1d1d6] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar src={undefined} name={v.savedByName || 'Editor'} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium text-[#1d1d1f] truncate">
                          {i === 0 ? 'Versión más reciente' : `Versión ${versions.length - i}`}
                        </p>
                        <p className="text-[11px] text-[#a0a0a8]">
                          {formatVersionDate(v.createdAt)}
                          {v.savedByName ? ` · ${v.savedByName}` : ''}
                        </p>
                      </div>
                    </div>
                    <p className="text-[12px] text-[#7a7a7a] truncate mt-1.5">
                      {v.title || '(sin título)'}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        onClick={() => setPreview(v)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors"
                      >
                        <Eye size={11} />
                        Ver
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => handleRestore(id)}
                          disabled={busy}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#0066cc] hover:bg-[#e8f0fb] transition-colors disabled:opacity-40"
                        >
                          {busy ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                          Restaurar
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(id)}
                        disabled={busy}
                        className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#a0a0a8] hover:text-[#ff3b30] hover:bg-[#ffeceb] transition-colors disabled:opacity-40"
                        title="Eliminar esta versión"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Drawer>

      {/* Preview de una versión */}
      <Modal
        isOpen={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? `${preview.title || '(sin título)'} — ${formatVersionDate(preview.createdAt)}` : ''}
        className="max-w-3xl"
      >
        {preview && (
          <div
            className="ProseMirror text-[14px] leading-relaxed text-[#1d1d1f]"
            dangerouslySetInnerHTML={{ __html: preview.content }}
          />
        )}
      </Modal>
    </>
  );
}
