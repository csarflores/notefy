'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import NoteEditor from '@/components/notes/NoteEditor';
import { updateTask, addComment, deleteComment, addReply, deleteReply } from '@/actions/task-actions';
import { getBoardUsers } from '@/actions/board-actions';
import { getProjectTags } from '@/actions/tag-actions';
import { IComment, IReply, ITag, ITask, IUser } from '@/types';
import { X, Plus, Check, Save, Send, Trash2, MessageSquare, LayoutList, CornerDownRight } from 'lucide-react';
import { generateRandomColor } from '@/lib/utils';

function formatCommentDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `hace ${diffDays}d`;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ITask;
}

const STATUS_OPTIONS = [
  {
    value: 'todo',
    label: 'Pendiente',
    dot: '#8e8e93',
    activeClass: 'bg-[#f5f5f7] text-[#3a3a3c] ring-1 ring-[#c7c7cc]',
  },
  {
    value: 'in-progress',
    label: 'En Proceso',
    dot: '#0066cc',
    activeClass: 'bg-[#e8f0fb] text-[#0055aa] ring-1 ring-[#0066cc]/25',
  },
  {
    value: 'done',
    label: 'Finalizado',
    dot: '#34c759',
    activeClass: 'bg-[#e6f9ec] text-[#1a7a33] ring-1 ring-[#34c759]/35',
  },
] as const;

type ActiveTab = 'details' | 'comments';

