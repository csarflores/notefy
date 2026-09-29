'use server';

import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/mongodb';
import Note from '@/models/Note';
import { CreateNoteInput, UpdateNoteInput, ApiResponse, INote, INoteVersion, IComment, MemberRole } from '@/types';
import { isValidObjectId } from '@/lib/utils';
import { createInvitation } from '@/actions/invitation-actions';
import { escapeRegExp } from '@/lib/utils';
import crypto from 'crypto';
import User from '@/models/User';
import { notifyUser } from '@/lib/notify';
import { canComment, AuthUser } from '@/lib/auth-helpers';
import {
  getAuthUser,
  isSelf,
  isOwner,
  findAccessibleProject,
  findEditableProject,
  removeMemberRole,
} from '@/lib/auth-helpers';

// Obtener todas las notas del usuario (incluyendo notas compartidas con él)
export async function getUserNotes(userId: string): Promise<ApiResponse<INote[]>> {
  try {
    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    await connectDB();

    // Buscar notas donde el usuario es owner O está en members (notas compartidas)
    const notes = await Note.find({
      deletedAt: null,
      $or: [
        { owner: userId },
        { members: user.email, visibility: 'shared' }
      ]
    })
      .sort({ updatedAt: -1 })
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(notes)) };
  } catch (error) {
    console.error('Error al obtener notas:', error);
    return { success: false, error: 'Error al obtener las notas' };
  }
}

