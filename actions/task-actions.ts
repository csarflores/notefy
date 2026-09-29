'use server';

import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import Board from '@/models/Board';
import { Types } from 'mongoose';
import { CreateTaskInput, UpdateTaskInput, ApiResponse, ITask, IComment, IReply, IChecklistItem } from '@/types';
import { isValidObjectId } from '@/lib/utils';
import { notifyUser } from '@/lib/notify';
import { escapeRegExp } from '@/lib/utils';
import { getBoardColumns, getDoneColumnId } from '@/lib/board-columns';
import { logActivity } from '@/lib/activity';
import User from '@/models/User';
import {
  getAuthUser,
  findAccessibleBoard,
  findAccessibleTask,
  findCommentableTask,
  findEditableBoard,
  findEditableTask,
  findDeletableTask,
  canEdit,
  canComment,
  AuthUser,
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

    const tasks = await Task.find({ boardId, deletedAt: null })
      .sort({ order: 1, createdAt: -1 })
      .populate('assignedTo', 'name email image')
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(tasks)) };
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    return { success: false, error: 'Error al obtener las tareas' };
  }
}

// Avanza una fecha según la frecuencia de recurrencia
function nextOccurrence(date: Date, recurrence: 'daily' | 'weekly' | 'monthly'): Date {
  const next = new Date(date);
  if (recurrence === 'daily') next.setDate(next.getDate() + 1);
  else if (recurrence === 'weekly') next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

// Crea la siguiente ocurrencia de una tarea recurrente al completarla.
// El original queda archivado en la columna "done" y la copia nace en la primera columna.
async function spawnNextOccurrence(task: ITask, columns: { id: string }[]): Promise<void> {
  try {
    if (!task.recurrence) return;
    const firstColumnId = columns[0]?.id || 'todo';

    const lastTask = await Task.findOne({
      boardId: task.boardId,
      status: firstColumnId,
      deletedAt: null,
    })
      .sort({ order: -1 })
      .select('order');

    const clone: Record<string, unknown> = {
      title: task.title,
      description: task.description,
      boardId: task.boardId,
      createdBy: task.createdBy,
      status: firstColumnId,
      assignedTo: task.assignedTo,
      imageUrl: task.imageUrl,
      tags: task.tags,
      priority: task.priority,
      recurrence: task.recurrence,
      checklist: (task.checklist ?? []).map((c) => ({ text: c.text, done: false })),
      order: lastTask ? lastTask.order + 1 : 0,
      dueDate: task.dueDate ? nextOccurrence(new Date(task.dueDate), task.recurrence) : null,
      deliveryDate: task.deliveryDate
        ? nextOccurrence(new Date(task.deliveryDate), task.recurrence)
        : null,
    };

    await Task.create(clone);
  } catch (error) {
    console.error('Error al crear la siguiente ocurrencia:', error);
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

    const board = await findEditableBoard(data.boardId, user);
    if (!board) {
      return { success: false, error: 'Tablero no encontrado o sin permisos de edición' };
    }

    // Validar el estado contra las columnas del tablero
    const validColumns = getBoardColumns(board.columns);
    const targetStatus = data.status || validColumns[0].id;
    if (!validColumns.some((c) => c.id === targetStatus)) {
      return { success: false, error: 'La columna indicada no existe en el tablero' };
    }

    await connectDB();

    // Obtener el orden más alto en la columna
    const lastTask = await Task.findOne({
      boardId: data.boardId,
      status: targetStatus,
    })
      .sort({ order: -1 })
      .select('order');

    const newOrder = lastTask ? lastTask.order + 1 : 0;

    const newTask = await Task.create({
      title: data.title.trim(),
      description: data.description?.trim() || '',
      boardId: data.boardId,
      createdBy: user.id,
      status: targetStatus,
      assignedTo: data.assignedTo || [],
      tags: data.tags || [],
      order: newOrder,
      imageUrl: data.imageUrl || undefined,
      priority: data.priority || undefined,
      checklist: (data.checklist || []).map((c) => ({ text: c.text.slice(0, 200), done: !!c.done })),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      recurrence: data.recurrence || null,
    });

    const populatedTask = await Task.findById(newTask._id)
      .populate('assignedTo', 'name email image')
      .lean();

    // Notificar a los asignados (excepto al creador)
    for (const assigneeId of data.assignedTo || []) {
      if (assigneeId !== user.id) {
        await notifyUser(assigneeId, 'assigned',
          `${user.name} te asignó la tarea "${newTask.title}"`,
          `/board/${data.boardId}?task=${newTask._id}`
        );
      }
    }

    await logActivity(data.boardId, user, 'created', newTask);

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

    const task = await findEditableTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos' };
    }

    const previousAssignees = new Set(task.assignedTo.map((a) => a.toString()));
    const oldStatus = task.status;
    const changed: string[] = [];

    // Actualizar campos
    if (data.title !== undefined && data.title.trim() !== task.title) {
      task.title = data.title.trim();
      changed.push('título');
    }
    if (data.description !== undefined && data.description.trim() !== (task.description || '')) {
      task.description = data.description.trim();
      changed.push('descripción');
    }
    let boardColumns: { id: string; title: string; color: string }[] | null = null;
    if (data.status !== undefined) {
      // Validar que sea una columna del tablero
      const board = await Board.findById(task.boardId).select('columns').lean();
      boardColumns = getBoardColumns(board?.columns);
      if (!boardColumns.some((c) => c.id === data.status)) {
        return { success: false, error: 'La columna indicada no existe en el tablero' };
      }
      if (data.status !== oldStatus) {
        task.status = data.status;
        changed.push(`estado → ${boardColumns.find((c) => c.id === data.status)?.title ?? data.status}`);
      }
    }
    if (data.assignedTo !== undefined) {
      task.assignedTo = data.assignedTo as unknown as Types.ObjectId[];
      changed.push('asignados');
    }
    if (data.tags !== undefined) {
      task.tags = data.tags;
      changed.push('etiquetas');
    }
    if (data.order !== undefined) task.order = data.order;
    if (data.imageUrl !== undefined) task.imageUrl = data.imageUrl;
    if (data.dueDate !== undefined) {
      task.dueDate = data.dueDate ? new Date(data.dueDate) : null;
      changed.push('fecha límite');
    }
    if (data.deliveryDate !== undefined) {
      task.deliveryDate = data.deliveryDate ? new Date(data.deliveryDate) : null;
      changed.push('fecha de entrega');
    }
    if (data.priority !== undefined) {
      task.priority = data.priority ?? undefined;
      changed.push('prioridad');
    }
    if (data.recurrence !== undefined) {
      task.recurrence = data.recurrence ?? null;
      changed.push('recurrencia');
    }
    if (data.checklist !== undefined) {
      task.set('checklist', data.checklist.map((c) => ({
        ...(c._id && isValidObjectId(c._id) ? { _id: new Types.ObjectId(c._id) } : {}),
        text: c.text.slice(0, 200),
        done: !!c.done,
      })));
    }

    await task.save();

    const updatedTask = await Task.findById(taskId)
      .populate('assignedTo', 'name email image')
      .lean();

    // Notificar a los nuevos asignados
    if (data.assignedTo !== undefined) {
      for (const assigneeId of task.assignedTo.map((a) => a.toString())) {
        if (!previousAssignees.has(assigneeId) && assigneeId !== user.id) {
          await notifyUser(assigneeId, 'assigned',
            `${user.name} te asignó la tarea "${task.title}"`,
            `/board/${task.boardId}?task=${task._id}`
          );
        }
      }
      if (task.assignedTo.some((a) => !previousAssignees.has(a.toString()))) {
        await logActivity(task.boardId.toString(), user, 'assigned', task);
      }
    }

    // Registrar actividad y, si se completó una tarea recurrente, crear la siguiente ocurrencia
    const doneColumnId = boardColumns
      ? getDoneColumnId(boardColumns)
      : null;
    const movedToDone = data.status !== undefined && data.status !== oldStatus && data.status === doneColumnId;
    if (movedToDone) {
      await logActivity(task.boardId.toString(), user, 'completed', task);
      if (task.recurrence) {
        const cols = boardColumns ?? getBoardColumns(
          (await Board.findById(task.boardId).select('columns').lean())?.columns
        );
        await spawnNextOccurrence(task, cols);
      }
    } else if (data.status !== undefined && data.status !== oldStatus) {
      await logActivity(task.boardId.toString(), user, 'moved', task,
        boardColumns?.find((c) => c.id === data.status)?.title);
    } else if (changed.length > 0) {
      await logActivity(task.boardId.toString(), user, 'updated', task, changed.join(', '));
    }

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
  newStatus: string,
  newOrder: number
): Promise<ApiResponse<ITask>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const task = await findEditableTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos' };
    }

    // Validar que el destino sea una columna válida del tablero
    const moveBoard = await Board.findById(task.boardId).select('columns').lean();
    const validColumns = getBoardColumns(moveBoard?.columns);
    if (!validColumns.some((c) => c.id === newStatus)) {
      return { success: false, error: 'Columna destino inválida' };
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

    // Actividad + recurrencia si llegó a la columna "done"
    const doneId = getDoneColumnId(validColumns);
    if (oldStatus !== newStatus) {
      if (newStatus === doneId) {
        await logActivity(task.boardId.toString(), user, 'completed', task);
        if (task.recurrence) await spawnNextOccurrence(task, validColumns);
      } else {
        await logActivity(task.boardId.toString(), user, 'moved', task,
          validColumns.find((c) => c.id === newStatus)?.title);
      }
    }

    revalidatePath(`/board/${task.boardId}`);

    return { success: true, data: JSON.parse(JSON.stringify(updatedTask)) };
  } catch (error) {
    console.error('Error al mover tarea:', error);
    return { success: false, error: 'Error al mover la tarea' };
  }
}

