'use server';

import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Project from '@/models/Project';
import Board from '@/models/Board';
import Note from '@/models/Note';
import Task from '@/models/Task';
import bcrypt from 'bcryptjs';
import { isValidObjectId } from '@/lib/utils';
import { ApiResponse, IUser } from '@/types';
import { getAuthUser, getSharedUserScope } from '@/lib/auth-helpers';
import { deleteS3Prefix, S3_KEY_PREFIX } from '@/lib/s3';

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

// Cambiar la contraseña del usuario autenticado
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ApiResponse<null>> {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return { success: false, error: 'No autenticado' };
    }

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres' };
    }

    await connectDB();

    const user = await User.findById(authUser.id).select('+password');
    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    // Si el usuario tiene contraseña (credentials), verificar la actual
    if (user.password) {
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return { success: false, error: 'La contraseña actual es incorrecta' };
      }
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return { success: false, error: 'Error al cambiar la contraseña' };
  }
}

// Eliminar la cuenta del usuario autenticado y sus datos en cascada
export async function deleteAccount(password: string): Promise<ApiResponse<null>> {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return { success: false, error: 'No autenticado' };
    }

    await connectDB();

    const user = await User.findById(authUser.id).select('+password');
    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    // Confirmar con contraseña si la cuenta usa credentials
    if (user.password) {
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return { success: false, error: 'La contraseña es incorrecta' };
      }
    }

    const userId = user._id;
    const email = user.email;

    // Eliminar recursos propios en cascada
    const ownedBoards = await Board.find({ owner: userId }).select('_id').lean();
    const boardIds = ownedBoards.map((b) => b._id);
    const ownedTasks = await Task.find({ boardId: { $in: boardIds } }).select('_id').lean();

    await Task.deleteMany({ boardId: { $in: boardIds } });
    await Promise.all([
      Project.deleteMany({ owner: userId }),
      Board.deleteMany({ owner: userId }),
      Note.deleteMany({ owner: userId }),
      // Quitar al usuario como miembro de recursos ajenos
      Project.updateMany({ members: email }, { $pull: { members: email } }),
      Board.updateMany({ members: email }, { $pull: { members: email } }),
      Note.updateMany({ members: email }, { $pull: { members: email } }),
      // Limpiar archivos en S3 (mejor esfuerzo)
      ...ownedTasks.map((t) => deleteS3Prefix(`${S3_KEY_PREFIX}/tareas/${t._id}/`)),
      deleteS3Prefix(`${S3_KEY_PREFIX}/avatares/${userId}/`),
    ]);

    await User.findByIdAndDelete(userId);

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
    return { success: false, error: 'Error al eliminar la cuenta' };
  }
}
