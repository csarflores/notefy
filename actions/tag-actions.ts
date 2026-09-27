'use server';

import { revalidatePath } from 'next/cache';
import Task from '@/models/Task';
import { ApiResponse, ITag } from '@/types';
import { getAuthUser, findAccessibleBoard, findOwnedBoard } from '@/lib/auth-helpers';

export async function getBoardTags(boardId: string): Promise<ApiResponse<ITag[]>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const board = await findAccessibleBoard(boardId, user);
    if (!board) return { success: false, error: 'Tablero no encontrado o sin permisos' };

    return { success: true, data: JSON.parse(JSON.stringify(board.tags || [])) };
  } catch (error) {
    console.error('Error al obtener etiquetas del tablero:', error);
    return { success: false, error: 'Error al obtener las etiquetas' };
  }
}

export async function addBoardTag(boardId: string, tag: ITag): Promise<ApiResponse<ITag[]>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const text = tag.text?.trim();
    if (!text) return { success: false, error: 'El texto de la etiqueta es requerido' };
    if (text.length > 30) return { success: false, error: 'El texto no puede exceder 30 caracteres' };
    if (!/^#[0-9A-F]{6}$/i.test(tag.color)) return { success: false, error: 'Color inválido' };

    const board = await findAccessibleBoard(boardId, user);
    if (!board) return { success: false, error: 'Tablero no encontrado o sin permisos' };

    const exists = board.tags.some((t: ITag) => t.text.toLowerCase() === text.toLowerCase());
    if (exists) return { success: false, error: 'Ya existe una etiqueta con ese nombre' };

    if (board.tags.length >= 20) return { success: false, error: 'No puedes agregar más de 20 etiquetas al tablero' };

    board.tags.push({ text, color: tag.color });
    await board.save();

    revalidatePath(`/board/${boardId}`);
    return { success: true, data: JSON.parse(JSON.stringify(board.tags)) };
  } catch (error) {
    console.error('Error al agregar etiqueta:', error);
    return { success: false, error: 'Error al agregar la etiqueta' };
  }
}

export async function updateBoardTag(
  boardId: string,
  oldText: string,
  newTag: ITag
): Promise<ApiResponse<ITag[]>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const newText = newTag.text?.trim();
    if (!newText) return { success: false, error: 'El texto de la etiqueta es requerido' };
    if (newText.length > 30) return { success: false, error: 'El texto no puede exceder 30 caracteres' };
    if (!/^#[0-9A-F]{6}$/i.test(newTag.color)) return { success: false, error: 'Color inválido' };

    const board = await findAccessibleBoard(boardId, user);
    if (!board) return { success: false, error: 'Tablero no encontrado o sin permisos' };

    const tagIndex = board.tags.findIndex((t: ITag) => t.text.toLowerCase() === oldText.toLowerCase());
    if (tagIndex === -1) return { success: false, error: 'Etiqueta no encontrada' };

    if (newText.toLowerCase() !== oldText.toLowerCase()) {
      const duplicate = board.tags.some(
        (t: ITag, i: number) => i !== tagIndex && t.text.toLowerCase() === newText.toLowerCase()
      );
      if (duplicate) return { success: false, error: 'Ya existe una etiqueta con ese nombre' };
    }

    board.tags[tagIndex] = { text: newText, color: newTag.color };
    await board.save();

    // Actualizar en todas las tareas del tablero
    await Task.updateMany(
      { boardId, 'tags.text': oldText },
      { $set: { 'tags.$[elem].text': newText, 'tags.$[elem].color': newTag.color } },
      { arrayFilters: [{ 'elem.text': oldText }] }
    );

    revalidatePath(`/board/${boardId}`);
    return { success: true, data: JSON.parse(JSON.stringify(board.tags)) };
  } catch (error) {
    console.error('Error al actualizar etiqueta:', error);
    return { success: false, error: 'Error al actualizar la etiqueta' };
  }
}

export async function deleteBoardTag(boardId: string, tagText: string): Promise<ApiResponse<ITag[]>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Solo el propietario del tablero puede eliminar etiquetas
    const board = await findOwnedBoard(boardId, user);
    if (!board) return { success: false, error: 'Solo el propietario del tablero puede eliminar etiquetas' };

    board.tags = board.tags.filter((t: ITag) => t.text.toLowerCase() !== tagText.toLowerCase());
    await board.save();

    // Eliminar de todas las tareas del tablero
    await Task.updateMany(
      { boardId, 'tags.text': tagText },
      { $pull: { tags: { text: tagText } } }
    );

    revalidatePath(`/board/${boardId}`);
    return { success: true, data: JSON.parse(JSON.stringify(board.tags)) };
  } catch (error) {
    console.error('Error al eliminar etiqueta:', error);
    return { success: false, error: 'Error al eliminar la etiqueta' };
  }
}
