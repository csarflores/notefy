'use server';

import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import { ApiResponse, ITag } from '@/types';
import { isValidObjectId } from '@/lib/utils';

// Obtener todas las etiquetas únicas de las tareas de un proyecto
export async function getProjectTags(projectId: string): Promise<ApiResponse<ITag[]>> {
  try {
    if (!isValidObjectId(projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    await connectDB();

    // Obtener todas las tareas del proyecto
    const tasks = await Task.find({ projectId }).select('tags').lean();

    // Extraer todas las etiquetas y eliminar duplicados
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
