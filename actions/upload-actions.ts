'use server';

import { randomBytes } from 'crypto';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { revalidatePath } from 'next/cache';
import { getAuthUser, findAccessibleTask, isOwner, AuthUser } from '@/lib/auth-helpers';
import { getS3Client, S3_BUCKET, S3_KEY_PREFIX, CLOUDFRONT_URL } from '@/lib/s3';
import connectDB from '@/lib/mongodb';
import Board from '@/models/Board';
import Note from '@/models/Note';
import User from '@/models/User';
import { ApiResponse, ITaskAttachment } from '@/types';
import { isValidObjectId } from '@/lib/utils';

export type UploadScope = 'avatar' | 'task-cover' | 'task-image' | 'task-attachment' | 'note-image';

const IMAGE_MIME = /^image\/(jpeg|png|webp|gif)$/;
const MB = 1024 * 1024;

const SCOPE_RULES: Record<UploadScope, { mime: RegExp; maxBytes: number }> = {
  avatar: { mime: IMAGE_MIME, maxBytes: 5 * MB },
  'task-cover': { mime: IMAGE_MIME, maxBytes: 5 * MB },
  'task-image': { mime: IMAGE_MIME, maxBytes: 5 * MB },
  'task-attachment': { mime: /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/, maxBytes: 25 * MB },
  'note-image': { mime: IMAGE_MIME, maxBytes: 5 * MB },
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

function publicUrlFor(key: string): string {
  return `${CLOUDFRONT_URL}/${key}`;
}

// Extrae la key S3 de una URL de CloudFront solo si pertenece a nuestro prefijo
function keyFromPublicUrl(url: string): string | null {
  const prefix = `${CLOUDFRONT_URL}/${S3_KEY_PREFIX}/`;
  if (!url.startsWith(prefix)) return null;
  return decodeURIComponent(url.slice(CLOUDFRONT_URL.length + 1));
}

async function deleteS3Object(key: string) {
  try {
    await getS3Client().send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
  } catch (error) {
    console.error('Error al eliminar objeto de S3:', error);
  }
}

// Misma regla que updateNote: owner o miembro de una nota compartida
async function canEditNote(noteId: string, user: AuthUser): Promise<boolean> {
  await connectDB();
  const note = await Note.findById(noteId).select('owner members visibility').lean();
  if (!note) return false;
  if (isOwner(note, user)) return true;
  return note.visibility === 'shared' && (note.members ?? []).includes(user.email);
}

// Firma una URL para que el navegador suba el archivo directo a S3
export async function getPresignedUploadUrl(input: {
  scope: UploadScope;
  resourceId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}): Promise<ApiResponse<{ url: string; key: string; publicUrl: string }>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!S3_BUCKET || !CLOUDFRONT_URL) {
      return { success: false, error: 'El almacenamiento no está configurado' };
    }

    const { scope, resourceId, fileName, fileType, fileSize } = input;
    const rules = SCOPE_RULES[scope];
    if (!rules) {
      return { success: false, error: 'Tipo de subida inválido' };
    }
    if (!rules.mime.test(fileType)) {
      return { success: false, error: 'Tipo de archivo no permitido' };
    }
    if (!fileSize || fileSize > rules.maxBytes) {
      return {
        success: false,
        error: `El archivo supera el límite de ${Math.round(rules.maxBytes / MB)} MB`,
      };
    }

    const stamp = `${Date.now()}_${randomBytes(4).toString('hex')}`;
    const safe = sanitizeFileName(fileName || 'archivo');

    let key: string;
    if (scope === 'avatar') {
      key = `${S3_KEY_PREFIX}/avatares/${user.id}/avatar_${stamp}_${safe}`;
    } else if (scope === 'note-image') {
      if (!resourceId || !isValidObjectId(resourceId)) {
        return { success: false, error: 'Recurso inválido' };
      }
      const canAccess = await canEditNote(resourceId, user);
      if (!canAccess) {
        return { success: false, error: 'Nota no encontrada o sin permisos' };
      }
      key = `${S3_KEY_PREFIX}/notas/${resourceId}/contenido/${stamp}_${safe}`;
    } else {
      if (!resourceId || !isValidObjectId(resourceId)) {
        return { success: false, error: 'Recurso inválido' };
      }
      const task = await findAccessibleTask(resourceId, user);
      if (!task) {
        return { success: false, error: 'Tarea no encontrada o sin permisos' };
      }
      const folder = scope === 'task-cover' ? 'portada' : scope === 'task-image' ? 'contenido' : 'adjuntos';
      key = `${S3_KEY_PREFIX}/tareas/${task._id.toString()}/${folder}/${stamp}_${safe}`;
    }

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: fileType,
      CacheControl: 'public, max-age=31536000, immutable',
    });
    const url = await getSignedUrl(getS3Client(), command, { expiresIn: 60 });

    return { success: true, data: { url, key, publicUrl: publicUrlFor(key) } };
  } catch (error) {
    console.error('Error al firmar URL de subida:', error);
    return { success: false, error: 'Error al preparar la subida' };
  }
}

