import connectDB from './mongodb';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { isValidObjectId } from './utils';

// Crea una notificación para un usuario por ID. Nunca lanza (mejor esfuerzo).
export async function notifyUser(
  userId: string,
  type: 'assigned' | 'comment' | 'reply' | 'mention' | 'invite' | 'member' | 'reminder',
  message: string,
  link?: string
): Promise<void> {
  try {
    if (!isValidObjectId(userId)) return;
    await connectDB();
    await Notification.create({ user: userId, type, message: message.slice(0, 500), link });
  } catch (error) {
    console.error('Error al crear notificación:', error);
  }
}

// Crea una notificación buscando el usuario por email (miembros se guardan como email)
export async function notifyUserByEmail(
  email: string,
  type: 'assigned' | 'comment' | 'reply' | 'mention' | 'invite' | 'member' | 'reminder',
  message: string,
  link?: string
): Promise<void> {
  try {
    await connectDB();
    const target = await User.findOne({ email: email.toLowerCase() }).select('_id').lean();
    if (!target) return;
    await Notification.create({ user: target._id, type, message: message.slice(0, 500), link });
  } catch (error) {
    console.error('Error al crear notificación por email:', error);
  }
}