// Mover múltiples tareas a un estado (requiere acceso a los tableros involucrados)
export async function bulkUpdateTaskStatus(
  taskIds: string[],
  status: string
): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    if (!taskIds || taskIds.length === 0) {
      return { success: false, error: 'No se proporcionaron tareas' };
    }
    if (typeof status !== 'string' || status.length === 0 || status.length > 40) {
      return { success: false, error: 'Estado inválido' };
    }

    const invalidIds = taskIds.filter((id) => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      return { success: false, error: 'Algunos IDs de tarea son inválidos' };
    }

    await connectDB();

    const tasks = await Task.find({ _id: { $in: taskIds } });
    if (tasks.length === 0) {
      return { success: false, error: 'No se encontraron tareas' };
    }

    // Verificar acceso a todos los tableros involucrados y que la columna exista
    const boardIds = [...new Set(tasks.map((t) => t.boardId.toString()))];
    const boardsChecked = new Map<string, NonNullable<Awaited<ReturnType<typeof findEditableBoard>>>>();
    for (const boardId of boardIds) {
      const board = await findEditableBoard(boardId, user);
      if (!board) {
        return { success: false, error: 'Sin permisos de edición en algún tablero' };
      }
      if (!getBoardColumns(board.columns).some((c) => c.id === status)) {
        return { success: false, error: 'La columna destino no existe en algún tablero' };
      }
      boardsChecked.set(boardId, board);
    }

    // Agrupar por tablero y agregar al final de la columna destino
    for (const boardId of boardIds) {
      const boardTasks = tasks.filter((t) => t.boardId.toString() === boardId);
      const lastTask = await Task.findOne({ boardId, status })
        .sort({ order: -1 })
        .select('order');
      let nextOrder = lastTask ? lastTask.order + 1 : 0;
      for (const task of boardTasks) {
        task.status = status;
        task.order = nextOrder++;
        await task.save();
      }
      revalidatePath(`/board/${boardId}`);
    }

    // Actividad + recurrencia si las tareas llegaron a la columna "done"
    for (const boardId of boardIds) {
      const board = boardsChecked.get(boardId);
      const cols = board ? getBoardColumns(board.columns) : null;
      const doneId = cols ? getDoneColumnId(cols) : null;
      for (const task of tasks.filter((t) => t.boardId.toString() === boardId)) {
        if (status === doneId) {
          await logActivity(boardId, user, 'completed', task);
          if (task.recurrence && cols) await spawnNextOccurrence(task, cols);
        } else {
          await logActivity(boardId, user, 'moved', task);
        }
      }
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al mover tareas:', error);
    return { success: false, error: 'Error al mover las tareas' };
  }
}

