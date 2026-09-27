'use server';

import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import Board from '@/models/Board';
import { ApiResponse, ITask } from '@/types';
import { isValidObjectId } from '@/lib/utils';
import {
  getAuthUser,
  isSelf,
  findAccessibleProject,
  findAccessibleTask,
  AuthUser,
} from '@/lib/auth-helpers';

// Obtiene los IDs de tableros donde el usuario es owner o member
async function getAccessibleBoardIds(user: AuthUser) {
  const boards = await Board.find({
    $or: [
      { owner: user.id },
      { members: user.email }
    ]
  }).select('_id').lean();

  return boards.map(board => board._id);
}

// Obtener todas las tareas del usuario con deliveryDate
export async function getUserTasksWithDeliveryDate(userId: string): Promise<ApiResponse<ITask[]>> {
  try {
    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    await connectDB();

    const boardIds = await getAccessibleBoardIds(user);

    // Obtener tareas con deliveryDate de esos tableros
    const tasks = await Task.find({
      boardId: { $in: boardIds },
      deliveryDate: { $ne: null }
    })
      .populate('assignedTo', 'name email image')
      .populate({ path: 'boardId', select: 'name projectId color', populate: { path: 'projectId', select: 'name color' } })
      .sort({ deliveryDate: 1 })
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(tasks)) };
  } catch (error) {
    console.error('Error al obtener tareas con fecha de entrega:', error);
    return { success: false, error: 'Error al obtener las tareas' };
  }
}

// Obtener tareas de un proyecto específico con deliveryDate
export async function getProjectTasksWithDeliveryDate(projectId: string, userId: string): Promise<ApiResponse<ITask[]>> {
  try {
    if (!isValidObjectId(projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    const project = await findAccessibleProject(projectId, user);
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado o sin permisos' };
    }

    await connectDB();

    // Obtener tableros del proyecto donde el usuario tiene acceso
    const boards = await Board.find({
      projectId: projectId,
      $or: [
        { owner: userId },
        { members: user.email }
      ]
    }).select('_id').lean();

    const boardIds = boards.map(board => board._id);

    // Obtener tareas con deliveryDate de esos tableros
    const tasks = await Task.find({
      boardId: { $in: boardIds },
      deliveryDate: { $ne: null }
    })
      .populate('assignedTo', 'name email image')
      .populate({ path: 'boardId', select: 'name projectId color', populate: { path: 'projectId', select: 'name color' } })
      .sort({ deliveryDate: 1 })
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(tasks)) };
  } catch (error) {
    console.error('Error al obtener tareas del proyecto:', error);
    return { success: false, error: 'Error al obtener las tareas del proyecto' };
  }
}

// Obtener tareas próximas a vencer (dentro de los próximos 7 días)
export async function getUpcomingTasks(userId: string, days: number = 7): Promise<ApiResponse<ITask[]>> {
  try {
    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    await connectDB();

    // Calcular fecha límite
    const currentDate = new Date();
    const futureDate = new Date();
    futureDate.setDate(currentDate.getDate() + days);

    const boardIds = await getAccessibleBoardIds(user);

    // Obtener tareas con deliveryDate en el rango especificado
    const tasks = await Task.find({
      boardId: { $in: boardIds },
      deliveryDate: {
        $ne: null,
        $gte: currentDate,
        $lte: futureDate
      },
      status: { $ne: 'done' }
    })
      .populate('assignedTo', 'name email image')
      .populate({ path: 'boardId', select: 'name projectId color', populate: { path: 'projectId', select: 'name color' } })
      .sort({ deliveryDate: 1 })
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(tasks)) };
  } catch (error) {
    console.error('Error al obtener tareas próximas a vencer:', error);
    return { success: false, error: 'Error al obtener las tareas próximas a vencer' };
  }
}

// Obtener tareas vencidas (deliveryDate pasado y no completadas)
export async function getOverdueTasks(userId: string): Promise<ApiResponse<ITask[]>> {
  try {
    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    await connectDB();

    const currentDate = new Date();

    const boardIds = await getAccessibleBoardIds(user);

    // Obtener tareas vencidas
    const tasks = await Task.find({
      boardId: { $in: boardIds },
      deliveryDate: {
        $ne: null,
        $lt: currentDate
      },
      status: { $ne: 'done' }
    })
      .populate('assignedTo', 'name email image')
      .populate({ path: 'boardId', select: 'name projectId color', populate: { path: 'projectId', select: 'name color' } })
      .sort({ deliveryDate: 1 })
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(tasks)) };
  } catch (error) {
    console.error('Error al obtener tareas vencidas:', error);
    return { success: false, error: 'Error al obtener las tareas vencidas' };
  }
}

// Actualizar deliveryDate de una tarea (para drag-and-drop)
export async function updateTaskDeliveryDate(taskId: string, deliveryDate: Date): Promise<ApiResponse<ITask>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const task = await findAccessibleTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos' };
    }

    task.deliveryDate = deliveryDate;
    await task.save();

    const updatedTask = await Task.findById(taskId)
      .populate('assignedTo', 'name email image')
      .populate('boardId', 'name projectId color')
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(updatedTask)) };
  } catch (error) {
    console.error('Error al actualizar fecha de entrega:', error);
    return { success: false, error: 'Error al actualizar la fecha de entrega' };
  }
}
