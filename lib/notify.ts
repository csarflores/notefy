import connectDB from './mongodb';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { isValidObjectId } from './utils';
import { INotificationPrefs } from '@/types';
import { sendNotificationEmail } from './mail';

export type NotificationType =
  | 'assigned'
  | 'comment'
  | 'reply'
  | 'mention'
  | 'invite'
  | 'member'
  | 'reminder';

// Lee las preferencias del usuario; si el tipo está desactivado no crea nada.
// Si tiene email habilitado, además envía el correo (mejor esfuerzo).
async function deliverNotification(
  userId: string,
  type: NotificationType,
  message: string,
  link?: string
): Promise<void> {
  if (!isValidObjectId(userId)) return;
  await connectDB();

  const target = await User.findById(userId)
    .select('name email notificationPrefs')
    .lean();
  if (!target) return;

  const prefs = (target.notificationPrefs ?? {}) as Partial<INotificationPrefs>;
  // Por defecto todo habilitado (un campo solo bloquea si es explícitamente false)
  const wantsInApp = prefs[type] !== false;
  const wantsEmail = prefs.emailEnabled === true;

  if (wantsInApp) {
    await Notification.create({ user: userId, type, message: message.slice(0, 500), link });
  }

  if (wantsEmail && process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
    try {
      await sendNotificationEmail(target.email, target.name ?? '', message, link);
    } catch (error) {
      console.error('Error al enviar notificación por email:', error);
    }
  }
}

// Crea una notificación para un usuario por ID. Nunca lanza (mejor esfuerzo).
export async function notifyUser(
  userId: string,
  type: NotificationType,
  message: string,
  link?: string
): Promise<void> {
  try {
    await deliverNotification(userId, type, message, link);
  } catch (error) {
    console.error('Error al crear notificación:', error);
  }
}

// Crea una notificación buscando el usuario por email (miembros se guardan como email)
export async function notifyUserByEmail(
  email: string,
  type: NotificationType,
  message: string,
  link?: string
): Promise<void> {
  try {
    await connectDB();
    const target = await User.findOne({ email: email.toLowerCase() }).select('_id').lean();
    if (!target) return;
    await deliverNotification(target._id.toString(), type, message, link);
  } catch (error) {
    console.error('Error al crear notificación por email:', error);
  }
}
