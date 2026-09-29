'use client';

import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import { addNoteComment, deleteNoteComment } from '@/actions/note-actions';
import { IComment } from '@/types';
import { MessageSquare, Send, Trash2 } from 'lucide-react';

function formatCommentDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `hace ${diffDays}d`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function NoteComments({
  noteId,
  initialComments,
  currentUserId,
  currentUserName,
  currentUserImage,
  isNoteOwner,
  canComment,
}: {
  noteId: string;
  initialComments: IComment[];
  currentUserId: string;
  currentUserName: string;
  currentUserImage?: string;
  isNoteOwner: boolean;
  canComment: boolean;
}) {
  const [comments, setComments] = useState<IComment[]>(initialComments ?? []);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  const handleAdd = async () => {
    if (!newComment.trim() || sending) return;
    setSending(true);
    const res = await addNoteComment(noteId, newComment);
    if (res.success && res.data) {
      setComments((prev) => [...prev, res.data as IComment]);
      setNewComment('');
    }
    setSending(false);
  };

  const handleDelete = async (commentId: string) => {
    const res = await deleteNoteComment(noteId, commentId);
    if (res.success) {
      setComments((prev) => prev.filter((c) => c._id.toString() !== commentId));
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-[#f0f0f2] mt-4">
      <h4 className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <MessageSquare size={11} />
        Comentarios {comments.length > 0 && `(${comments.length})`}
      </h4>

      {comments.length > 0 && (
        <div className="space-y-4 mb-4">
          {comments.map((comment) => {
            const id = comment._id.toString();
            const canDelete = isNoteOwner || comment.authorId?.toString() === currentUserId;
            return (
              <div key={id} className="group flex gap-2.5">
                <Avatar src={comment.authorImage} name={comment.authorName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-[#1d1d1f]">
                      {comment.authorName}
                    </span>
                    <span className="text-[11px] text-[#c7c7cc]">
                      {formatCommentDate(comment.createdAt)}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(id)}
                        className="ml-auto opacity-0 group-hover:opacity-100 text-[#c7c7cc] hover:text-red-400 transition-all"
                        aria-label="Eliminar comentario"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-[13px] text-[#3a3a3c] leading-relaxed mt-0.5 wrap-break-word whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canComment ? (
        <div className="flex gap-2 items-start">
          <Avatar src={currentUserImage} name={currentUserName} size="sm" />
          <div className="flex-1 flex gap-1.5">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
              className="flex-1 px-3 py-1.5 rounded-lg border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[12px] placeholder:text-[#c7c7cc]"
              placeholder="Escribe un comentario..."
              maxLength={2000}
            />
            <button
              onClick={handleAdd}
              disabled={!newComment.trim() || sending}
              className="px-2.5 py-1.5 rounded-lg bg-[#0066cc] text-white hover:bg-[#0055aa] disabled:opacity-40 transition-all"
              aria-label="Enviar comentario"
            >
              <Send size={12} />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-[#a0a0a8]">Tienes acceso de solo lectura a esta nota.</p>
      )}
    </div>
  );
}
