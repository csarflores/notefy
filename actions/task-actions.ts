'use server';

import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import Board from '@/models/Board';
import { Types } from 'mongoose';
import { CreateTaskInput, UpdateTaskInput, ApiResponse, ITask, IComment, IReply } from '@/types';
import { isValidObjectId } from '@/lib/utils';
import { deleteS3Prefix, S3_KEY_PREFIX } from '@/lib/s3';
import {
  getAuthUser,
  findAccessibleBoard,
  findAccessibleTask,
  findDeletableTask,
} from '@/lib/auth-helpers';

// Obtener todas las tareas de un tablero
export async function getBoardTasks(boardId: string): Promise<ApiResponse<ITask[]>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const board = await findAccessibleBoard(boardId, user);
    if (!board) {
      return { success: false, error: 'Tablero no encontrado o sin permisos' };
    }

    const tasks = await Task.find({ boardId })
      .sort({ order: 1, createdAt: -1 })
      .populate('assignedTo', 'name email image')
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(tasks)) };
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    return { success: false, error: 'Error al obtener las tareas' };
  }
}

// Crear una nueva tarea
export async function createTask(data: CreateTaskInput): Promise<ApiResponse<ITask>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    if (!data.title || data.title.trim().length === 0) {
      return { success: false, error: 'El título es requerido' };
    }

    const board = await findAccessibleBoard(data.boardId, user);
    if (!board) {
      return { success: false, error: 'Tablero no encontrado o sin permisos' };
    }

    await connectDB();

    // Obtener el orden más alto en la columna
    const lastTask = await Task.findOne({
      boardId: data.boardId,
      status: data.status || 'todo',
    })
      .sort({ order: -1 })
      .select('order');

    const newOrder = lastTask ? lastTask.order + 1 : 0;

    const newTask = await Task.create({
      title: data.title.trim(),
      description: data.description?.trim() || '',
      boardId: data.boardId,
      createdBy: user.id,
      status: data.status || 'todo',
      assignedTo: data.assignedTo || [],
      tags: data.tags || [],
      order: newOrder,
      imageUrl: data.imageUrl || undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
    });

    const populatedTask = await Task.findById(newTask._id)
      .populate('assignedTo', 'name email image')
      .lean();

    revalidatePath(`/board/${data.boardId}`);

    return { success: true, data: JSON.parse(JSON.stringify(populatedTask)) };
  } catch (error) {
    console.error('Error al crear tarea:', error);
    return { success: false, error: 'Error al crear la tarea' };
  }
}

// Actualizar una tarea
export async function updateTask(
  taskId: string,
  data: UpdateTaskInput
): Promise<ApiResponse<ITask>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const task = await findAccessibleTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos' };
    }

    // Actualizar campos
    if (data.title !== undefined) task.title = data.title.trim();
    if (data.description !== undefined) task.description = data.description.trim();
    if (data.status !== undefined) task.status = data.status;
    if (data.assignedTo !== undefined) task.assignedTo = data.assignedTo as unknown as Types.ObjectId[];
    if (data.tags !== undefined) task.tags = data.tags;
    if (data.order !== undefined) task.order = data.order;
    if (data.imageUrl !== undefined) task.imageUrl = data.imageUrl;
    if (data.dueDate !== undefined) task.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.deliveryDate !== undefined) task.deliveryDate = data.deliveryDate ? new Date(data.deliveryDate) : null;

    await task.save();

    const updatedTask = await Task.findById(taskId)
      .populate('assignedTo', 'name email image')
      .lean();

    revalidatePath(`/board/${task.boardId}`);

    return { success: true, data: JSON.parse(JSON.stringify(updatedTask)) };
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    return { success: false, error: 'Error al actualizar la tarea' };
  }
}