// Actualizar solo el checklist de una tarea (toggle granular sin tocar otros campos)
export async function updateTaskChecklist(
  taskId: string,
  checklist: { _id?: string; text: string; done: boolean }[]
): Promise<ApiResponse<IChecklistItem[]>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const task = await findEditableTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos' };
    }

    task.set(
      'checklist',
      checklist.slice(0, 50).map((c) => ({
        ...(c._id && isValidObjectId(c._id) ? { _id: new Types.ObjectId(c._id) } : {}),
        text: c.text.slice(0, 200),
        done: !!c.done,
      }))
    );
    await task.save();

    revalidatePath(`/board/${task.boardId}`);

    return { success: true, data: JSON.parse(JSON.stringify(task.checklist)) };
  } catch (error) {
    console.error('Error al actualizar checklist:', error);
    return { success: false, error: 'Error al actualizar el checklist' };
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

    // Soft-delete: la tarea va a la papelera (los archivos S3 se borran al eliminar definitivamente)
    task.deletedAt = new Date();
    await task.save();

    // Reordenar las tareas restantes
    await Task.updateMany(
      { boardId, status, deletedAt: null, order: { $gt: order } },
      { $inc: { order: -1 } }
    );

    await logActivity(boardId.toString(), user, 'deleted', task);

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

    // Soft-delete: las tareas van a la papelera
    await Task.updateMany(
      { _id: { $in: taskIds } },
      { $set: { deletedAt: new Date() } }
    );

    // Reordenar las tareas restantes de cada tablero afectado
    for (const boardId of boardIds) {
      const boardTasks = await Task.find({ boardId, deletedAt: null }).sort({ status: 1, order: 1 });

      const tasksByStatus = new Map<string, typeof boardTasks>();

      boardTasks.forEach(task => {
        const list = tasksByStatus.get(task.status);
        if (list) list.push(task);
        else tasksByStatus.set(task.status, [task]);
      });

      for (const statusTasks of tasksByStatus.values()) {
        for (let i = 0; i < statusTasks.length; i++) {
          await Task.findByIdAndUpdate(statusTasks[i]._id, { order: i });
        }
      }

      revalidatePath(`/board/${boardId}`);
    }

    for (const t of tasks) {
      await logActivity(t.boardId.toString(), user, 'deleted', t);
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar tareas:', error);
    return { success: false, error: 'Error al eliminar las tareas' };
  }
}

