import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { isValidObjectId } from '@/lib/utils';
import { ApiResponse, IUser } from '@/types';

export async function getUserById(userId: string): Promise<ApiResponse<IUser>> {
  try {
    if (!isValidObjectId(userId)) {
      return { success: false, error: 'ID de usuario inválido' };
    }

    await connectDB();

    const user = await User.findById(userId).lean();

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    return { success: true, data: JSON.parse(JSON.stringify(user)) };
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return { success: false, error: 'Error al obtener usuario' };
  }
}