// Obtener notas de un proyecto (privadas del usuario + compartidas en el proyecto)
export async function getProjectNotes(projectId: string, userId: string): Promise<ApiResponse<INote[]>> {
  try {
    if (!isValidObjectId(projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    // Verificar si el usuario es miembro del proyecto (owner o en members)
    const project = await findAccessibleProject(projectId, user);
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado o sin permisos' };
    }

    await connectDB();

    // Buscar notas del proyecto donde:
    // - El usuario es owner (incluye notas privadas)
    // - La nota es shared y el usuario está en members de la nota
    // - La nota es shared y el usuario es miembro del proyecto (para notas compartidas a nivel proyecto)
    const notes = await Note.find({
      projectId: projectId,
      deletedAt: null,
      $or: [
        { owner: userId },
        { members: user.email, visibility: 'shared' },
        { visibility: 'shared' } // Notas shared son visibles para todos los miembros del proyecto
      ]
    })
      .sort({ updatedAt: -1 })
      .lean();

    // Filtrar: notas privadas solo para el owner, notas shared para miembros del proyecto
    const filteredNotes = notes.filter(note => {
      if (note.visibility === 'private') {
        return note.owner.toString() === userId;
      }
      // Notas shared: visibles para todos los miembros del proyecto (ya verificado)
      return true;
    });

    return { success: true, data: JSON.parse(JSON.stringify(filteredNotes)) };
  } catch (error) {
    console.error('Error al obtener notas del proyecto:', error);
    return { success: false, error: 'Error al obtener las notas del proyecto' };
  }
}

// Obtener una nota por ID
export async function getNoteById(noteId: string, userId: string): Promise<ApiResponse<INote>> {
  try {
    if (!isValidObjectId(noteId)) {
      return { success: false, error: 'ID de nota inválido' };
    }

    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    await connectDB();

    const note = await Note.findById(noteId);

    if (!note || note.deletedAt) {
      return { success: false, error: 'Nota no encontrada' };
    }

    // Verificar permisos: owner, member (si es shared) o nota shared dentro de un proyecto accesible
    const isNoteOwner = isOwner(note, user);
    const isMember = note.visibility === 'shared' && note.members.includes(user.email);
    let hasProjectAccess = false;
    if (!isNoteOwner && !isMember && note.visibility === 'shared' && note.projectId) {
      hasProjectAccess = !!(await findAccessibleProject(note.projectId.toString(), user));
    }

    if (!isNoteOwner && !isMember && !hasProjectAccess) {
      return { success: false, error: 'No tienes permiso para ver esta nota' };
    }

    const noteData = note.toObject();
    return { success: true, data: JSON.parse(JSON.stringify(noteData)) };
  } catch (error) {
    console.error('Error al obtener nota:', error);
    return { success: false, error: 'Error al obtener la nota' };
  }
}

// Crear una nueva nota
export async function createNote(
  userId: string,
  data: CreateNoteInput
): Promise<ApiResponse<INote>> {
  try {
    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    if (!data.title || data.title.trim().length === 0) {
      return { success: false, error: 'El título de la nota es requerido' };
    }

    if (data.projectId && !isValidObjectId(data.projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    // Si la nota está en un proyecto, verificar que el proyecto existe y el usuario tiene acceso
    if (data.projectId) {
      const project = await findEditableProject(data.projectId, user);
      if (!project) {
        return { success: false, error: 'Proyecto no encontrado o sin permisos de edición' };
      }
    }

    await connectDB();

    const newNote = await Note.create({
      title: data.title.trim(),
      content: data.content || '',
      visibility: data.visibility || 'private',
      owner: userId,
      members: [],
      projectId: data.projectId || null,
      color: data.color || '#f59e0b',
    });

    revalidatePath('/dashboard');
    if (data.projectId) {
      revalidatePath(`/parent-project/${data.projectId}`);
    }

    return { success: true, data: JSON.parse(JSON.stringify(newNote)) };
  } catch (error) {
    console.error('Error al crear nota:', error);
    return { success: false, error: 'Error al crear la nota' };
  }
}

// Actualizar una nota
export async function updateNote(
  noteId: string,
  userId: string,
  data: UpdateNoteInput
): Promise<ApiResponse<INote>> {
  try {
    if (!isValidObjectId(noteId)) {
      return { success: false, error: 'ID de nota inválido' };
    }

    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    await connectDB();

    const note = await Note.findById(noteId);

    if (!note || note.deletedAt) {
      return { success: false, error: 'Nota no encontrada' };
    }

    // Verificar permisos: owner o member con rol editor (si es shared)
    const isNoteOwner = isOwner(note, user);
    const memberRole = note.memberRoles?.[user.email] ?? 'editor';
    const isMember =
      note.visibility === 'shared' &&
      note.members.includes(user.email) &&
      memberRole === 'editor';

    if (!isNoteOwner && !isMember) {
      return { success: false, error: 'No tienes permiso para editar esta nota' };
    }

    const updateData: UpdateNoteInput = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.content !== undefined) {
      updateData.content = data.content;
      // Resolver [[links]] a otras notas
      const linkedNotes = await resolveNoteLinks(data.content, user, noteId);
      (updateData as Record<string, unknown>).linkedNotes = linkedNotes;
    }
    if (data.visibility !== undefined) updateData.visibility = data.visibility;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.projectId !== undefined) {
      if (data.projectId && !isValidObjectId(data.projectId)) {
        return { success: false, error: 'ID de proyecto inválido' };
      }
      if (data.projectId && !(await findEditableProject(data.projectId, user))) {
        return { success: false, error: 'Proyecto no encontrado o sin permisos de edición' };
      }
      updateData.projectId = data.projectId;
    }

    // Solo el owner puede cambiar la lista de miembros
    if (data.members !== undefined && isNoteOwner) {
      updateData.members = data.members;
    }

    // Snapshot de la versión anterior cuando cambia el contenido o el título
    const contentChanged =
      (data.content !== undefined && data.content !== note.content) ||
      (data.title !== undefined && data.title.trim() !== note.title);

    const updatedNote = await Note.findByIdAndUpdate(
      noteId,
      {
        ...updateData,
        ...(contentChanged
          ? {
              $push: {
                versions: {
                  $each: [
                    {
                      title: note.title,
                      content: note.content,
                      savedBy: user.id,
                      savedByName: user.name,
                    },
                  ],
                  $slice: -30,
                },
              },
            }
          : {}),
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedNote) {
      return { success: false, error: 'Nota no encontrada' };
    }

    revalidatePath('/dashboard');
    revalidatePath(`/notes/${noteId}`);
    if (updatedNote.projectId) {
      revalidatePath(`/parent-project/${updatedNote.projectId}`);
    }

    return { success: true, data: JSON.parse(JSON.stringify(updatedNote)) };
  } catch (error) {
    console.error('Error al actualizar nota:', error);
    return { success: false, error: 'Error al actualizar la nota' };
  }
}

// Eliminar una nota
export async function deleteNote(noteId: string, userId: string): Promise<ApiResponse<null>> {
  try {
    if (!isValidObjectId(noteId)) {
      return { success: false, error: 'ID de nota inválido' };
    }

    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    await connectDB();

    const note = await Note.findById(noteId);

    if (!note) {
      return { success: false, error: 'Nota no encontrada' };
    }

    // Solo el owner puede eliminar
    if (!isOwner(note, user)) {
      return { success: false, error: 'Solo el propietario puede eliminar la nota' };
    }

    // Soft-delete: la nota va a la papelera y se puede restaurar
    note.deletedAt = new Date();
    await note.save();

    revalidatePath('/dashboard');
    revalidatePath(`/notes/${noteId}`);
    if (note.projectId) {
      revalidatePath(`/parent-project/${note.projectId}`);
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar nota:', error);
    return { success: false, error: 'Error al eliminar la nota' };
  }
}

// Invitar un usuario a la nota — crea invitación pendiente con rol
export async function shareNote(
  noteId: string,
  userId: string,
  email: string,
  role: MemberRole = 'editor'
): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    const result = await createInvitation('note', noteId, email, role);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath('/dashboard');
    revalidatePath(`/notes/${noteId}`);

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al compartir nota:', error);
    return { success: false, error: 'Error al compartir la nota' };
  }
}

// Remover acceso de un usuario a la nota
export async function removeNoteMember(
  noteId: string,
  userId: string,
  email: string
): Promise<ApiResponse<INote>> {
  try {
    if (!isValidObjectId(noteId)) {
      return { success: false, error: 'ID de nota inválido' };
    }

    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    await connectDB();

    const note = await Note.findById(noteId);

    if (!note || note.deletedAt) {
      return { success: false, error: 'Nota no encontrada' };
    }

    // Solo el owner puede remover miembros
    if (!isOwner(note, user)) {
      return { success: false, error: 'Solo el propietario puede remover miembros' };
    }

    note.members = note.members.filter((member) => member !== email);
    removeMemberRole(note, email);

    // Si no hay miembros, volver a private
    if (note.members.length === 0) {
      note.visibility = 'private';
    }

    await note.save();

    revalidatePath('/dashboard');
    revalidatePath(`/notes/${noteId}`);
    if (note.projectId) {
      revalidatePath(`/parent-project/${note.projectId}`);
    }

    return { success: true, data: JSON.parse(JSON.stringify(note)) };
  } catch (error) {
    console.error('Error al remover miembro:', error);
    return { success: false, error: 'Error al remover el miembro' };
  }
}

// Extrae [[Título de nota]] del contenido y resuelve los IDs de notas accesibles
async function resolveNoteLinks(
  content: string,
  user: { id: string; email: string },
  excludeId?: string
) {
  const titles = [...content.matchAll(/\[\[([^\[\]]{1,200})\]\]/g)]
    .map((m) => m[1].trim())
    .filter(Boolean);
  if (titles.length === 0) return [];

  const regexes = titles.map((t) => new RegExp(`^${escapeRegExp(t)}$`, 'i'));
  const notes = await Note.find({
    deletedAt: null,
    title: { $in: regexes },
    $or: [{ owner: user.id }, { members: user.email }],
  })
    .select('_id')
    .lean();

  return notes.map((n) => n._id).filter((id) => id.toString() !== excludeId);
}

// Devuelve las notas enlazadas ([[links]]) y los backlinks de una nota
export async function getNoteLinks(
  noteId: string
): Promise<ApiResponse<{ links: { _id: string; title: string; color: string }[]; backlinks: { _id: string; title: string; color: string }[] }>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!isValidObjectId(noteId)) {
      return { success: false, error: 'ID de nota inválido' };
    }

    await connectDB();
    const note = await Note.findById(noteId);
    if (!note || note.deletedAt) {
      return { success: false, error: 'Nota no encontrada' };
    }

    const accessFilter = {
      deletedAt: null,
      $or: [
        { owner: user.id },
        { members: user.email, visibility: 'shared' as const },
      ],
    };

    const [links, backlinks] = await Promise.all([
      Note.find({ ...accessFilter, _id: { $in: note.linkedNotes ?? [] } })
        .select('_id title color')
        .lean(),
      Note.find({ ...accessFilter, linkedNotes: note._id })
        .select('_id title color')
        .lean(),
    ]);

    return {
      success: true,
      data: {
        links: JSON.parse(JSON.stringify(links)),
        backlinks: JSON.parse(JSON.stringify(backlinks)),
      },
    };
  } catch (error) {
    console.error('Error al obtener enlaces de nota:', error);
    return { success: false, error: 'Error al obtener los enlaces' };
  }
}

