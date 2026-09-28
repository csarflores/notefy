'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Drawer from '@/components/ui/Drawer';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import NoteEditor from '@/components/notes/NoteEditor';
import {
  createTask,
  updateTask,
  updateTaskChecklist,
  addComment,
  deleteComment,
  addReply,
  deleteReply,
} from '@/actions/task-actions';
import { getBoardUsers, getBoardColumnsAction } from '@/actions/board-actions';
import { getBoardTags } from '@/actions/tag-actions';
import {
  setTaskCover,
  clearTaskCover,
  addTaskAttachment,
  removeTaskAttachment,
} from '@/actions/upload-actions';
import { useUpload } from '@/hooks/useUpload';
import {
  IChecklistItem,
  IComment,
  IReply,
  ITag,
  ITask,
  ITaskAttachment,
  IUser,
  TaskPriority,
  IBoardColumn,
  UpdateTaskInput,
} from '@/types';
import { getBoardColumns } from '@/lib/board-columns';
import {
  X,
  Plus,
  Check,
  Send,
  Trash2,
  MessageSquare,
  CornerDownRight,
  ImagePlus,
  Paperclip,
  ListChecks,
  LayoutList,
  Flag,
  Calendar,
  Users,
  Tags,
  AlignLeft,
  Loader2,
} from 'lucide-react';
import { generateRandomColor, escapeRegExp } from '@/lib/utils';
import { PRIORITY_OPTIONS } from './PriorityPicker';

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
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function formatFileSize(size: number): string {
  return size >= 1048576
    ? `${(size / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;
}

// boardId puede venir poblado (documento) o como ObjectId
function getTaskBoardId(boardId: ITask['boardId']): string | undefined {
  const ref = boardId as unknown as { _id?: { toString(): string }; toString(): string } | null | undefined;
  if (!ref) return undefined;
  return ref._id?.toString() ?? ref.toString();
}

interface TaskDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Si está presente, modo edición con autosave. Si no, modo creación. */
  task?: ITask | null;
  /** Requerido en modo creación. */
  boardId?: string;
  defaultStatus?: string;
  columns?: IBoardColumn[];
  onCreated?: (task: ITask) => void;
  /** Permiso de edición sobre la tarea (owner/editor del tablero). */
  canEdit?: boolean;
  /** Permiso para comentar (owner/editor/commenter). */
  canComment?: boolean;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function PropertyRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <div className="w-[104px] shrink-0 flex items-center gap-1.5 pt-1 text-[12px] text-[#8e8e93]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest">
      {children}
    </p>
  );
}

export default function TaskDetailPanel({
  isOpen,
  onClose,
  task,
  boardId,
  defaultStatus,
  columns: columnsProp,
  onCreated,
  canEdit = true,
  canComment = true,
}: TaskDetailPanelProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isEdit = !!task;
  const resolvedBoardId = isEdit ? getTaskBoardId(task.boardId) : boardId;

  // Formulario
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('todo');
  const [boardColumns, setBoardColumns] = useState<IBoardColumn[]>(() => getBoardColumns(columnsProp));
  const [priority, setPriority] = useState<TaskPriority | null>(null);
  const [tags, setTags] = useState<ITag[]>([]);
  const [newTagText, setNewTagText] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [boardUsers, setBoardUsers] = useState<IUser[]>([]);
  const [projectTags, setProjectTags] = useState<ITag[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [checklist, setChecklist] = useState<IChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [comments, setComments] = useState<IComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isAddingReply, setIsAddingReply] = useState(false);
  const [error, setError] = useState('');

  // Portada y adjuntos
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [attachments, setAttachments] = useState<ITaskAttachment[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  // Estado de guardado / creación
  const [isCreating, setIsCreating] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const pendingImagesRef = useRef<Map<string, File>>(new Map());
  const hasLoadedRef = useRef<string | null>(null);
  const loadedTaskIdRef = useRef<string | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const savedTitleRef = useRef('');
  const savedDescriptionRef = useRef('');
  const descriptionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { upload, progress, isUploading } = useUpload();

  const taskId = task?._id?.toString();

  // ─── Carga de datos del tablero ───────────────────────────────────────────
  const loadBoardData = useCallback(async () => {
    if (!resolvedBoardId) return;
    const [usersResult, tagsResult, columnsResult] = await Promise.all([
      getBoardUsers(resolvedBoardId),
      getBoardTags(resolvedBoardId),
      getBoardColumnsAction(resolvedBoardId),
    ]);

    if (columnsResult.success && columnsResult.data) {
      setBoardColumns(columnsResult.data);
    }
    if (usersResult.success && usersResult.data) {
      setBoardUsers(usersResult.data);
      if (usersResult.data.length === 1) {
        setAssignedTo((prev) => (prev.length === 0 ? [usersResult.data![0]._id.toString()] : prev));
      }
    }
    if (tagsResult.success && tagsResult.data) {
      setProjectTags(tagsResult.data);
    }
  }, [resolvedBoardId]);

  useEffect(() => {
    if (isOpen && resolvedBoardId && hasLoadedRef.current !== resolvedBoardId) {
      loadBoardData();
      hasLoadedRef.current = resolvedBoardId;
    }
  }, [isOpen, resolvedBoardId, loadBoardData]);

  // ─── Poblado del formulario ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      loadedTaskIdRef.current = null;
      return;
    }

    if (isEdit && task) {
      // Solo poblar al abrir otra tarea: si el prop `task` cambia mientras se edita
      // (revalidatePath), no pisar las ediciones del usuario.
      if (loadedTaskIdRef.current !== taskId) {
        loadedTaskIdRef.current = taskId!;
        setTitle(task.title);
        savedTitleRef.current = task.title;
        const desc = task.description || '';
        setDescription(desc);
        savedDescriptionRef.current = desc;
        setStatus(task.status);
        setTags(task.tags || []);
        setComments(task.comments || []);
        setAssignedTo(
          (task.assignedTo as unknown as { _id?: { toString(): string }; toString(): string }[]).map(
            (user) => user._id?.toString() ?? user.toString()
          )
        );
        setCoverUrl(task.imageUrl || '');
        setAttachments(task.attachments || []);
        setPriority(task.priority ?? null);
        setChecklist(task.checklist || []);
        setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
        setDeliveryDate(
          task.deliveryDate ? new Date(task.deliveryDate).toISOString().split('T')[0] : ''
        );
      }
    } else {
      const valid = boardColumns.some((c) => c.id === defaultStatus);
      setStatus(valid ? defaultStatus! : boardColumns[0]?.id || 'todo');
    }
  }, [task, isOpen, isEdit, taskId, defaultStatus, boardColumns]);

  // Autosize del título
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [title, isOpen]);

  // ─── Autosave (modo edición) ──────────────────────────────────────────────
  const saveField = useCallback(
    async (patch: UpdateTaskInput) => {
      if (!taskId) return;
      setSaveState('saving');
      const result = await updateTask(taskId, patch);
      setSaveState(result.success ? 'saved' : 'error');
      if (!result.success) {
        setError(result.error || 'Error al guardar');
        return;
      }
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveState('idle'), 2000);
      router.refresh();
    },
    [taskId, router]
  );

  // Descripción: guardado con debounce
  useEffect(() => {
    if (!isEdit || !isOpen) return;
    if (description === savedDescriptionRef.current) return;
    if (description.length > 50000) return;

    if (descriptionTimerRef.current) clearTimeout(descriptionTimerRef.current);
    descriptionTimerRef.current = setTimeout(() => {
      savedDescriptionRef.current = description;
      saveField({ description: description.trim() });
    }, 800);

    return () => {
      if (descriptionTimerRef.current) clearTimeout(descriptionTimerRef.current);
    };
  }, [description, isEdit, isOpen, saveField]);

  const flushDescription = () => {
    if (descriptionTimerRef.current) {
      clearTimeout(descriptionTimerRef.current);
      descriptionTimerRef.current = null;
      if (isEdit && taskId && description !== savedDescriptionRef.current) {
        savedDescriptionRef.current = description;
        updateTask(taskId, { description: description.trim() }).then(() => router.refresh());
      }
    }
  };

  const handleTitleBlur = () => {
    if (!isEdit) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(savedTitleRef.current);
      return;
    }
    if (trimmed !== savedTitleRef.current) {
      savedTitleRef.current = trimmed;
      setTitle(trimmed);
      saveField({ title: trimmed });
    }
  };

  // ─── Creación ─────────────────────────────────────────────────────────────
  const resetCreateForm = () => {
    setTitle('');
    setDescription('');
    setTags([]);
    setAssignedTo([]);
    setDueDate('');
    setDeliveryDate('');
    setStatus(boardColumns[0]?.id || 'todo');
    setPriority(null);
    setCoverFile(null);
    setCoverPreview('');
    setAttachmentFiles([]);
    setError('');
  };

  const handleCreate = async () => {
    setError('');
    if (!title.trim()) {
      setError('El título es requerido');
      return;
    }
    if (description.length > 50000) {
      setError('La descripción excede el límite de 50,000 caracteres.');
      return;
    }
    if (!resolvedBoardId) return;

    setIsCreating(true);
    try {
      const result = await createTask({
        title: title.trim(),
        description: description.trim(),
        boardId: resolvedBoardId,
        status,
        tags,
        assignedTo,
        priority,
        dueDate: dueDate || null,
        deliveryDate: deliveryDate || null,
      });

      if (result.success && result.data) {
        const newTaskId = result.data._id.toString();
        if (coverFile) {
          const uploaded = await upload(coverFile, {
            scope: 'task-cover',
            resourceId: newTaskId,
          });
          if (!('error' in uploaded)) {
            await setTaskCover(newTaskId, uploaded.key);
          }
        }

        for (const file of attachmentFiles) {
          const uploaded = await upload(file, {
            scope: 'task-attachment',
            resourceId: newTaskId,
          });
          if (!('error' in uploaded)) {
            await addTaskAttachment(newTaskId, {
              key: uploaded.key,
              name: file.name,
              size: file.size,
              type: file.type,
            });
          }
        }

        // Subir las imágenes de la descripción y reemplazar las URLs locales
        let finalDescription = description;
        const pendingImages = Array.from(pendingImagesRef.current.entries()).filter(([blobUrl]) =>
          finalDescription.includes(blobUrl)
        );
        for (const [blobUrl, file] of pendingImages) {
          const uploaded = await upload(file, {
            scope: 'task-image',
            resourceId: newTaskId,
          });
          if (!('error' in uploaded)) {
            finalDescription = finalDescription.split(blobUrl).join(uploaded.publicUrl);
          } else {
            finalDescription = finalDescription.replace(
              new RegExp(`<img[^>]*src="${escapeRegExp(blobUrl)}"[^>]*>`, 'g'),
              ''
            );
          }
        }
        if (finalDescription !== description) {
          await updateTask(newTaskId, { description: finalDescription });
        }
        clearPendingImages();

        const created = result.data;
        resetCreateForm();
        onCreated?.(created);
        onClose();
        router.refresh();
      } else {
        setError(result.error || 'Error al crear la tarea');
      }
    } catch {
      setError('Error inesperado al crear la tarea');
    } finally {
      setIsCreating(false);
    }
  };

  // ─── Portada y adjuntos ───────────────────────────────────────────────────
  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('La portada debe ser una imagen');
      return;
    }
    setError('');

    if (!isEdit) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      return;
    }

    const result = await upload(file, {
      scope: 'task-cover',
      resourceId: taskId!,
    });
    if ('error' in result) {
      setError(result.error);
      return;
    }
    const saved = await setTaskCover(taskId!, result.key);
    if (saved.success && saved.data) {
      setCoverUrl(saved.data);
      router.refresh();
    } else {
      setError(saved.error || 'Error al guardar la portada');
    }
  };

  const handleRemoveCover = async () => {
    setError('');
    if (!isEdit) {
      setCoverFile(null);
      setCoverPreview('');
      return;
    }
    const result = await clearTaskCover(taskId!);
    if (result.success) {
      setCoverUrl('');
      router.refresh();
    } else {
      setError(result.error || 'Error al quitar la portada');
    }
  };

  const handleAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setError('');

    const valid: File[] = [];
    for (const file of files) {
      if (!/^(image\/(jpeg|png|webp|gif)|application\/pdf)$/.test(file.type)) {
        setError('Solo se permiten imágenes (JPEG, PNG, WebP, GIF) o PDF');
        continue;
      }
      if (file.size > 25 * 1024 * 1024) {
        setError(`"${file.name}" supera el límite de 25 MB`);
        continue;
      }
      valid.push(file);
    }
    if (valid.length === 0) return;

    if (!isEdit) {
      setAttachmentFiles((prev) => [...prev, ...valid].slice(0, 20));
      return;
    }

    for (const file of valid) {
      const result = await upload(file, {
        scope: 'task-attachment',
        resourceId: taskId!,
      });
      if ('error' in result) {
        setError(result.error);
        continue;
      }
      const saved = await addTaskAttachment(taskId!, {
        key: result.key,
        name: file.name,
        size: file.size,
        type: file.type,
      });
      if (saved.success && saved.data) {
        setAttachments((prev) => [...prev, saved.data as ITaskAttachment]);
      } else {
        setError(saved.error || 'Error al agregar el adjunto');
      }
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    setError('');
    const result = await removeTaskAttachment(taskId!, attachmentId);
    if (result.success) {
      setAttachments((prev) => prev.filter((a) => a._id.toString() !== attachmentId));
    } else {
      setError(result.error || 'Error al eliminar el adjunto');
    }
  };

  // La tarea aún no existe (modo crear): URL local + archivo pendiente de subir
  const handleLocalImage = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    pendingImagesRef.current.set(url, file);
    return url;
  }, []);

  const clearPendingImages = () => {
    pendingImagesRef.current.forEach((_, url) => URL.revokeObjectURL(url));
    pendingImagesRef.current.clear();
  };

  // ─── Etiquetas y asignados ────────────────────────────────────────────────
  const handleAddTag = () => {
    if (!newTagText.trim() || tags.length >= 5) return;
    const newTag = { text: newTagText.trim(), color: generateRandomColor() };
    const tagExists = projectTags.some(
      (t) => t.text.toLowerCase() === newTag.text.toLowerCase()
    );
    if (!tagExists) setProjectTags([...projectTags, newTag]);
    const next = [...tags, newTag];
    setTags(next);
    setNewTagText('');
    if (isEdit) saveField({ tags: next });
  };

  const handleToggleTag = (tag: ITag) => {
    const isSelected = tags.some((t) => t.text === tag.text);
    let next: ITag[];
    if (isSelected) {
      next = tags.filter((t) => t.text !== tag.text);
    } else if (tags.length < 5) {
      next = [...tags, tag];
    } else {
      return;
    }
    setTags(next);
    if (isEdit) saveField({ tags: next });
  };

  const handleToggleUser = (userId: string) => {
    const next = assignedTo.includes(userId)
      ? assignedTo.filter((id) => id !== userId)
      : [...assignedTo, userId];
    setAssignedTo(next);
    if (isEdit) saveField({ assignedTo: next });
  };

  const handleSelectStatus = (id: string) => {
    setStatus(id);
    if (isEdit) saveField({ status: id });
  };

  const handleSelectPriority = (value: TaskPriority | null) => {
    setPriority(value);
    if (isEdit) saveField({ priority: value });
  };

  const handleDateChange = (field: 'dueDate' | 'deliveryDate', value: string) => {
    if (field === 'dueDate') setDueDate(value);
    else setDeliveryDate(value);
    if (isEdit) saveField({ [field]: value || null });
  };

  // ─── Checklist (autosave inmediato) ───────────────────────────────────────
  const saveChecklist = async (items: IChecklistItem[]) => {
    setChecklist(items);
    if (!taskId) return;
    await updateTaskChecklist(
      taskId,
      items.map((c) => ({ _id: c._id?.toString(), text: c.text, done: c.done }))
    );
    router.refresh();
  };

  const handleAddChecklistItem = () => {
    const text = newChecklistText.trim();
    if (!text || checklist.length >= 20) return;
    saveChecklist([
      ...checklist,
      { _id: new Date().getTime().toString(), text, done: false } as unknown as IChecklistItem,
    ]);
    setNewChecklistText('');
  };

  // ─── Comentarios ──────────────────────────────────────────────────────────
  const handleAddComment = async () => {
    if (!newComment.trim() || isAddingComment || !taskId) return;
    setIsAddingComment(true);
    const result = await addComment(taskId, newComment);
    if (result.success && result.data) {
      setComments((prev) => [...prev, result.data as IComment]);
      setNewComment('');
    }
    setIsAddingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!taskId) return;
    const result = await deleteComment(taskId, commentId);
    if (result.success) {
      setComments((prev) => prev.filter((c: IComment) => c._id?.toString() !== commentId));
    }
  };

  const handleAddReply = async (commentId: string) => {
    if (!replyContent.trim() || isAddingReply || !taskId) return;
    setIsAddingReply(true);
    const result = await addReply(taskId, commentId, replyContent);
    if (result.success && result.data) {
      setComments((prev) =>
        prev.map((c: IComment) =>
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
    if (!taskId) return;
    const result = await deleteReply(taskId, commentId, replyId);
    if (result.success) {
      setComments((prev) =>
        prev.map((c: IComment) =>
          c._id?.toString() === commentId
            ? { ...c, replies: (c.replies || []).filter((r: IReply) => r._id?.toString() !== replyId) }
            : c
        )
      );
    }
  };

  const handleClose = () => {
    if (isCreating) return;
    flushDescription();
    if (!isEdit) {
      resetCreateForm();
      clearPendingImages();
    }
    setError('');
    onClose();
  };

  const busy = isCreating || (isUploading && !isEdit);
  const shownCover = isEdit ? coverUrl : coverPreview;

  // Avatar del usuario actual desde la DB (boardUsers), no del JWT de sesión:
  // el token puede tener una URL de avatar vieja (p. ej. tras cambiar de distribución)
  const sessionUser = boardUsers.find((u) => u._id.toString() === session?.user?.id);
  const currentUserImage = sessionUser?.image ?? session?.user?.image;
  const currentUserName = sessionUser?.name ?? session?.user?.name ?? '';

  return (
    <Drawer isOpen={isOpen} onClose={handleClose}>
      {/* Portada como banner */}
      {shownCover && (
        <div className="relative h-36 shrink-0 group/cover">
          <Image
            src={shownCover}
            alt="Portada de la tarea"
            fill
            sizes="560px"
            unoptimized={!isEdit}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-lg bg-white text-[12px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors disabled:opacity-50"
            >
              {isUploading ? `Subiendo ${progress}%` : 'Cambiar'}
            </button>
            <button
              type="button"
              onClick={handleRemoveCover}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-lg bg-white/90 text-[12px] font-medium text-red-500 hover:bg-white transition-colors disabled:opacity-50"
            >
              Quitar
            </button>
          </div>
          {isEdit && isUploading && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
              <div className="h-full bg-white transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-5 h-12 border-b border-[#f0f0f0] shrink-0">
        {isEdit ? (
          <div className="flex items-center gap-1.5 text-[11px] text-[#a0a0a8] min-w-0">
            {saveState === 'saving' && (
              <>
                <Loader2 size={11} className="animate-spin" />
                Guardando…
              </>
            )}
            {saveState === 'saved' && (
              <>
                <Check size={11} className="text-[#34c759]" />
                Guardado
              </>
            )}
            {saveState === 'error' && <span className="text-red-500">Error al guardar</span>}
          </div>
        ) : (
          <span className="text-[12px] font-medium text-[#8e8e93]">Nueva tarea</span>
        )}

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {!isEdit && canEdit && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={busy || !title.trim()}
              className="px-4 py-1.5 rounded-lg bg-[#0066cc] text-white text-[13px] font-medium hover:bg-[#0055aa] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isUploading ? 'Subiendo archivos…' : isCreating ? 'Creando…' : 'Crear tarea'}
            </button>
          )}
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="text-[#aaaaaa] hover:text-[#1d1d1f] transition-colors disabled:opacity-40"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4">
          {/* Campos editables: deshabilitados para viewer/commenter */}
          <fieldset disabled={!canEdit} className="contents">
          {/* Título */}
          <textarea
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            rows={1}
            className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight border-none outline-none bg-transparent w-full placeholder:text-[#c7c7cc] placeholder:font-normal resize-none overflow-hidden leading-snug"
            placeholder="Nombre de la tarea..."
            disabled={busy}
            autoFocus={!isEdit}
          />

          {/* Propiedades */}
          <div className="mt-3 rounded-xl border border-[#f0f0f2] bg-[#fafafa]/60 px-3 py-1.5">
            <PropertyRow icon={<LayoutList size={13} />} label="Estado">
              <div className="flex gap-1 flex-wrap">
                {boardColumns.map((option) => {
                  const isActive = status === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectStatus(option.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-all ${
                        isActive
                          ? 'bg-white text-[#3a3a3c] ring-1 ring-[#c7c7cc] shadow-sm'
                          : 'text-[#8e8e93] hover:bg-white hover:text-[#3a3a3c]'
                      }`}
                      disabled={busy}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
                        style={{ backgroundColor: isActive ? option.color : '#d1d1d6' }}
                      />
                      {option.title}
                    </button>
                  );
                })}
              </div>
            </PropertyRow>

            <PropertyRow icon={<Flag size={13} />} label="Prioridad">
              <div className="flex gap-1 flex-wrap">
                {PRIORITY_OPTIONS.map((option) => {
                  const isActive = priority === option.value;
                  return (
                    <button
                      key={option.value ?? 'none'}
                      type="button"
                      onClick={() => handleSelectPriority(option.value)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-all ${
                        isActive ? option.activeClass : 'text-[#8e8e93] hover:bg-white hover:text-[#3a3a3c]'
                      }`}
                      disabled={busy}
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
            </PropertyRow>

            <div className="flex gap-3 py-1.5">
              <div className="w-[104px] shrink-0 flex items-center gap-1.5 pt-1 text-[12px] text-[#8e8e93]">
                <Calendar size={13} />
                <span>Fechas</span>
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="block text-[10px] text-[#a0a0a8] mb-0.5">Límite</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => handleDateChange('dueDate', e.target.value)}
                    className="w-full px-2 py-1 rounded-md border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[12px] text-[#1d1d1f] bg-white"
                    disabled={busy}
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] text-[#a0a0a8] mb-0.5">Entrega</span>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => handleDateChange('deliveryDate', e.target.value)}
                    className="w-full px-2 py-1 rounded-md border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[12px] text-[#1d1d1f] bg-white"
                    disabled={busy}
                  />
                </label>
              </div>
            </div>

            {boardUsers.length > 1 && (
              <PropertyRow icon={<Users size={13} />} label="Asignados">
                <div className="flex flex-wrap gap-1.5">
                  {boardUsers.map((user) => {
                    const isSelected = assignedTo.includes(user._id.toString());
                    return (
                      <button
                        key={user._id.toString()}
                        type="button"
                        onClick={() => handleToggleUser(user._id.toString())}
                        className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border text-[11.5px] transition-all ${
                          isSelected
                            ? 'border-[#0066cc] bg-[#e8f0fb] text-[#0055aa]'
                            : 'border-[#e5e5ea] bg-white text-[#3a3a3c] hover:border-[#c7c7cc]'
                        }`}
                        disabled={busy}
                      >
                        <Avatar src={user.image} name={user.name} size="sm" />
                        <span>{user.name}</span>
                        {isSelected && <Check size={11} className="text-[#0066cc]" />}
                      </button>
                    );
                  })}
                </div>
              </PropertyRow>
            )}

            <PropertyRow icon={<Tags size={13} />} label="Etiquetas">
              <div className="flex flex-wrap items-center gap-1.5">
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
                      disabled={busy || (!isSelected && tags.length >= 5)}
                    >
                      <Badge variant="tag" color={tag.color}>
                        {tag.text}
                      </Badge>
                    </button>
                  );
                })}
                {projectTags.length === 0 && tags.length === 0 && (
                  <span className="text-[12px] text-[#c7c7cc]">Sin etiquetas en este tablero</span>
                )}
                {tags.length < 5 && (
                  <input
                    type="text"
                    value={newTagText}
                    onChange={(e) => setNewTagText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    onBlur={() => newTagText.trim() && handleAddTag()}
                    className="w-24 px-2 py-1 rounded-md border border-dashed border-[#e5e5ea] focus:border-[#0066cc] outline-none transition-all text-[11.5px] placeholder:text-[#c7c7cc] bg-white"
                    placeholder="+ Etiqueta"
                    maxLength={30}
                    disabled={busy}
                  />
                )}
              </div>
            </PropertyRow>

            <PropertyRow icon={<ImagePlus size={13} />} label="Portada">
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={busy || isUploading}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] text-[#8e8e93] bg-white border border-[#e5e5ea] hover:border-[#0066cc] hover:text-[#0066cc] transition-all disabled:opacity-50"
              >
                <ImagePlus size={12} />
                {isUploading && isEdit
                  ? `Subiendo ${progress}%`
                  : shownCover
                    ? 'Cambiar imagen'
                    : 'Agregar imagen'}
              </button>
            </PropertyRow>
          </div>

          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleCoverSelect}
          />

          {/* Descripción */}
          <div className="mt-5">
            <div className="flex items-center gap-1.5 mb-2 text-[#8e8e93]">
              <AlignLeft size={12} />
              <SectionLabel>Descripción</SectionLabel>
            </div>
            <div className="rounded-lg border border-[#e5e5ea] overflow-hidden focus-within:border-[#0066cc] focus-within:ring-2 focus-within:ring-[#0066cc]/10 transition-all">
              <NoteEditor
                key={isEdit ? `editor-${taskId}` : 'editor-new'}
                content={description}
                onChange={setDescription}
                editable={canEdit}
                placeholder="Descripción de la tarea..."
                maxLength={50000}
                showCharCount={true}
                minHeight="120px"
                {...(isEdit && taskId
                  ? { uploadScope: 'task-image' as const, uploadResourceId: taskId }
                  : { onLocalImage: handleLocalImage })}
              />
            </div>
          </div>

          {/* Subtareas (solo edición) */}
          {isEdit && (
            <div className="mt-5">
              <div className="flex items-center gap-1.5 mb-2 text-[#8e8e93]">
                <ListChecks size={12} />
                <SectionLabel>
                  Subtareas{' '}
                  {checklist.length > 0 &&
                    `(${checklist.filter((c) => c.done).length}/${checklist.length})`}
                </SectionLabel>
              </div>
              {checklist.length > 0 && (
                <>
                  <div className="h-1 rounded-full bg-[#f0f0f2] overflow-hidden mb-2.5">
                    <div
                      className="h-full bg-[#34c759] transition-all"
                      style={{
                        width: `${Math.round(
                          (checklist.filter((c) => c.done).length / checklist.length) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <ul className="space-y-1 mb-2.5">
                    {checklist.map((item, index) => (
                      <li
                        key={item._id?.toString() || index}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border border-[#e5e5ea] group"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            saveChecklist(
                              checklist.map((c, i) => (i === index ? { ...c, done: !c.done } : c))
                            )
                          }
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                            item.done
                              ? 'bg-[#34c759] border-[#34c759] text-white'
                              : 'border-[#c7c7cc] hover:border-[#34c759]'
                          }`}
                        >
                          {item.done && <Check size={10} strokeWidth={3} />}
                        </button>
                        <span
                          className={`flex-1 text-[12px] break-words ${
                            item.done ? 'text-[#a0a0a8] line-through' : 'text-[#1d1d1f]'
                          }`}
                        >
                          {item.text}
                        </span>
                        <button
                          type="button"
                          onClick={() => saveChecklist(checklist.filter((_, i) => i !== index))}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#a0a0a8] hover:text-red-500 transition-all"
                          title="Eliminar subtarea"
                        >
                          <Trash2 size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())
                  }
                  className="flex-1 px-3 py-1.5 rounded-lg border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[12px] placeholder:text-[#c7c7cc]"
                  placeholder="Agregar subtarea..."
                  maxLength={200}
                  disabled={checklist.length >= 20}
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  disabled={!newChecklistText.trim() || checklist.length >= 20}
                  className="px-3 py-1.5 rounded-lg border border-[#e5e5ea] text-[#8e8e93] hover:border-[#0066cc] hover:text-[#0066cc] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Adjuntos */}
          <div className="mt-5">
            <div className="flex items-center gap-1.5 mb-2 text-[#8e8e93]">
              <Paperclip size={12} />
              <SectionLabel>
                Adjuntos{' '}
                {(isEdit ? attachments.length : attachmentFiles.length) > 0 &&
                  `(${isEdit ? attachments.length : attachmentFiles.length}/20)`}
              </SectionLabel>
            </div>
            {isEdit && attachments.length > 0 && (
              <ul className="space-y-1.5 mb-2">
                {attachments.map((a) => (
                  <li
                    key={a._id.toString()}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#e5e5ea] group"
                  >
                    <Paperclip size={12} className="text-[#8e8e93] shrink-0" />
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-[12px] text-[#1d1d1f] truncate hover:text-[#0066cc]"
                    >
                      {a.name}
                    </a>
                    <span className="text-[10px] text-[#a0a0a8] shrink-0">
                      {formatFileSize(a.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(a._id.toString())}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#a0a0a8] hover:text-red-500 transition-all"
                      title="Eliminar adjunto"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!isEdit && attachmentFiles.length > 0 && (
              <ul className="space-y-1.5 mb-2">
                {attachmentFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#e5e5ea] group"
                  >
                    <Paperclip size={12} className="text-[#8e8e93] shrink-0" />
                    <span className="flex-1 text-[12px] text-[#1d1d1f] truncate">{file.name}</span>
                    <span className="text-[10px] text-[#a0a0a8] shrink-0">
                      {formatFileSize(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachmentFiles((prev) => prev.filter((_, i) => i !== index))
                      }
                      disabled={busy}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#a0a0a8] hover:text-red-500 transition-all disabled:opacity-30"
                      title="Quitar adjunto"
                    >
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => attachmentInputRef.current?.click()}
              disabled={
                busy || isUploading || (isEdit ? attachments.length >= 20 : attachmentFiles.length >= 20)
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#e5e5ea] text-[12px] text-[#8e8e93] hover:border-[#0066cc] hover:text-[#0066cc] transition-all disabled:opacity-50"
            >
              <Paperclip size={13} />
              {isEdit && isUploading ? `Subiendo ${progress}%` : 'Adjuntar archivo'}
            </button>
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="hidden"
              onChange={handleAttachmentSelect}
            />
          </div>
          </fieldset>

          {/* Comentarios (solo edición) */}
          {isEdit && (
            <div className="mt-6 pt-4 border-t border-[#f0f0f2]">
              <div className="flex items-center gap-1.5 mb-3 text-[#8e8e93]">
                <MessageSquare size={12} />
                <SectionLabel>
                  Comentarios {comments.length > 0 && `(${comments.length})`}
                </SectionLabel>
              </div>

              {comments.length === 0 ? (
                <p className="text-[12px] text-[#c7c7cc] mb-3">
                  Sin comentarios aún. Escribí el primero abajo.
                </p>
              ) : (
                <div className="space-y-4 mb-4">
                  {comments.map((comment: IComment) => {
                    const commentId = comment._id?.toString();
                    const isOwnComment =
                      session?.user?.id && comment.authorId?.toString() === session.user.id;
                    const isReplying = replyingToId === commentId;
                    const replies: IReply[] = comment.replies || [];

                    return (
                      <div key={commentId} className="group">
                        <div className="flex gap-2.5">
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
                                  onClick={() => handleDeleteComment(commentId!)}
                                  className="ml-auto opacity-0 group-hover:opacity-100 text-[#c7c7cc] hover:text-red-400 transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            <p className="text-[13px] text-[#3a3a3c] leading-relaxed mt-0.5 break-words whitespace-pre-wrap">
                              {comment.content}
                            </p>
                            {canComment && (
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingToId(isReplying ? null : commentId!);
                                setReplyContent('');
                              }}
                              className="mt-1 flex items-center gap-1 text-[11px] text-[#8e8e93] hover:text-[#0066cc] transition-colors"
                            >
                              <CornerDownRight size={11} />
                              Responder
                            </button>
                            )}
                          </div>
                        </div>

                        {(replies.length > 0 || isReplying) && (
                          <div className="ml-8 mt-2 pl-3 border-l-2 border-[#f0f0f0] space-y-3">
                            {replies.map((reply: IReply) => {
                              const replyId = reply._id?.toString();
                              const isOwnReply =
                                session?.user?.id &&
                                reply.authorId?.toString() === session.user.id;
                              return (
                                <div key={replyId} className="flex gap-2.5 group/reply">
                                  <Avatar
                                    src={reply.authorImage}
                                    name={reply.authorName}
                                    size="sm"
                                  />
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
                                          onClick={() =>
                                            handleDeleteReply(commentId!, replyId!)
                                          }
                                          className="ml-auto opacity-0 group-hover/reply:opacity-100 text-[#c7c7cc] hover:text-red-400 transition-all"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-[13px] text-[#3a3a3c] leading-relaxed mt-0.5 break-words whitespace-pre-wrap">
                                      {reply.content}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}

                            {isReplying && (
                              <div className="flex gap-2 items-start pt-1">
                                {session?.user && (
                                  <Avatar
                                    src={currentUserImage}
                                    name={currentUserName}
                                    size="sm"
                                  />
                                )}
                                <div className="flex-1 flex gap-1.5">
                                  <input
                                    key={`reply-input-${commentId}`}
                                    type="text"
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    onKeyDown={(e) =>
                                      e.key === 'Enter' &&
                                      (e.preventDefault(), handleAddReply(commentId!))
                                    }
                                    className="flex-1 px-3 py-1.5 rounded-lg border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[12px] placeholder:text-[#c7c7cc]"
                                    placeholder="Escribí una respuesta..."
                                    maxLength={2000}
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddReply(commentId!)}
                                    disabled={!replyContent.trim() || isAddingReply}
                                    className="px-2.5 py-1.5 rounded-lg bg-[#0066cc] text-white hover:bg-[#0055aa] disabled:opacity-40 transition-all"
                                  >
                                    <Send size={12} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Composer de comentario (oculto para 'viewer') */}
              {canComment && (
              <div className="flex gap-2 items-start">
                {session?.user && (
                  <Avatar src={currentUserImage} name={currentUserName} size="sm" />
                )}
                <div className="flex-1 flex gap-1.5">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && (e.preventDefault(), handleAddComment())
                    }
                    className="flex-1 px-3 py-1.5 rounded-lg border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[12px] placeholder:text-[#c7c7cc]"
                    placeholder="Escribí un comentario..."
                    maxLength={2000}
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isAddingComment}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0066cc] text-white hover:bg-[#0055aa] disabled:opacity-40 transition-all"
                  >
                    <Send size={12} />
                  </button>
                </div>
              </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-[12px] text-red-500">{error}</p>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
