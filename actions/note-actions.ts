'use server';

import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/mongodb';
import Note from '@/models/Note';
import { CreateNoteInput, UpdateNoteInput, ApiResponse, INote } from '@/types';
import { isValidObjectId } from '@/lib/utils';

// Obtener todas las notas del usuario (incluyendo notas compartidas con él)
export async function getUserNotes(userId: string): Promise<ApiResponse<INote[]>> {
  try {
    if (!isValidObjectId(userId)) {
      return { success: false, error: 'ID de usuario inválido' };
    }

    await connectDB();

    const User = (await import('@/models/User')).default;
    const user = await User.findById(userId).lean();

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    // Buscar notas donde el usuario es owner O está en members (notas compartidas)
    const notes = await Note.find({
      $or: [
        { owner: userId },
        { members: user.email, visibility: 'shared' }
      ]
    })
      .sort({ updatedAt: -1 })
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(notes)) };
  } catch (error) {
    console.error('Error al obtener notas:', error);
    return { success: false, error: 'Error al obtener las notas' };
  }
}

// Obtener notas de un proyecto (privadas del usuario + compartidas en el proyecto)
export async function getProjectNotes(projectId: string, userId: string): Promise<ApiResponse<INote[]>> {
  try {
    if (!isValidObjectId(projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    if (!isValidObjectId(userId)) {
      return { success: false, error: 'ID de usuario inválido' };
    }

    await connectDB();

    const User = (await import('@/models/User')).default;
    const user = await User.findById(userId).lean();

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    // Obtener el proyecto para verificar si el usuario es miembro
    const Project = (await import('@/models/Project')).default;
    const project = await Project.findById(projectId).lean();

    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    // Verificar si el usuario es miembro del proyecto (owner o en members)
    const isProjectMember = project.owner.toString() === userId || project.members.includes(user.email);

    // Buscar notas del proyecto donde:
    // - El usuario es owner (incluye notas privadas)
    // - La nota es shared y el usuario está en members de la nota
    // - La nota es shared y el usuario es miembro del proyecto (para notas compartidas a nivel proyecto)
    const notes = await Note.find({
      projectId: projectId,
      $or: [
        { owner: userId },
        { members: user.email, visibility: 'shared' },
        { visibility: 'shared' } // Notas shared son visibles para todos los miembros del proyecto
      ]
    })
      .sort({ updatedAt: -1 })
      .lean();

    // Filtrar: notas privadas solo para el owner, notas shared para miembros del proyecto
    const filteredNotes = notes.filter(note => {
      if (note.visibility === 'private') {
        return note.owner.toString() === userId;
      }
      // Notas shared: visibles para todos los miembros del proyecto
      return isProjectMember;
    });

    return { success: true, data: JSON.parse(JSON.stringify(filteredNotes)) };
  } catch (error) {
    console.error('Error al obtener notas del proyecto:', error);
    return { success: false, error: 'Error al obtener las notas del proyecto' };
  }
}

// Obtener una nota por ID
export async function getNoteById(noteId: string, userId: string): Promise<ApiResponse<INote>> {
  try {
    if (!isValidObjectId(noteId)) {
      return { success: false, error: 'ID de nota inválido' };
    }

    await connectDB();

    const User = (await import('@/models/User')).default;
    const user = await User.findById(userId).lean();

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    const note = await Note.findById(noteId);

    if (!note) {
      return { success: false, error: 'Nota no encontrada' };
    }

    // Verificar permisos: owner o member (si es shared)
    const isOwner = note.owner.toString() === userId;
    const isMember = note.visibility === 'shared' && note.members.includes(user.email);

    if (!isOwner && !isMember) {
      return { success: false, error: 'No tienes permiso para ver esta nota' };
    }

    const noteData = note.toObject();
    return { success: true, data: JSON.parse(JSON.stringify(noteData)) };
  } catch (error) {
    console.error('Error al obtener nota:', error);
    return { success: false, error: 'Error al obtener la nota' };
  }
}

// Crear una nueva nota
export async function createNote(
  userId: string,
  data: CreateNoteInput
): Promise<ApiResponse<INote>> {
  try {
    if (!isValidObjectId(userId)) {
      return { success: false, error: 'ID de usuario inválido' };
    }

    if (!data.title || data.title.trim().length === 0) {
      return { success: false, error: 'El título de la nota es requerido' };
    }

    if (data.projectId && !isValidObjectId(data.projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    await connectDB();

    // Si la nota está en un proyecto, verificar que el proyecto existe
    if (data.projectId) {
      const Project = (await import('@/models/Project')).default;
      const project = await Project.findById(data.projectId);
      if (!project) {
        return { success: false, error: 'Proyecto no encontrado' };
      }
    }

    const newNote = await Note.create({
      title: data.title.trim(),
      content: data.content || '',
      visibility: data.visibility || 'private',
      owner: userId,
      members: [],
      projectId: data.projectId || null,
    });

    revalidatePath('/dashboard');
    if (data.projectId) {
      revalidatePath(`/parent-project/${data.projectId}`);
    }

    return { success: true, data: JSON.parse(JSON.stringify(newNote)) };
  } catch (error) {
    console.error('Error al crear nota:', error);
    return { success: false, error: 'Error al crear la nota' };
  }
}

// Actualizar una nota
export async function updateNote(
  noteId: string,
  userId: string,
  data: UpdateNoteInput
): Promise<ApiResponse<INote>> {
  try {
    if (!isValidObjectId(noteId)) {
      return { success: false, error: 'ID de nota inválido' };
    }

    await connectDB();

    const User = (await import('@/models/User')).default;
    const user = await User.findById(userId).lean();

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    const note = await Note.findById(noteId);

    if (!note) {
      return { success: false, error: 'Nota no encontrada' };
    }

    // Verificar permisos: owner o member (si es shared)
    const isOwner = note.owner.toString() === userId;
    const isMember = note.visibility === 'shared' && note.members.includes(user.email);

    if (!isOwner && !isMember) {
      return { success: false, error: 'No tienes permiso para editar esta nota' };
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.content !== undefined) updateData.content = data.content;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;
    if (data.members !== undefined) updateData.members = data.members;
    if (data.projectId !== undefined) {
      if (data.projectId && !isValidObjectId(data.projectId)) {
        return { success: false, error: 'ID de proyecto inválido' };
      }
      updateData.projectId = data.projectId;
    }

    const updatedNote = await Note.findByIdAndUpdate(
      noteId,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!updatedNote) {
      return { success: false, error: 'Nota no encontrada' };
    }

    revalidatePath('/dashboard');
    revalidatePath(`/notes/${noteId}`);
    if (updatedNote.projectId) {
      revalidatePath(`/parent-project/${updatedNote.projectId}`);
    }

    return { success: true, data: JSON.parse(JSON.stringify(updatedNote)) };
  } catch (error) {
    console.error('Error al actualizar nota:', error);
    return { success: false, error: 'Error al actualizar la nota' };
  }
}

// Eliminar una nota
export async function deleteNote(noteId: string, userId: string): Promise<ApiResponse<null>> {
  try {
    if (!isValidObjectId(noteId)) {
      return { success: false, error: 'ID de nota inválido' };
    }

    await connectDB();

    const note = await Note.findById(noteId);

    if (!note) {
      return { success: false, error: 'Nota no encontrada' };
    }

    // Solo el owner puede eliminar
    if (note.owner.toString() !== userId) {
      return { success: false, error: 'Solo el propietario puede eliminar la nota' };
    }

    await Note.findByIdAndDelete(noteId);

    revalidatePath('/dashboard');
    revalidatePath(`/notes/${noteId}`);
    if (note.projectId) {
      revalidatePath(`/parent-project/${note.projectId}`);
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar nota:', error);
    return { success: false, error: 'Error al eliminar la nota' };
  }
}

// Compartir nota con un usuario
export async function shareNote(
  noteId: string,
  userId: string,
  email: string
): Promise<ApiResponse<INote>> {
  try {
    if (!isValidObjectId(noteId)) {
      return { success: false, error: 'ID de nota inválido' };
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return { success: false, error: 'Email inválido' };
    }

    await connectDB();

    const note = await Note.findById(noteId);

    if (!note) {
      return { success: false, error: 'Nota no encontrada' };
    }

    // Solo el owner puede compartir
    if (note.owner.toString() !== userId) {
      return { success: false, error: 'Solo el propietario puede compartir la nota' };
    }

    // Cambiar visibilidad a shared si no lo es
    if (note.visibility !== 'shared') {
      note.visibility = 'shared';
    }

    if (note.members.includes(email)) {
      return { success: false, error: 'El usuario ya tiene acceso a esta nota' };
    }

    note.members.push(email);
    await note.save();

    revalidatePath('/dashboard');
    revalidatePath(`/notes/${noteId}`);
    if (note.projectId) {
      revalidatePath(`/parent-project/${note.projectId}`);
    }

    return { success: true, data: JSON.parse(JSON.stringify(note)) };
  } catch (error) {
    console.error('Error al compartir nota:', error);
    return { success: false, error: 'Error al compartir la nota' };
  }
}

// Remover acceso de un usuario a la nota
export async function removeNoteMember(
  noteId: string,
  userId: string,
  email: string
): Promise<ApiResponse<INote>> {
  try {
    if (!isValidObjectId(noteId)) {
      return { success: false, error: 'ID de nota inválido' };
    }

    await connectDB();

    const note = await Note.findById(noteId);

    if (!note) {
      return { success: false, error: 'Nota no encontrada' };
    }

    // Solo el owner puede remover miembros
    if (note.owner.toString() !== userId) {
      return { success: false, error: 'Solo el propietario puede remover miembros' };
    }

    note.members = note.members.filter((member) => member !== email);
    
    // Si no hay miembros, volver a private
    if (note.members.length === 0) {
      note.visibility = 'private';
    }
    
    await note.save();

    revalidatePath('/dashboard');
    revalidatePath(`/notes/${noteId}`);
    if (note.projectId) {
      revalidatePath(`/parent-project/${note.projectId}`);
    }

    return { success: true, data: JSON.parse(JSON.stringify(note)) };
  } catch (error) {
    console.error('Error al remover miembro:', error);
    return { success: false, error: 'Error al remover el miembro' };
  }
}