// Crear (o devolver) el link público de solo lectura de una nota (solo owner)
export async function createPublicNoteLink(
  noteId: string,
  userId: string
): Promise<ApiResponse<{ token: string }>> {
  try {
    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }
    if (!isValidObjectId(noteId)) {
      return { success: false, error: 'ID de nota inválido' };
    }

    await connectDB();
    const note = await Note.findById(noteId);
    if (!note || note.deletedAt) {
      return { success: false, error: 'Nota no encontrada' };
    }
    if (!isOwner(note, user)) {
      return { success: false, error: 'Solo el propietario puede crear un link público' };
    }

    if (!note.publicToken) {
      note.publicToken = crypto.randomBytes(24).toString('hex');
      await note.save();
    }

    return { success: true, data: { token: note.publicToken } };
  } catch (error) {
    console.error('Error al crear link público:', error);
    return { success: false, error: 'Error al crear el link' };
  }
}

// Revocar el link público de una nota (solo owner)
export async function revokePublicNoteLink(
  noteId: string,
  userId: string
): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }
    if (!isValidObjectId(noteId)) {
      return { success: false, error: 'ID de nota inválido' };
    }

    await connectDB();
    const note = await Note.findById(noteId);
    if (!note || note.deletedAt) {
      return { success: false, error: 'Nota no encontrada' };
    }
    if (!isOwner(note, user)) {
      return { success: false, error: 'Solo el propietario puede revocar el link' };
    }

    note.publicToken = null;
    await note.save();

    revalidatePath(`/notes/${noteId}`);
    return { success: true, data: null };
  } catch (error) {
    console.error('Error al revocar link público:', error);
    return { success: false, error: 'Error al revocar el link' };
  }
}