// Guarda la portada de una tarea tras subir el archivo a S3
export async function setTaskCover(taskId: string, key: string): Promise<ApiResponse<string>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!key.startsWith(`${S3_KEY_PREFIX}/tareas/${taskId}/portada/`)) {
      return { success: false, error: 'Archivo inválido' };
    }

    const task = await findAccessibleTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos' };
    }

    const prevKey = task.imageUrl ? keyFromPublicUrl(task.imageUrl) : null;
    const url = publicUrlFor(key);
    task.imageUrl = url;
    await task.save();

    if (prevKey && prevKey !== key) {
      await deleteS3Object(prevKey);
    }

    revalidatePath(`/board/${task.boardId}`);
    return { success: true, data: url };
  } catch (error) {
    console.error('Error al guardar portada:', error);
    return { success: false, error: 'Error al guardar la portada' };
  }
}

// Quita la portada de una tarea y elimina el objeto de S3
export async function clearTaskCover(taskId: string): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const task = await findAccessibleTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos' };
    }

    const prevKey = task.imageUrl ? keyFromPublicUrl(task.imageUrl) : null;
    task.imageUrl = undefined;
    await task.save();

    if (prevKey) {
      await deleteS3Object(prevKey);
    }

    revalidatePath(`/board/${task.boardId}`);
    return { success: true, data: null };
  } catch (error) {
    console.error('Error al quitar portada:', error);
    return { success: false, error: 'Error al quitar la portada' };
  }
}

// Guarda la foto de perfil del usuario autenticado
export async function setUserAvatar(key: string): Promise<ApiResponse<string>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!key.startsWith(`${S3_KEY_PREFIX}/avatares/${user.id}/`)) {
      return { success: false, error: 'Archivo inválido' };
    }

    await connectDB();
    const doc = await User.findById(user.id);
    if (!doc) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    const prevKey = doc.image ? keyFromPublicUrl(doc.image) : null;
    const url = publicUrlFor(key);
    doc.image = url;
    await doc.save();

    if (prevKey && prevKey !== key) {
      await deleteS3Object(prevKey);
    }

    return { success: true, data: url };
  } catch (error) {
    console.error('Error al guardar avatar:', error);
    return { success: false, error: 'Error al guardar la foto' };
  }
}

// Elimina la foto de perfil del usuario autenticado
export async function removeUserAvatar(): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    await connectDB();
    const doc = await User.findById(user.id);
    if (!doc) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    const prevKey = doc.image ? keyFromPublicUrl(doc.image) : null;
    doc.image = undefined;
    await doc.save();

    if (prevKey) {
      await deleteS3Object(prevKey);
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar avatar:', error);
    return { success: false, error: 'Error al eliminar la foto' };
  }
}

// Registra un adjunto en la tarea tras subir el archivo a S3
export async function addTaskAttachment(
  taskId: string,
  meta: { key: string; name: string; size: number; type: string }
): Promise<ApiResponse<ITaskAttachment>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!meta.key.startsWith(`${S3_KEY_PREFIX}/tareas/${taskId}/adjuntos/`)) {
      return { success: false, error: 'Archivo inválido' };
    }
    if (!meta.name?.trim() || meta.name.length > 200 || meta.size <= 0) {
      return { success: false, error: 'Metadatos de archivo inválidos' };
    }

    const task = await findAccessibleTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos' };
    }
    if ((task.attachments?.length ?? 0) >= 20) {
      return { success: false, error: 'La tarea ya tiene el máximo de adjuntos' };
    }

    task.attachments = task.attachments || [];
    task.attachments.push({
      key: meta.key,
      url: publicUrlFor(meta.key),
      name: meta.name.trim(),
      size: meta.size,
      type: meta.type,
      uploadedBy: user.id,
    } as unknown as ITaskAttachment);

    await task.save();
    const attachment = task.attachments[task.attachments.length - 1];

    revalidatePath(`/board/${task.boardId}`);
    return { success: true, data: JSON.parse(JSON.stringify(attachment)) };
  } catch (error) {
    console.error('Error al agregar adjunto:', error);
    return { success: false, error: 'Error al agregar el adjunto' };
  }
}

// Elimina un adjunto (solo quien lo subió o el owner del tablero)
export async function removeTaskAttachment(
  taskId: string,
  attachmentId: string
): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!isValidObjectId(attachmentId)) {
      return { success: false, error: 'Adjunto inválido' };
    }

    const task = await findAccessibleTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos' };
    }

    const index = (task.attachments ?? []).findIndex(
      (a) => a._id.toString() === attachmentId
    );
    if (index === -1) {
      return { success: false, error: 'Adjunto no encontrado' };
    }

    const attachment = task.attachments![index];
    const board = await Board.findById(task.boardId).select('owner').lean();
    const canDelete =
      attachment.uploadedBy.toString() === user.id ||
      (board ? isOwner(board, user) : false);
    if (!canDelete) {
      return { success: false, error: 'No tienes permiso para eliminar este adjunto' };
    }

    task.attachments!.splice(index, 1);
    await task.save();
    await deleteS3Object(attachment.key);

    revalidatePath(`/board/${task.boardId}`);
    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar adjunto:', error);
    return { success: false, error: 'Error al eliminar el adjunto' };
  }
}
