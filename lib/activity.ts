import { Types } from 'mongoose';
import connectDB from './mongodb';
import Activity from '@/models/Activity';
import { IActivity } from '@/types';
import { isValidObjectId } from './utils';
import { AuthUser } from './auth-helpers';

interface ActivityTaskRef {
  _id: { toString(): string };
  title?: string;
}

// Registra una acción en el historial del tablero. Nunca lanza (mejor esfuerzo).
export async function logActivity(
  boardId: string,
  user: AuthUser,
  action: IActivity['action'],
  task?: ActivityTaskRef | null,
  detail?: string
): Promise<void> {
  try {
    if (!isValidObjectId(boardId)) return;
    await connectDB();
    await Activity.create({
      boardId: new Types.ObjectId(boardId),
      taskId: task?._id ? new Types.ObjectId(task._id.toString()) : null,
      taskTitle: task?.title?.slice(0, 200) ?? '',
      actorId: new Types.ObjectId(user.id),
      actorName: user.name || user.email,
      actorImage: user.image || undefined,
      action,
      detail: detail?.slice(0, 300) ?? '',
    });
  } catch (error) {
    console.error('Error al registrar actividad:', error);
  }
}