// Vista pública de solo lectura — sin sesión, acceso por token
export async function getPublicNote(
  token: string
): Promise<ApiResponse<{ title: string; content: string; updatedAt: string }>> {
  try {
    if (!token || typeof token !== 'string' || token.length > 128) {
      return { success: false, error: 'Link inválido' };
    }
    await connectDB();
    const note = await Note.findOne({ publicToken: token, deletedAt: null })
      .select('title content updatedAt')
      .lean();
    if (!note) {
      return { success: false, error: 'Nota no encontrada o link revocado' };
    }
    // Sanitización básica: eliminar scripts/iframes/handlers inline del HTML de TipTap
    const safeContent = (note.content ?? '')
      .replace(/<(script|iframe|object|embed|form|link|meta)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<(script|iframe|object|embed|form|link|meta)[^>]*\/?>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(href|src)\s*=\s*(['"]?)\s*javascript:[^'">\s]*\2/gi, '$1="#"');
    return {
      success: true,
      data: {
        title: note.title,
        content: safeContent,
        updatedAt: note.updatedAt?.toISOString?.() ?? '',
      },
    };
  } catch (error) {
    console.error('Error al obtener nota pública:', error);
    return { success: false, error: 'Error al obtener la nota' };
  }
}

// ─── Historial de versiones ─────────────────────────────────────────────────

// Devuelve la nota si el usuario puede verla (owner, miembro shared o proyecto)
async function findReadableNote(noteId: string, user: AuthUser) {
  if (!isValidObjectId(noteId)) return null;
  await connectDB();
  const note = await Note.findById(noteId);
  if (!note || note.deletedAt) return null;
  if (isOwner(note, user)) return note;
  if (note.visibility === 'shared' && note.members.includes(user.email)) return note;
  if (note.visibility === 'shared' && note.projectId) {
    const project = await findAccessibleProject(note.projectId.toString(), user);
    if (project) return note;
  }
  return null;
}

// Devuelve la nota si el usuario puede editarla (owner o miembro editor)
async function findEditableNote(noteId: string, user: AuthUser) {
  const note = await findReadableNote(noteId, user);
  if (!note) return null;
  if (isOwner(note, user)) return note;
  const role = note.memberRoles?.[user.email] ?? 'editor';
  if (note.members.includes(user.email) && role === 'editor') return note;
  return null;
}

// Historial de versiones de una nota (más reciente primero)
export async function getNoteVersions(noteId: string): Promise<ApiResponse<INoteVersion[]>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const note = await findReadableNote(noteId, user);
    if (!note) {
      return { success: false, error: 'Nota no encontrada o sin permisos' };
    }

    const versions = [...(note.versions ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return { success: true, data: JSON.parse(JSON.stringify(versions)) };
  } catch (error) {
    console.error('Error al obtener versiones:', error);
    return { success: false, error: 'Error al obtener las versiones' };
  }
}

// Restaurar una versión anterior (guarda el estado actual como nueva versión)
export async function restoreNoteVersion(
  noteId: string,
  versionId: string
): Promise<ApiResponse<INote>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!isValidObjectId(versionId)) {
      return { success: false, error: 'ID de versión inválido' };
    }

    const note = await findEditableNote(noteId, user);
    if (!note) {
      return { success: false, error: 'Nota no encontrada o sin permisos de edición' };
    }

    const version = note.versions?.find((v) => v._id.toString() === versionId);
    if (!version) {
      return { success: false, error: 'Versión no encontrada' };
    }

    // Guardar el estado actual como versión antes de restaurar
    note.versions = [
      ...(note.versions ?? []).slice(-29),
      {
        title: note.title,
        content: note.content,
        savedBy: user.id,
        savedByName: user.name,
      } as unknown as INoteVersion,
    ] as INote['versions'];

    note.title = version.title;
    note.content = version.content;
    await note.save();

    revalidatePath(`/notes/${noteId}`);
    revalidatePath('/dashboard');

    return { success: true, data: JSON.parse(JSON.stringify(note.toObject())) };
  } catch (error) {
    console.error('Error al restaurar versión:', error);
    return { success: false, error: 'Error al restaurar la versión' };
  }
}

