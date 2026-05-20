'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import { CreateTaskInput, UpdateTaskInput, ApiResponse, ITask, IComment, IReply } from '@/types';
import { isValidObjectId } from '@/lib/utils';

// Obtener todas las tareas de un tablero
export async function getBoardTasks(boardId: string): Promise<ApiResponse<ITask[]>> {
  try {
    if (!isValidObjectId(boardId)) {
      return { success: false, error: 'ID de tablero inválido' };
    }

    await connectDB();

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

// Obtener tareas por estado
export async function getTasksByStatus(
  boardId: string,
  status: 'todo' | 'in-progress' | 'done'
): Promise<ApiResponse<ITask[]>> {
  try {
    if (!isValidObjectId(boardId)) {
      return { success: false, error: 'ID de tablero inválido' };
    }

    await connectDB();

    const tasks = await Task.find({ boardId, status })
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
    if (!data.title || data.title.trim().length === 0) {
      return { success: false, error: 'El título es requerido' };
    }

    if (!isValidObjectId(data.boardId)) {
      return { success: false, error: 'ID de tablero inválido' };
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
      status: data.status || 'todo',
      assignedTo: data.assignedTo || [],
      tags: data.tags || [],
      order: newOrder,
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
    if (!isValidObjectId(taskId)) {
      return { success: false, error: 'ID de tarea inválido' };
    }

    await connectDB();

    const task = await Task.findById(taskId);

    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    // Actualizar campos
    if (data.title !== undefined) task.title = data.title.trim();
    if (data.description !== undefined) task.description = data.description.trim();
    if (data.status !== undefined) task.status = data.status;
    if (data.assignedTo !== undefined) task.assignedTo = data.assignedTo as any;
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
    if (!isValidObjectId(taskId)) {
      return { success: false, error: 'ID de tarea inválido' };
    }

    await connectDB();

    const task = await Task.findById(taskId);

    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
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

// Eliminar una tarea
export async function deleteTask(taskId: string): Promise<ApiResponse<null>> {
  try {
    if (!isValidObjectId(taskId)) {
      return { success: false, error: 'ID de tarea inválido' };
    }

    await connectDB();

    const task = await Task.findById(taskId);

    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const projectId = task.boardId;
    const status = task.status;
    const order = task.order;

    // Eliminar la tarea
    await Task.findByIdAndDelete(taskId);

    // Reordenar las tareas restantes
    await Task.updateMany(
      { boardId: projectId, status, order: { $gt: order } },
      { $inc: { order: -1 } }
    );

    revalidatePath(`/board/${projectId}`);

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    return { success: false, error: 'Error al eliminar la tarea' };
  }
}

// Eliminar múltiples tareas
export async function deleteMultipleTasks(taskIds: string[]): Promise<ApiResponse<null>> {
  try {
    if (!taskIds || taskIds.length === 0) {
      return { success: false, error: 'No se proporcionaron tareas para eliminar' };
    }

    // Validar todos los IDs
    const invalidIds = taskIds.filter(id => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return { success: false, error: 'Algunos IDs de tarea son inválidos' };
    }

    await connectDB();

    // Obtener las tareas para saber el proyecto
    const tasks = await Task.find({ _id: { $in: taskIds } });

    if (tasks.length === 0) {
      return { success: false, error: 'No se encontraron tareas' };
    }

    const boardId = tasks[0].boardId;

    // Eliminar todas las tareas
    await Task.deleteMany({ _id: { $in: taskIds } });

    // Reordenar todas las tareas del tablero
    const allTasks = await Task.find({ boardId }).sort({ status: 1, order: 1 });
    
    // Agrupar por estado y reordenar
    const tasksByStatus: { [key: string]: any[] } = {
      'todo': [],
      'in-progress': [],
      'done': []
    };

    allTasks.forEach(task => {
      tasksByStatus[task.status].push(task);
    });

    // Actualizar el orden de cada grupo
    for (const status in tasksByStatus) {
      const statusTasks = tasksByStatus[status];
      for (let i = 0; i < statusTasks.length; i++) {
        await Task.findByIdAndUpdate(statusTasks[i]._id, { order: i });
      }
    }

    revalidatePath(`/board/${boardId}`);

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar tareas:', error);
    return { success: false, error: 'Error al eliminar las tareas' };
  }
}

// Agregar un comentario a una tarea
export async function addComment(taskId: string, content: string): Promise<ApiResponse<IComment>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'No autenticado' };
    }

    if (!isValidObjectId(taskId)) {
      return { success: false, error: 'ID de tarea inválido' };
    }

    const trimmed = content?.trim();
    if (!trimmed) {
      return { success: false, error: 'El comentario no puede estar vacío' };
    }
    if (trimmed.length > 2000) {
      return { success: false, error: 'El comentario no puede exceder 2000 caracteres' };
    }

    await connectDB();

    const task = await Task.findById(taskId);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    task.comments.push({
      authorId: session.user.id,
      authorName: session.user.name,
      authorImage: session.user.image || null,
      content: trimmed,
    } as any);

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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'No autenticado' };
    }

    if (!isValidObjectId(taskId) || !isValidObjectId(commentId)) {
      return { success: false, error: 'ID inválido' };
    }

    await connectDB();

    const task = await Task.findById(taskId);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const commentIndex = task.comments.findIndex(
      (c: any) => c._id.toString() === commentId
    );
    if (commentIndex === -1) {
      return { success: false, error: 'Comentario no encontrado' };
    }

    const comment = task.comments[commentIndex] as any;
    if (comment.authorId.toString() !== session.user.id) {
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'No autenticado' };
    }

    if (!isValidObjectId(taskId) || !isValidObjectId(commentId)) {
      return { success: false, error: 'ID inválido' };
    }

    const trimmed = content?.trim();
    if (!trimmed) {
      return { success: false, error: 'La respuesta no puede estar vacía' };
    }
    if (trimmed.length > 2000) {
      return { success: false, error: 'La respuesta no puede exceder 2000 caracteres' };
    }

    await connectDB();

    const task = await Task.findById(taskId);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const commentIndex = task.comments.findIndex(
      (c: any) => c._id.toString() === commentId
    );
    if (commentIndex === -1) {
      return { success: false, error: 'Comentario no encontrado' };
    }

    const comment = task.comments[commentIndex] as any;
    comment.replies.push({
      authorId: session.user.id,
      authorName: session.user.name,
      authorImage: session.user.image || null,
      content: trimmed,
    });

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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'No autenticado' };
    }

    if (!isValidObjectId(taskId) || !isValidObjectId(commentId) || !isValidObjectId(replyId)) {
      return { success: false, error: 'ID inválido' };
    }

    await connectDB();

    const task = await Task.findById(taskId);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const commentIndex = task.comments.findIndex(
      (c: any) => c._id.toString() === commentId
    );
    if (commentIndex === -1) {
      return { success: false, error: 'Comentario no encontrado' };
    }

    const comment = task.comments[commentIndex] as any;
    const replyIndex = comment.replies.findIndex(
      (r: any) => r._id.toString() === replyId
    );
    if (replyIndex === -1) {
      return { success: false, error: 'Respuesta no encontrada' };
    }

    if (comment.replies[replyIndex].authorId.toString() !== session.user.id) {
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