export default function EditTaskModal({ isOpen, onClose, task }: EditTaskModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'todo' | 'in-progress' | 'done'>('todo');
  const [tags, setTags] = useState<ITag[]>([]);
  const [newTagText, setNewTagText] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [projectUsers, setProjectUsers] = useState<IUser[]>([]);
  const [projectTags, setProjectTags] = useState<ITag[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<IComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isAddingReply, setIsAddingReply] = useState(false);
  const hasLoadedRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) setActiveTab('details');
  }, [isOpen]);

  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setTags(task.tags || []);
      setComments((task.comments as any[]) || []);
      setAssignedTo(
        task.assignedTo.map((user: any) => user?._id?.toString() ?? user.toString())
      );
      setDueDate(
        task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
      );
      setDeliveryDate(
        task.deliveryDate
          ? new Date(task.deliveryDate).toISOString().split('T')[0]
          : ''
      );

      const boardId = task.boardId?.toString();
      if (boardId && hasLoadedRef.current !== boardId) {
        loadProjectData();
        hasLoadedRef.current = boardId;
      }
    }
  }, [task, isOpen]);

  // Scroll al último comentario cuando se agrega uno nuevo
  useEffect(() => {
    if (activeTab === 'comments') {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, activeTab]);

  const loadProjectData = async () => {
    if (!task?.boardId) return;
    const [usersResult, tagsResult] = await Promise.all([
      getBoardUsers(task.boardId.toString()),
      getProjectTags(task.boardId.toString()),
    ]);

    if (usersResult.success && usersResult.data) {
      setProjectUsers(usersResult.data);
      if (usersResult.data.length === 1) {
        setAssignedTo([usersResult.data[0]._id.toString()]);
      }
    }
    if (tagsResult.success && tagsResult.data) {
      setProjectTags(tagsResult.data);
    }
  };

  const handleAddTag = () => {
    if (!newTagText.trim() || tags.length >= 5) return;
    const newTag = { text: newTagText.trim(), color: generateRandomColor() };
    const tagExists = projectTags.some(
      (t) => t.text.toLowerCase() === newTag.text.toLowerCase()
    );
    if (!tagExists) setProjectTags([...projectTags, newTag]);
    setTags([...tags, newTag]);
    setNewTagText('');
  };

  const handleToggleTag = (tag: ITag) => {
    const isSelected = tags.some((t) => t.text === tag.text);
    if (isSelected) {
      setTags(tags.filter((t) => t.text !== tag.text));
    } else if (tags.length < 5) {
      setTags([...tags, tag]);
    }
  };

  const handleToggleUser = (userId: string) => {
    if (assignedTo.includes(userId)) {
      setAssignedTo(assignedTo.filter((id) => id !== userId));
    } else {
      setAssignedTo([...assignedTo, userId]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('El título es requerido');
      return;
    }
    if (description.length > 50000) {
      setError('La descripción excede el límite de 50,000 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateTask(task._id.toString(), {
        title: title.trim(),
        description: description.trim(),
        status,
        tags,
        assignedTo,
        dueDate: dueDate || null,
        deliveryDate: deliveryDate || null,
      });

      if (result.success) {
        onClose();
        router.refresh();
      } else {
        setError(result.error || 'Error al actualizar la tarea');
      }
    } catch {
      setError('Error inesperado al actualizar la tarea');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || isAddingComment) return;
    setIsAddingComment(true);
    const result = await addComment(task._id.toString(), newComment);
    if (result.success && result.data) {
      setComments((prev) => [...prev, result.data as IComment]);
      setNewComment('');
    }
    setIsAddingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const result = await deleteComment(task._id.toString(), commentId);
    if (result.success) {
      setComments((prev) => prev.filter((c: any) => c._id?.toString() !== commentId));
    }
  };

  const handleAddReply = async (commentId: string) => {
    if (!replyContent.trim() || isAddingReply) return;
    setIsAddingReply(true);
    const result = await addReply(task._id.toString(), commentId, replyContent);
    if (result.success && result.data) {
      setComments((prev) =>
        prev.map((c: any) =>
          c._id?.toString() === commentId
            ? { ...c, replies: [...(c.replies || []), result.data as IReply] }
            : c
        )
      );
      setReplyContent('');
      setReplyingToId(null);
    }
    setIsAddingReply(false);
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    const result = await deleteReply(task._id.toString(), commentId, replyId);
    if (result.success) {
      setComments((prev) =>
        prev.map((c: any) =>
          c._id?.toString() === commentId
            ? { ...c, replies: (c.replies || []).filter((r: any) => r._id?.toString() !== replyId) }
            : c
        )
      );
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="max-w-xl"
      headerContent={
        <div>
          {/* Fila título + acciones */}
          <div className="flex items-center gap-3 px-6 pt-4 pb-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight border-none outline-none bg-transparent w-full placeholder:text-[#c7c7cc] placeholder:font-normal"
              placeholder="Nombre de la tarea..."
              disabled={isLoading}
            />
            <div className="flex items-center gap-2.5 shrink-0">
              {activeTab === 'details' && (
                <button
                  type="button"
                  onClick={() => formRef.current?.requestSubmit()}
                  disabled={isLoading || !title.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0066cc] text-white text-[13px] font-medium hover:bg-[#0055aa] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Save size={13} />
                  {isLoading ? 'Guardando…' : 'Guardar'}
                </button>
              )}
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="text-[#aaaaaa] hover:text-[#1d1d1f] transition-colors disabled:opacity-40"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Pestañas */}
          <div className="flex gap-0.5 px-5 pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-t-lg border-b-2 transition-all ${
                activeTab === 'details'
                  ? 'text-[#0066cc] border-[#0066cc]'
                  : 'text-[#8e8e93] border-transparent hover:text-[#3a3a3c]'
              }`}
            >
              <LayoutList size={13} />
              Detalles
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-t-lg border-b-2 transition-all ${
                activeTab === 'comments'
                  ? 'text-[#0066cc] border-[#0066cc]'
                  : 'text-[#8e8e93] border-transparent hover:text-[#3a3a3c]'
              }`}
            >
              <MessageSquare size={13} />
              Comentarios
              {comments.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold transition-colors ${
                    activeTab === 'comments'
                      ? 'bg-[#e8f0fb] text-[#0066cc]'
                      : 'bg-[#f5f5f7] text-[#8e8e93]'
                  }`}
                >
                  {comments.length}
                </span>
              )}
            </button>
          </div>
        </div>
      }
    >
      {/* Pestaña Detalles */}
      {activeTab === 'details' && (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

          {/* Estado */}
          <div>
            <p className="text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-2">
              Estado
            </p>
            <div className="flex gap-1.5">
              {STATUS_OPTIONS.map((option) => {
                const isActive = status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                      isActive
                        ? option.activeClass
                        : 'text-[#8e8e93] hover:bg-[#f5f5f7]'
                    }`}
                    disabled={isLoading}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
                      style={{ backgroundColor: isActive ? option.dot : '#d1d1d6' }}
                    />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="dueDate"
                className="block text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-1.5"
              >
                Fecha límite
              </label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[13px] text-[#1d1d1f] bg-white"
                disabled={isLoading}
              />
            </div>
            <div>
              <label
                htmlFor="deliveryDate"
                className="block text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-1.5"
              >
                Fecha entrega
              </label>
              <input
                id="deliveryDate"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[13px] text-[#1d1d1f] bg-white"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Asignar miembros */}
          {projectUsers.length > 1 && (
            <div>
              <p className="text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-2">
                Asignar a
              </p>
              <div className="flex flex-wrap gap-2">
                {projectUsers.map((user) => {
                  const isSelected = assignedTo.includes(user._id.toString());
                  return (
                    <button
                      key={user._id.toString()}
                      type="button"
                      onClick={() => handleToggleUser(user._id.toString())}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] transition-all ${
                        isSelected
                          ? 'border-[#0066cc] bg-[#e8f0fb] text-[#0055aa]'
                          : 'border-[#e5e5ea] text-[#3a3a3c] hover:border-[#c7c7cc]'
                      }`}
                      disabled={isLoading}
                    >
                      <Avatar src={user.image} name={user.name} size="sm" />
                      <span>{user.name}</span>
                      {isSelected && <Check size={11} className="text-[#0066cc]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Etiquetas */}
          <div>
            <p className="text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-2">
              Etiquetas{' '}
              <span className="normal-case font-normal text-[#c7c7cc]">
                ({tags.length}/5)
              </span>
            </p>

            {projectTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {projectTags.map((tag, index) => {
                  const isSelected = tags.some((t) => t.text === tag.text);
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`transition-opacity ${
                        isSelected ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                      }`}
                      disabled={isLoading || (!isSelected && tags.length >= 5)}
                    >
                      <Badge variant="tag" color={tag.color}>
                        {tag.text}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12px] text-[#c7c7cc] mb-2.5">
                Sin etiquetas en este proyecto
              </p>
            )}

            <div className="flex gap-1.5">
              <input
                type="text"
                value={newTagText}
                onChange={(e) => setNewTagText(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), handleAddTag())
                }
                className="flex-1 px-3 py-2 rounded-lg border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[12px] placeholder:text-[#c7c7cc]"
                placeholder="Nueva etiqueta..."
                maxLength={30}
                disabled={isLoading || tags.length >= 5}
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!newTagText.trim() || isLoading || tags.length >= 5}
                className="px-3 py-2 rounded-lg border border-[#e5e5ea] text-[#8e8e93] hover:border-[#0066cc] hover:text-[#0066cc] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <p className="text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-2">
              Descripción{' '}
              <span className="normal-case font-normal text-[#c7c7cc]">(opcional)</span>
            </p>
            <div className="rounded-lg border border-[#e5e5ea] overflow-hidden focus-within:border-[#0066cc] focus-within:ring-2 focus-within:ring-[#0066cc]/10 transition-all">
              <NoteEditor
                key={isOpen ? `editor-${task._id}` : 'editor-empty'}
                content={description}
                onChange={setDescription}
                editable={true}
                placeholder="Descripción de la tarea..."
                maxLength={50000}
                showCharCount={true}
                minHeight="120px"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-[12px] text-red-500">{error}</p>
            </div>
          )}
        </form>
      )}

      {/* Pestaña Comentarios */}
      {activeTab === 'comments' && (
        <div className="flex flex-col h-full min-h-[320px]">
          {/* Lista de comentarios */}
          <div className="flex-1 space-y-4 mb-4">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare size={28} className="text-[#d1d1d6] mb-2" />
                <p className="text-[13px] text-[#8e8e93]">Sin comentarios aún</p>
                <p className="text-[12px] text-[#c7c7cc] mt-0.5">Escribí el primero abajo</p>
              </div>
            ) : (
              (comments as any[]).map((comment: any) => {
                const commentId = comment._id?.toString();
                const isOwnComment = session?.user?.id && comment.authorId?.toString() === session.user.id;
                const isReplying = replyingToId === commentId;
                const replies: any[] = comment.replies || [];

                return (
                  <div key={commentId} className="group">
                    {/* Comentario principal */}
                    <div className="flex gap-3">
                      <Avatar src={comment.authorImage} name={comment.authorName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-[#1d1d1f]">
                            {comment.authorName}
                          </span>
                          <span className="text-[11px] text-[#c7c7cc]">
                            {formatCommentDate(comment.createdAt)}
                          </span>
                          {isOwnComment && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(commentId)}
                              className="ml-auto opacity-0 group-hover:opacity-100 text-[#c7c7cc] hover:text-red-400 transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <p className="text-[13px] text-[#3a3a3c] leading-relaxed mt-1 break-words whitespace-pre-wrap">
                          {comment.content}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToId(isReplying ? null : commentId);
                            setReplyContent('');
                          }}
                          className="mt-1.5 flex items-center gap-1 text-[11px] text-[#8e8e93] hover:text-[#0066cc] transition-colors"
                        >
                          <CornerDownRight size={11} />
                          Responder
                        </button>
                      </div>
                    </div>

                    {/* Respuestas */}
                    {(replies.length > 0 || isReplying) && (
                      <div className="ml-9 mt-2 pl-3 border-l-2 border-[#f0f0f0] space-y-3">
                        {replies.map((reply: any) => {
                          const replyId = reply._id?.toString();
                          const isOwnReply = session?.user?.id && reply.authorId?.toString() === session.user.id;
                          return (
                            <div key={replyId} className="flex gap-2.5 group/reply">
                              <Avatar src={reply.authorImage} name={reply.authorName} size="sm" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[12px] font-semibold text-[#1d1d1f]">
                                    {reply.authorName}
                                  </span>
                                  <span className="text-[11px] text-[#c7c7cc]">
                                    {formatCommentDate(reply.createdAt)}
                                  </span>
                                  {isOwnReply && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteReply(commentId, replyId)}
                                      className="ml-auto opacity-0 group-hover/reply:opacity-100 text-[#c7c7cc] hover:text-red-400 transition-all"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                                <p className="text-[13px] text-[#3a3a3c] leading-relaxed mt-1 break-words whitespace-pre-wrap">
                                  {reply.content}
                                </p>
                              </div>
                            </div>
                          );
                        })}

                        {/* Input de respuesta */}
                        {isReplying && (
                          <div className="flex gap-2 items-start pt-1">
                            {session?.user && (
                              <Avatar src={session.user.image} name={session.user.name} size="sm" />
                            )}
                            <div className="flex-1 flex gap-1.5">
                              <input
                                key={`reply-input-${commentId}`}
                                type="text"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); handleAddReply(commentId); }
                                  if (e.key === 'Escape') { setReplyingToId(null); setReplyContent(''); }
                                }}
                                className="flex-1 px-3 py-1.5 rounded-lg border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[12px] placeholder:text-[#c7c7cc]"
                                placeholder={`Responder a ${comment.authorName}…`}
                                maxLength={2000}
                                disabled={isAddingReply}
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleAddReply(commentId)}
                                disabled={!replyContent.trim() || isAddingReply}
                                className="px-2.5 py-1.5 rounded-lg bg-[#0066cc] text-white hover:bg-[#0055aa] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                              >
                                <Send size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => { setReplyingToId(null); setReplyContent(''); }}
                                className="px-2.5 py-1.5 rounded-lg text-[#8e8e93] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Input para nuevo comentario */}
          <div className="flex gap-2 pt-3 border-t border-[#f0f0f0]">
            {session?.user && (
              <Avatar
                src={session.user.image}
                name={session.user.name}
                size="sm"
              />
            )}
            <div className="flex-1 flex gap-1.5">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), handleAddComment())
                }
                className="flex-1 px-3 py-2 rounded-lg border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[13px] placeholder:text-[#c7c7cc]"
                placeholder="Agregar un comentario..."
                maxLength={2000}
                disabled={isAddingComment}
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddComment}
                disabled={!newComment.trim() || isAddingComment}
                className="px-3 py-2 rounded-lg bg-[#0066cc] text-white hover:bg-[#0055aa] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