// Eliminar una entrada del historial (solo propietario)
export async function deleteNoteVersion(
  noteId: string,
  versionId: string
): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!isValidObjectId(versionId)) {
      return { success: false, error: 'ID de versión inválido' };
    }

    const note = await findEditableNote(noteId, user);
    if (!note || !isOwner(note, user)) {
      return { success: false, error: 'Solo el propietario puede eliminar versiones' };
    }

    note.versions = (note.versions ?? []).filter(
      (v) => v._id.toString() !== versionId
    ) as INote['versions'];
    await note.save();

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar versión:', error);
    return { success: false, error: 'Error al eliminar la versión' };
  }
}

// ─── Comentarios en notas ───────────────────────────────────────────────────

// Agregar un comentario a una nota
export async function addNoteComment(
  noteId: string,
  content: string
): Promise<ApiResponse<IComment>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const trimmed = content?.trim();
    if (!trimmed) {
      return { success: false, error: 'El comentario no puede estar vacío' };
    }
    if (trimmed.length > 2000) {
      return { success: false, error: 'El comentario no puede exceder 2000 caracteres' };
    }

    const note = await findReadableNote(noteId, user);
    if (!note) {
      return { success: false, error: 'Nota no encontrada o sin permisos' };
    }

    // Los lectores ('viewer') no comentan: owner sí; miembros según rol
    const isNoteOwner = isOwner(note, user);
    if (!isNoteOwner && note.members.includes(user.email) && !canComment(note, user)) {
      return { success: false, error: 'No tienes permiso para comentar en esta nota' };
    }

    const dbUser = await User.findById(user.id).select('image name').lean();
    note.comments = note.comments ?? [];
    note.comments.push({
      authorId: user.id,
      authorName: dbUser?.name || user.name,
      authorImage: dbUser?.image || user.image || null,
      content: trimmed,
    } as unknown as IComment);

    await note.save();

    const newComment = note.comments[note.comments.length - 1];

    // Notificar al propietario si comenta otra persona
    if (!isNoteOwner) {
      await notifyUser(
        note.owner.toString(),
        'comment',
        `${user.name} comentó en tu nota "${note.title}"`,
        `/notes/${noteId}`
      );
    }

    revalidatePath(`/notes/${noteId}`);

    return { success: true, data: JSON.parse(JSON.stringify(newComment)) };
  } catch (error) {
    console.error('Error al agregar comentario a la nota:', error);
    return { success: false, error: 'Error al agregar el comentario' };
  }
}

// Eliminar un comentario de una nota (autor del comentario o propietario de la nota)
export async function deleteNoteComment(
  noteId: string,
  commentId: string
): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!isValidObjectId(commentId)) {
      return { success: false, error: 'ID inválido' };
    }

    const note = await findReadableNote(noteId, user);
    if (!note) {
      return { success: false, error: 'Nota no encontrada o sin permisos' };
    }

    const index = (note.comments ?? []).findIndex((c) => c._id.toString() === commentId);
    if (index === -1) {
      return { success: false, error: 'Comentario no encontrado' };
    }

    const comment = note.comments![index];
    const canDelete =
      comment.authorId.toString() === user.id || isOwner(note, user);
    if (!canDelete) {
      return { success: false, error: 'No tienes permiso para eliminar este comentario' };
    }

    note.comments!.splice(index, 1);
    await note.save();

    revalidatePath(`/notes/${noteId}`);

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar comentario de la nota:', error);
    return { success: false, error: 'Error al eliminar el comentario' };
  }
}
