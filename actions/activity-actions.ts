'use server';

import connectDB from '@/lib/mongodb';
import Activity from '@/models/Activity';
import { ApiResponse, IActivity } from '@/types';
import { isValidObjectId } from '@/lib/utils';
import { getAuthUser, findAccessibleBoard, findAccessibleTask } from '@/lib/auth-helpers';

// Actividad reciente de un tablero (paginada)
export async function getBoardActivity(
  boardId: string,
  limit = 30,
  before?: string
): Promise<ApiResponse<IActivity[]>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const board = await findAccessibleBoard(boardId, user);
    if (!board) {
      return { success: false, error: 'Tablero no encontrado o sin permisos' };
    }

    await connectDB();

    const filter: Record<string, unknown> = { boardId };
    if (before) {
      const d = new Date(before);
      if (!isNaN(d.getTime())) filter.createdAt = { $lt: d };
    }

    const items = await Activity.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100))
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(items)) };
  } catch (error) {
    console.error('Error al obtener actividad del tablero:', error);
    return { success: false, error: 'Error al obtener la actividad' };
  }
}

// Actividad de una tarea concreta
export async function getTaskActivity(taskId: string): Promise<ApiResponse<IActivity[]>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!isValidObjectId(taskId)) {
      return { success: false, error: 'ID inválido' };
    }

    const task = await findAccessibleTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos' };
    }

    const items = await Activity.find({ taskId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(items)) };
  } catch (error) {
    console.error('Error al obtener actividad de la tarea:', error);
    return { success: false, error: 'Error al obtener la actividad' };
  }
}