// Mover tarea a otra columna (cambiar estado)
export async function moveTask(
  taskId: string,
  newStatus: 'todo' | 'in-progress' | 'done',
  newOrder: number
): Promise<ApiResponse<ITask>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const task = await findAccessibleTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos' };
    }

    const oldStatus = task.status;

    // Si cambió de columna, reordenar las tareas
    if (oldStatus !== newStatus) {
      // Actualizar orden de tareas en la columna antigua
      await Task.updateMany(
        { boardId: task.boardId, status: oldStatus, order: { $gt: task.order } },
        { $inc: { order: -1 } }
      );

      // Actualizar orden de tareas en la nueva columna
      await Task.updateMany(
        { boardId: task.boardId, status: newStatus, order: { $gte: newOrder } },
        { $inc: { order: 1 } }
      );
    } else {
      // Mismo estado, solo reordenar
      if (newOrder > task.order) {
        await Task.updateMany(
          {
            boardId: task.boardId,
            status: newStatus,
            order: { $gt: task.order, $lte: newOrder },
          },
          { $inc: { order: -1 } }
        );
      } else if (newOrder < task.order) {
        await Task.updateMany(
          {
            boardId: task.boardId,
            status: newStatus,
            order: { $gte: newOrder, $lt: task.order },
          },
          { $inc: { order: 1 } }
        );
      }
    }

    // Actualizar la tarea movida
    task.status = newStatus;
    task.order = newOrder;
    await task.save();

    const updatedTask = await Task.findById(taskId)
      .populate('assignedTo', 'name email image')
      .lean();

    revalidatePath(`/board/${task.boardId}`);

    return { success: true, data: JSON.parse(JSON.stringify(updatedTask)) };
  } catch (error) {
    console.error('Error al mover tarea:', error);
    return { success: false, error: 'Error al mover la tarea' };
  }
}

// Eliminar una tarea (solo quien la creó o el propietario del tablero)
export async function deleteTask(taskId: string): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const task = await findDeletableTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos' };
    }

    const boardId = task.boardId;
    const status = task.status;
    const order = task.order;

    // Eliminar la tarea y sus archivos en S3
    await Task.findByIdAndDelete(taskId);
    await deleteS3Prefix(`${S3_KEY_PREFIX}/tareas/${taskId}/`);

    // Reordenar las tareas restantes
    await Task.updateMany(
      { boardId, status, order: { $gt: order } },
      { $inc: { order: -1 } }
    );

    revalidatePath(`/board/${boardId}`);

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    return { success: false, error: 'Error al eliminar la tarea' };
  }
}

// Eliminar múltiples tareas
export async function deleteMultipleTasks(taskIds: string[]): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    if (!taskIds || taskIds.length === 0) {
      return { success: false, error: 'No se proporcionaron tareas para eliminar' };
    }

    // Validar todos los IDs
    const invalidIds = taskIds.filter(id => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return { success: false, error: 'Algunos IDs de tarea son inválidos' };
    }

    await connectDB();

    // Obtener las tareas para saber el tablero
    const tasks = await Task.find({ _id: { $in: taskIds } });

    if (tasks.length === 0) {
      return { success: false, error: 'No se encontraron tareas' };
    }

    // Solo se pueden eliminar tareas creadas por el usuario
    // o tareas de tableros cuyo propietario es el usuario
    const boardIds = [...new Set(tasks.map(t => t.boardId.toString()))];
    const ownedBoards = await Board.find({
      _id: { $in: boardIds },
      owner: user.id,
    }).select('_id').lean();
    const ownedBoardIds = new Set(ownedBoards.map((b) => b._id.toString()));

    const hasUnauthorized = tasks.some(
      (t) =>
        t.createdBy?.toString() !== user.id &&
        !ownedBoardIds.has(t.boardId.toString())
    );

    if (hasUnauthorized) {
      return { success: false, error: 'No tienes permiso para eliminar algunas tareas' };
    }

    // Eliminar todas las tareas y sus archivos en S3
    await Task.deleteMany({ _id: { $in: taskIds } });
    await Promise.all(
      taskIds.map((id) => deleteS3Prefix(`${S3_KEY_PREFIX}/tareas/${id}/`))
    );

    // Reordenar las tareas de cada tablero afectado
    for (const boardId of boardIds) {
      const boardTasks = await Task.find({ boardId }).sort({ status: 1, order: 1 });

      const tasksByStatus: { [key: string]: typeof boardTasks } = {
        'todo': [],
        'in-progress': [],
        'done': []
      };

      boardTasks.forEach(task => {
        tasksByStatus[task.status].push(task);
      });

      for (const status in tasksByStatus) {
        const statusTasks = tasksByStatus[status];
        for (let i = 0; i < statusTasks.length; i++) {
          await Task.findByIdAndUpdate(statusTasks[i]._id, { order: i });
        }
      }

      revalidatePath(`/board/${boardId}`);
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar tareas:', error);
    return { success: false, error: 'Error al eliminar las tareas' };
  }
}

