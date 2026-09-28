'use server';

import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { ApiResponse, INotification } from '@/types';
import { isValidObjectId } from '@/lib/utils';
import { getAuthUser } from '@/lib/auth-helpers';

// Obtener las notificaciones del usuario (más recientes primero)
export async function getNotifications(limit = 30): Promise<ApiResponse<INotification[]>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    await connectDB();
    const notifications = await Notification.find({ user: user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(notifications)) };
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    return { success: false, error: 'Error al obtener las notificaciones' };
  }
}

// Contador de no leídas (para el badge de la campana)
export async function getUnreadCount(): Promise<ApiResponse<number>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    await connectDB();
    const count = await Notification.countDocuments({ user: user.id, read: false });

    return { success: true, data: count };
  } catch (error) {
    console.error('Error al contar notificaciones:', error);
    return { success: false, error: 'Error al contar notificaciones' };
  }
}

// Marcar una notificación como leída
export async function markNotificationRead(notificationId: string): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!isValidObjectId(notificationId)) {
      return { success: false, error: 'ID inválido' };
    }

    await connectDB();
    await Notification.updateOne(
      { _id: notificationId, user: user.id },
      { $set: { read: true } }
    );

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    return { success: false, error: 'Error al marcar la notificación' };
  }
}

// Marcar todas como leídas
export async function markAllNotificationsRead(): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    await connectDB();
    await Notification.updateMany(
      { user: user.id, read: false },
      { $set: { read: true } }
    );

    revalidatePath('/');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error al marcar notificaciones:', error);
    return { success: false, error: 'Error al marcar las notificaciones' };
  }
}

// Eliminar una notificación
export async function deleteNotification(notificationId: string): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!isValidObjectId(notificationId)) {
      return { success: false, error: 'ID inválido' };
    }

    await connectDB();
    await Notification.deleteOne({ _id: notificationId, user: user.id });

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    return { success: false, error: 'Error al eliminar la notificación' };
  }
}
