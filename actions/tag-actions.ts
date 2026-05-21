'use server';

import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import Board from '@/models/Board';
import { ApiResponse, ITag } from '@/types';
import { isValidObjectId } from '@/lib/utils';

export async function getProjectTags(projectId: string): Promise<ApiResponse<ITag[]>> {
  try {
    if (!isValidObjectId(projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    await connectDB();

    const tasks = await Task.find({ boardId: projectId }).select('tags').lean();

    const allTags: ITag[] = [];
    const tagTexts = new Set<string>();

    tasks.forEach((task) => {
      if (task.tags && Array.isArray(task.tags)) {
        task.tags.forEach((tag: ITag) => {
          if (!tagTexts.has(tag.text.toLowerCase())) {
            tagTexts.add(tag.text.toLowerCase());
            allTags.push(tag);
          }
        });
      }
    });

    return { success: true, data: allTags };
  } catch (error) {
    console.error('Error al obtener etiquetas del proyecto:', error);
    return { success: false, error: 'Error al obtener las etiquetas' };
  }
}

export async function getBoardTags(boardId: string): Promise<ApiResponse<ITag[]>> {
  try {
    if (!isValidObjectId(boardId)) {
      return { success: false, error: 'ID de tablero inválido' };
    }

    await connectDB();

    const board = await Board.findById(boardId).select('tags').lean();
    if (!board) return { success: false, error: 'Tablero no encontrado' };

    return { success: true, data: JSON.parse(JSON.stringify(board.tags || [])) };
  } catch (error) {
    console.error('Error al obtener etiquetas del tablero:', error);
    return { success: false, error: 'Error al obtener las etiquetas' };
  }
}

export async function addBoardTag(boardId: string, tag: ITag): Promise<ApiResponse<ITag[]>> {
  try {
    if (!isValidObjectId(boardId)) {
      return { success: false, error: 'ID de tablero inválido' };
    }

    const text = tag.text?.trim();
    if (!text) return { success: false, error: 'El texto de la etiqueta es requerido' };
    if (text.length > 30) return { success: false, error: 'El texto no puede exceder 30 caracteres' };
    if (!/^#[0-9A-F]{6}$/i.test(tag.color)) return { success: false, error: 'Color inválido' };

    await connectDB();

    const board = await Board.findById(boardId).select('tags');
    if (!board) return { success: false, error: 'Tablero no encontrado' };

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
    if (!isValidObjectId(boardId)) {
      return { success: false, error: 'ID de tablero inválido' };
    }

    const newText = newTag.text?.trim();
    if (!newText) return { success: false, error: 'El texto de la etiqueta es requerido' };
    if (newText.length > 30) return { success: false, error: 'El texto no puede exceder 30 caracteres' };
    if (!/^#[0-9A-F]{6}$/i.test(newTag.color)) return { success: false, error: 'Color inválido' };

    await connectDB();

    const board = await Board.findById(boardId).select('tags');
    if (!board) return { success: false, error: 'Tablero no encontrado' };

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
    if (!isValidObjectId(boardId)) {
      return { success: false, error: 'ID de tablero inválido' };
    }

    await connectDB();

    const board = await Board.findById(boardId).select('tags');
    if (!board) return { success: false, error: 'Tablero no encontrado' };

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