// Agregar un comentario a una tarea
export async function addComment(taskId: string, content: string): Promise<ApiResponse<IComment>> {
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

    const task = await findAccessibleTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos' };
    }

    task.comments.push({
      authorId: user.id,
      authorName: user.name,
      authorImage: user.image || null,
      content: trimmed,
    } as unknown as IComment);

    await task.save();

    const newComment = task.comments[task.comments.length - 1];
    revalidatePath(`/board/${task.boardId}`);

    return { success: true, data: JSON.parse(JSON.stringify(newComment)) };
  } catch (error) {
    console.error('Error al agregar comentario:', error);
    return { success: false, error: 'Error al agregar el comentario' };
  }
}

// Eliminar un comentario de una tarea (solo el autor puede eliminarlo)
export async function deleteComment(taskId: string, commentId: string): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    if (!isValidObjectId(commentId)) {
      return { success: false, error: 'ID inválido' };
    }

    const task = await findAccessibleTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos' };
    }

    const commentIndex = task.comments.findIndex(
      (c: IComment) => c._id.toString() === commentId
    );
    if (commentIndex === -1) {
      return { success: false, error: 'Comentario no encontrado' };
    }

    const comment = task.comments[commentIndex];
    if (comment.authorId.toString() !== user.id) {
      return { success: false, error: 'No tienes permiso para eliminar este comentario' };
    }

    task.comments.splice(commentIndex, 1);
    await task.save();

    revalidatePath(`/board/${task.boardId}`);

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar comentario:', error);
    return { success: false, error: 'Error al eliminar el comentario' };
  }
}

// Agregar una respuesta a un comentario
export async function addReply(
  taskId: string,
  commentId: string,
  content: string
): Promise<ApiResponse<IReply>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    if (!isValidObjectId(commentId)) {
      return { success: false, error: 'ID inválido' };
    }

    const trimmed = content?.trim();
    if (!trimmed) {
      return { success: false, error: 'La respuesta no puede estar vacía' };
    }
    if (trimmed.length > 2000) {
      return { success: false, error: 'La respuesta no puede exceder 2000 caracteres' };
    }

    const task = await findAccessibleTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos' };
    }

    const commentIndex = task.comments.findIndex(
      (c: IComment) => c._id.toString() === commentId
    );
    if (commentIndex === -1) {
      return { success: false, error: 'Comentario no encontrado' };
    }

    const comment = task.comments[commentIndex];
    comment.replies.push({
      authorId: user.id,
      authorName: user.name,
      authorImage: user.image || null,
      content: trimmed,
    } as unknown as IReply);

    await task.save();

    const newReply = comment.replies[comment.replies.length - 1];
    revalidatePath(`/board/${task.boardId}`);

    return { success: true, data: JSON.parse(JSON.stringify(newReply)) };
  } catch (error) {
    console.error('Error al agregar respuesta:', error);
    return { success: false, error: 'Error al agregar la respuesta' };
  }
}

// Eliminar una respuesta (solo el autor puede eliminarla)
export async function deleteReply(
  taskId: string,
  commentId: string,
  replyId: string
): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    if (!isValidObjectId(commentId) || !isValidObjectId(replyId)) {
      return { success: false, error: 'ID inválido' };
    }

    const task = await findAccessibleTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos' };
    }

    const commentIndex = task.comments.findIndex(
      (c: IComment) => c._id.toString() === commentId
    );
    if (commentIndex === -1) {
      return { success: false, error: 'Comentario no encontrado' };
    }

    const comment = task.comments[commentIndex];
    const replyIndex = comment.replies.findIndex(
      (r: IReply) => r._id.toString() === replyId
    );
    if (replyIndex === -1) {
      return { success: false, error: 'Respuesta no encontrada' };
    }

    if (comment.replies[replyIndex].authorId.toString() !== user.id) {
      return { success: false, error: 'No tienes permiso para eliminar esta respuesta' };
    }

    comment.replies.splice(replyIndex, 1);
    await task.save();

    revalidatePath(`/board/${task.boardId}`);

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar respuesta:', error);
    return { success: false, error: 'Error al eliminar la respuesta' };
  }
}
