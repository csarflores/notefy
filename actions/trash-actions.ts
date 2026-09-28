'use server';

import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import Board from '@/models/Board';
import Note from '@/models/Note';
import Task from '@/models/Task';
import { ApiResponse } from '@/types';
import { isValidObjectId } from '@/lib/utils';
import { deleteS3Prefix, S3_KEY_PREFIX } from '@/lib/s3';
import { getAuthUser, isOwner } from '@/lib/auth-helpers';

export interface TrashItem {
  id: string;
  kind: 'project' | 'board' | 'note' | 'task';
  title: string;
  subtitle?: string;
  deletedAt: string;
}

// Listar elementos en la papelera del usuario
export async function getTrashItems(): Promise<ApiResponse<TrashItem[]>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    await connectDB();
    const notDeleted = { deletedAt: { $ne: null } };

    const [projects, boards, notes, tasks] = await Promise.all([
      Project.find({ owner: user.id, ...notDeleted }).select('name deletedAt').lean(),
      Board.find({ owner: user.id, ...notDeleted }).select('name projectId deletedAt').lean(),
      Note.find({ owner: user.id, ...notDeleted }).select('title projectId deletedAt').lean(),
      Task.find({ createdBy: user.id, ...notDeleted }).select('title boardId deletedAt').lean(),
    ]);

    const items: TrashItem[] = [
      ...projects.map((p) => ({
        id: p._id.toString(), kind: 'project' as const, title: p.name,
        deletedAt: p.deletedAt?.toISOString() || '',
      })),
      ...boards.map((b) => ({
        id: b._id.toString(), kind: 'board' as const, title: b.name,
        subtitle: 'Tablero', deletedAt: b.deletedAt?.toISOString() || '',
      })),
      ...notes.map((n) => ({
        id: n._id.toString(), kind: 'note' as const, title: n.title,
        subtitle: 'Nota', deletedAt: n.deletedAt?.toISOString() || '',
      })),
      ...tasks.map((t) => ({
        id: t._id.toString(), kind: 'task' as const, title: t.title,
        subtitle: 'Tarea', deletedAt: t.deletedAt?.toISOString() || '',
      })),
    ].sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));

    return { success: true, data: JSON.parse(JSON.stringify(items)) };
  } catch (error) {
    console.error('Error al obtener papelera:', error);
    return { success: false, error: 'Error al obtener la papelera' };
  }
}

// Restaurar un elemento de la papelera (solo propietario/creador)
export async function restoreItem(kind: TrashItem['kind'], id: string): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!isValidObjectId(id)) {
      return { success: false, error: 'ID inválido' };
    }

    await connectDB();
    const filter = { _id: id, deletedAt: { $ne: null } };
    let revalidate: string | null = null;

    if (kind === 'task') {
      const task = await Task.findOne({ _id: id, deletedAt: { $ne: null } });
      if (!task) return { success: false, error: 'Tarea no encontrada' };
      const board = await Board.findById(task.boardId);
      const canRestore = task.createdBy?.toString() === user.id || (board && isOwner(board, user));
      if (!canRestore) return { success: false, error: 'Sin permisos' };
      task.deletedAt = null;
      // Ubicarla al final de su columna
      task.order = await Task.countDocuments({ boardId: task.boardId, status: task.status, deletedAt: null });
      await task.save();
      revalidate = `/board/${task.boardId}`;
    } else if (kind === 'project') {
      const res = await Project.updateOne({ ...filter, owner: user.id }, { $set: { deletedAt: null } });
      if (res.matchedCount === 0) return { success: false, error: 'Proyecto no encontrado o sin permisos' };
      revalidate = '/dashboard';
    } else if (kind === 'board') {
      const res = await Board.updateOne({ ...filter, owner: user.id }, { $set: { deletedAt: null } });
      if (res.matchedCount === 0) return { success: false, error: 'Tablero no encontrado o sin permisos' };
      revalidate = '/dashboard';
    } else {
      const res = await Note.updateOne({ ...filter, owner: user.id }, { $set: { deletedAt: null } });
      if (res.matchedCount === 0) return { success: false, error: 'Nota no encontrada o sin permisos' };
      revalidate = '/dashboard';
    }

    revalidatePath('/trash');
    if (revalidate) revalidatePath(revalidate);
    return { success: true, data: null };
  } catch (error) {
    console.error('Error al restaurar:', error);
    return { success: false, error: 'Error al restaurar el elemento' };
  }
}

// Eliminar definitivamente un elemento de la papelera (solo propietario/creador)
export async function permanentlyDeleteItem(kind: TrashItem['kind'], id: string): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!isValidObjectId(id)) {
      return { success: false, error: 'ID inválido' };
    }

    await connectDB();
    const filter = { _id: id, deletedAt: { $ne: null } };

    if (kind === 'task') {
      const task = await Task.findOne({ _id: id, deletedAt: { $ne: null } });
      if (!task) return { success: false, error: 'Tarea no encontrada' };
      const board = await Board.findById(task.boardId);
      const canDelete = task.createdBy?.toString() === user.id || (board && isOwner(board, user));
      if (!canDelete) return { success: false, error: 'Sin permisos' };
      await Task.findByIdAndDelete(id);
      await deleteS3Prefix(`${S3_KEY_PREFIX}/tareas/${id}/`);
    } else if (kind === 'project') {
      const res = await Project.deleteOne({ ...filter, owner: user.id });
      if (res.deletedCount === 0) return { success: false, error: 'Proyecto no encontrado o sin permisos' };
    } else if (kind === 'board') {
      const res = await Board.deleteOne({ ...filter, owner: user.id });
      if (res.deletedCount === 0) return { success: false, error: 'Tablero no encontrado o sin permisos' };
    } else {
      const res = await Note.deleteOne({ ...filter, owner: user.id });
      if (res.deletedCount === 0) return { success: false, error: 'Nota no encontrada o sin permisos' };
      await deleteS3Prefix(`${S3_KEY_PREFIX}/notas/${id}/`);
    }

    revalidatePath('/trash');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar definitivamente:', error);
    return { success: false, error: 'Error al eliminar el elemento' };
  }
}
