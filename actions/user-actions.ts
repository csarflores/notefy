'use server';

import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { isValidObjectId } from '@/lib/utils';
import { ApiResponse, IUser } from '@/types';
import { getAuthUser, getSharedUserScope } from '@/lib/auth-helpers';

// Solo devuelve el perfil si el usuario consultado comparte algún recurso
// (tablero, proyecto o nota) con el usuario autenticado, o es él mismo.
export async function getUserById(userId: string): Promise<ApiResponse<IUser>> {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return { success: false, error: 'No autenticado' };
    }

    if (!isValidObjectId(userId)) {
      return { success: false, error: 'ID de usuario inválido' };
    }

    await connectDB();

    const user = await User.findById(userId).select('_id name email image').lean();

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    if (userId !== authUser.id) {
      const scope = await getSharedUserScope(authUser);
      if (!scope.ids.has(user._id.toString()) && !scope.emails.has(user.email)) {
        return { success: false, error: 'Usuario no encontrado' };
      }
    }

    return { success: true, data: JSON.parse(JSON.stringify(user)) };
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return { success: false, error: 'Error al obtener usuario' };
  }
}

// Actualizar el nombre del usuario autenticado
export async function updateUserProfile(data: { name?: string }): Promise<ApiResponse<IUser>> {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return { success: false, error: 'No autenticado' };
    }

    const name = data.name?.trim();
    if (!name || name.length < 2 || name.length > 50) {
      return { success: false, error: 'El nombre debe tener entre 2 y 50 caracteres' };
    }

    await connectDB();
    const updated = await User.findByIdAndUpdate(authUser.id, { name }, { new: true })
      .select('_id name email image')
      .lean();

    if (!updated) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    return { success: true, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return { success: false, error: 'Error al actualizar el perfil' };
  }
}

// Obtener varios usuarios por ID en una sola consulta.
// Solo devuelve usuarios que comparten algún recurso con el autenticado.
export async function getUsersByIds(userIds: string[]): Promise<ApiResponse<IUser[]>> {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return { success: false, error: 'No autenticado' };
    }

    const validIds = userIds.filter(isValidObjectId);
    if (validIds.length === 0) {
      return { success: true, data: [] };
    }

    const scope = await getSharedUserScope(authUser);

    await connectDB();

    const users = await User.find({ _id: { $in: validIds } })
      .select('_id name email image')
      .lean();

    const visible = users.filter(
      (user) =>
        scope.ids.has(user._id.toString()) || scope.emails.has(user.email)
    );

    return { success: true, data: JSON.parse(JSON.stringify(visible)) };
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return { success: false, error: 'Error al obtener usuarios' };
  }
}
