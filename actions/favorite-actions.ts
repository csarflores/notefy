'use server';

import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { ApiResponse } from '@/types';
import { isValidObjectId } from '@/lib/utils';
import { getAuthUser } from '@/lib/auth-helpers';

export type FavoriteKind = 'project' | 'board' | 'note';

const favKey = (kind: FavoriteKind, id: string) => `${kind}:${id}`;

// Alternar favorito de un recurso (project|board|note)
export async function toggleFavorite(
  kind: FavoriteKind,
  resourceId: string
): Promise<ApiResponse<{ favorite: boolean; favorites: string[] }>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }
    if (!isValidObjectId(resourceId) || !['project', 'board', 'note'].includes(kind)) {
      return { success: false, error: 'Recurso inválido' };
    }

    await connectDB();

    const key = favKey(kind, resourceId);
    const dbUser = await User.findById(user.id).select('favorites');
    if (!dbUser) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    const has = dbUser.favorites.includes(key);
    if (has) {
      dbUser.favorites = dbUser.favorites.filter((f) => f !== key);
    } else {
      dbUser.favorites.push(key);
    }
    await dbUser.save();

    revalidatePath('/dashboard');
    revalidatePath(`/notes/${resourceId}`);
    revalidatePath(`/board/${resourceId}`);
    revalidatePath(`/parent-project/${resourceId}`);

    return {
      success: true,
      data: { favorite: !has, favorites: JSON.parse(JSON.stringify(dbUser.favorites)) },
    };
  } catch (error) {
    console.error('Error al alternar favorito:', error);
    return { success: false, error: 'Error al actualizar favoritos' };
  }
}

// Obtener las claves de favoritos del usuario ("tipo:id")
export async function getUserFavorites(): Promise<ApiResponse<string[]>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    await connectDB();
    const dbUser = await User.findById(user.id).select('favorites').lean();

    return { success: true, data: JSON.parse(JSON.stringify(dbUser?.favorites || [])) };
  } catch (error) {
    console.error('Error al obtener favoritos:', error);
    return { success: false, error: 'Error al obtener favoritos' };
  }
}