// Detecta @menciones en un texto y notifica a los miembros del tablero.
// Soporta @email completo y @nombre (primer nombre del usuario).
async function notifyMentions(
  text: string,
  task: ITask,
  user: AuthUser,
  alreadyNotified: Set<string>
): Promise<void> {
  try {
    const board = await Board.findById(task.boardId).select('owner members').lean();
    if (!board) return;

    const emails = new Set<string>(board.members ?? []);
    const ownerUser = await User.findById(board.owner).select('email').lean();
    if (ownerUser) emails.add(ownerUser.email);
    const assignees = await User.find({ _id: { $in: task.assignedTo } }).select('email').lean();
    for (const a of assignees) emails.add(a.email);
    if (emails.size === 0) return;

    const users = await User.find({ email: { $in: [...emails] } })
      .select('_id name email')
      .lean();
    const lowered = text.toLowerCase();

    for (const u of users) {
      const uid = u._id.toString();
      if (uid === user.id || alreadyNotified.has(uid)) continue;
      const firstName = u.name.split(' ')[0].toLowerCase();
      const mentioned =
        lowered.includes(`@${u.email.toLowerCase()}`) ||
        (firstName.length >= 2 &&
          new RegExp(`@${escapeRegExp(firstName)}\\b`, 'i').test(text));
      if (mentioned) {
        alreadyNotified.add(uid);
        await notifyUser(
          uid,
          'mention',
          `${user.name} te mencionó en "${task.title}"`,
          `/board/${task.boardId}?task=${task._id}`
        );
      }
    }
  } catch (error) {
    console.error('Error procesando menciones:', error);
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

    const task = await findCommentableTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos para comentar' };
    }

    // El avatar se toma fresco de la DB: el JWT puede tener una URL vieja
    const dbUser = await User.findById(user.id).select('image name').lean();
    task.comments.push({
      authorId: user.id,
      authorName: dbUser?.name || user.name,
      authorImage: dbUser?.image || user.image || null,
      content: trimmed,
    } as unknown as IComment);

    await task.save();

    const newComment = task.comments[task.comments.length - 1];

    // Notificar al creador y asignados de la tarea (excepto al autor del comentario)
    const recipients = new Set<string>();
    if (task.createdBy) recipients.add(task.createdBy.toString());
    for (const a of task.assignedTo) recipients.add(a.toString());
    recipients.delete(user.id);
    for (const recipientId of recipients) {
      await notifyUser(recipientId, 'comment',
        `${user.name} comentó en "${task.title}"`,
        `/board/${task.boardId}?task=${task._id}`
      );
    }
    await notifyMentions(trimmed, task, user, recipients);
    await logActivity(task.boardId.toString(), user, 'commented', task);

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

    const task = await findCommentableTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos para comentar' };
    }

    const commentIndex = task.comments.findIndex(
      (c: IComment) => c._id.toString() === commentId
    );
    if (commentIndex === -1) {
      return { success: false, error: 'Comentario no encontrado' };
    }

    const comment = task.comments[commentIndex];
    // El avatar se toma fresco de la DB: el JWT puede tener una URL vieja
    const dbUser = await User.findById(user.id).select('image name').lean();
    comment.replies.push({
      authorId: user.id,
      authorName: dbUser?.name || user.name,
      authorImage: dbUser?.image || user.image || null,
      content: trimmed,
    } as unknown as IReply);

    await task.save();

    const newReply = comment.replies[comment.replies.length - 1];

    // Notificar al autor del comentario (excepto si responde a sí mismo)
    const notified = new Set<string>([user.id]);
    if (comment.authorId.toString() !== user.id) {
      notified.add(comment.authorId.toString());
      await notifyUser(comment.authorId.toString(), 'comment',
        `${user.name} respondió tu comentario en "${task.title}"`,
        `/board/${task.boardId}?task=${task._id}`
      );
    }
    await notifyMentions(trimmed, task, user, notified);

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

// Permisos del usuario actual sobre una tarea (para vistas fuera del tablero,
// p.ej. calendario, donde el rol depende del tablero de cada tarea)
export async function getMyTaskPermissions(
  taskId: string
): Promise<ApiResponse<{ canEdit: boolean; canComment: boolean }>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const task = await findAccessibleTask(taskId, user);
    if (!task) {
      return { success: false, error: 'Tarea no encontrada o sin permisos' };
    }

    const board = await findAccessibleBoard(task.boardId.toString(), user);
    if (!board) {
      return { success: false, error: 'Sin acceso al tablero' };
    }

    return {
      success: true,
      data: { canEdit: canEdit(board, user), canComment: canComment(board, user) },
    };
  } catch (error) {
    console.error('Error al obtener permisos de la tarea:', error);
    return { success: false, error: 'Error al obtener los permisos' };
  }
}

// Helper: valida IDs y devuelve las tareas junto con los tableros verificados como editables
async function getEditableTasksForBulk(taskIds: string[], user: AuthUser) {
  if (!taskIds || taskIds.length === 0 || taskIds.length > 200) {
    return { error: 'Selecciona entre 1 y 200 tareas' } as const;
  }
  const invalidIds = taskIds.filter((id) => !isValidObjectId(id));
  if (invalidIds.length > 0) {
    return { error: 'Algunos IDs de tarea son inválidos' } as const;
  }

  await connectDB();
  const tasks = await Task.find({ _id: { $in: taskIds }, deletedAt: null });
  if (tasks.length === 0) {
    return { error: 'No se encontraron tareas' } as const;
  }

  const boardIds = [...new Set(tasks.map((t) => t.boardId.toString()))];
  for (const boardId of boardIds) {
    const board = await findEditableBoard(boardId, user);
    if (!board) {
      return { error: 'Sin permisos de edición en algún tablero' } as const;
    }
  }

  return { tasks, boardIds } as const;
}

// Asignar responsables a múltiples tareas (reemplaza la lista de asignados)
export async function bulkAssignTasks(
  taskIds: string[],
  assigneeIds: string[]
): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const invalidAssignees = assigneeIds.filter((id) => !isValidObjectId(id));
    if (invalidAssignees.length > 0 || assigneeIds.length > 20) {
      return { success: false, error: 'Asignados inválidos' };
    }

    const checked = await getEditableTasksForBulk(taskIds, user);
    if ('error' in checked) {
      return { success: false, error: checked.error };
    }

    for (const task of checked.tasks) {
      task.assignedTo = assigneeIds as unknown as Types.ObjectId[];
      await task.save();
      await logActivity(task.boardId.toString(), user, 'assigned', task);
    }

    for (const boardId of checked.boardIds) {
      revalidatePath(`/board/${boardId}`);
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al asignar tareas:', error);
    return { success: false, error: 'Error al asignar las tareas' };
  }
}

// Agregar una etiqueta a múltiples tareas (sin duplicar por texto+color)
export async function bulkAddTagToTasks(
  taskIds: string[],
  tag: { text: string; color: string }
): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const text = tag?.text?.trim();
    if (!text || text.length > 30 || !/^#[0-9A-Fa-f]{6}$/.test(tag?.color ?? '')) {
      return { success: false, error: 'Etiqueta inválida' };
    }

    const checked = await getEditableTasksForBulk(taskIds, user);
    if ('error' in checked) {
      return { success: false, error: checked.error };
    }

    for (const task of checked.tasks) {
      const exists = task.tags.some((t) => t.text.toLowerCase() === text.toLowerCase());
      if (!exists && task.tags.length < 10) {
        task.tags.push({ text, color: tag.color });
        await task.save();
        await logActivity(task.boardId.toString(), user, 'updated', task, `etiqueta "${text}"`);
      }
    }

    for (const boardId of checked.boardIds) {
      revalidatePath(`/board/${boardId}`);
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al etiquetar tareas:', error);
    return { success: false, error: 'Error al etiquetar las tareas' };
  }
}
