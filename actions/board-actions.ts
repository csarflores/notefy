'use server';

import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/mongodb';
import Board from '@/models/Board';
import Task from '@/models/Task';
import { CreateBoardInput, UpdateBoardInput, ApiResponse, IBoard, IUser } from '@/types';
import { isValidObjectId } from '@/lib/utils';

// Obtener todos los tableros del usuario
export async function getUserBoards(userId: string): Promise<ApiResponse<IBoard[]>> {
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

    const boards = await Board.find({
      $or: [
        { owner: userId },
        { members: user.email }
      ]
    })
      .sort({ order: 1, updatedAt: -1 })
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(boards)) };
  } catch (error) {
    console.error('Error al obtener tableros:', error);
    return { success: false, error: 'Error al obtener los tableros' };
  }
}

// Obtener tableros de un proyecto
export async function getProjectBoards(projectId: string, userId: string): Promise<ApiResponse<IBoard[]>> {
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

    const boards = await Board.find({
      projectId: projectId,
      $or: [
        { owner: userId },
        { members: user.email }
      ]
    })
      .sort({ order: 1, updatedAt: -1 })
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(boards)) };
  } catch (error) {
    console.error('Error al obtener tableros del proyecto:', error);
    return { success: false, error: 'Error al obtener los tableros' };
  }
}

// Obtener un tablero por ID
export async function getBoardById(boardId: string): Promise<ApiResponse<IBoard>> {
  try {
    if (!isValidObjectId(boardId)) {
      return { success: false, error: 'ID de tablero inválido' };
    }

    await connectDB();

    const board = await Board.findById(boardId);

    if (!board) {
      return { success: false, error: 'Tablero no encontrado' };
    }

    const boardData = board.toObject();
    return { success: true, data: JSON.parse(JSON.stringify(boardData)) };
  } catch (error) {
    console.error('Error al obtener tablero:', error);
    return { success: false, error: 'Error al obtener el tablero' };
  }
}

// Obtener usuarios del tablero (owner + members)
export async function getBoardUsers(
  boardId: string
): Promise<ApiResponse<IUser[]>> {
  try {
    if (!isValidObjectId(boardId)) {
      return { success: false, error: 'ID de tablero inválido' };
    }

    await connectDB();

    const board = await Board.findById(boardId).lean();

    if (!board) {
      return { success: false, error: 'Tablero no encontrado' };
    }

    const User = (await import('@/models/User')).default;

    const allUsers = await User.find({
      $or: [
        { _id: board.owner },
        { email: { $in: board.members } },
      ]
    }).select('_id name email image').lean();

    const seen = new Set<string>();
    const uniqueUsers = allUsers.filter((u) => {
      const id = u._id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    return { success: true, data: JSON.parse(JSON.stringify(uniqueUsers)) };
  } catch (error) {
    console.error('Error al obtener usuarios del tablero:', error);
    return { success: false, error: 'Error al obtener los usuarios' };
  }
}

// Crear un nuevo tablero
export async function createBoard(
  userId: string,
  data: CreateBoardInput
): Promise<ApiResponse<IBoard>> {
  try {
    if (!isValidObjectId(userId)) {
      return { success: false, error: 'ID de usuario inválido' };
    }

    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: 'El nombre del tablero es requerido' };
    }

    if (data.projectId && !isValidObjectId(data.projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    await connectDB();

    let projectMembers: string[] = [];

    if (data.projectId) {
      const Project = (await import('@/models/Project')).default;
      const project = await Project.findById(data.projectId);
      if (!project) {
        return { success: false, error: 'Proyecto no encontrado' };
      }
      // Heredar los miembros del proyecto (incluyendo el email del owner)
      const User = (await import('@/models/User')).default;
      const owner = await User.findById(project.owner).lean();
      const ownerEmail = owner?.email;
      const creator = await User.findById(userId).lean();
      const creatorEmail = creator?.email;
      
      projectMembers = project.members || [];
      // Asegurar que el email del owner esté en la lista
      if (ownerEmail && !projectMembers.includes(ownerEmail)) {
        projectMembers.push(ownerEmail);
      }
      // Asegurar que el email del creador esté en la lista
      if (creatorEmail && !projectMembers.includes(creatorEmail)) {
        projectMembers.push(creatorEmail);
      }
    }

    // Obtener el orden más alto para tableros del mismo proyecto/usuario
    const lastBoard = await Board.findOne({
      owner: userId,
      projectId: data.projectId || null
    }).sort({ order: -1 });

    const newOrder = lastBoard ? lastBoard.order + 1 : 0;

    const newBoard = await Board.create({
      name: data.name.trim(),
      description: data.description?.trim() || '',
      owner: userId,
      members: projectMembers,
      projectId: data.projectId || null,
      color: data.color || '#6b7280',
      order: newOrder,
    });

    revalidatePath('/dashboard');
    if (data.projectId) {
      revalidatePath(`/parent-project/${data.projectId}`);
    }

    return { success: true, data: JSON.parse(JSON.stringify(newBoard)) };
  } catch (error) {
    console.error('Error al crear tablero:', error);
    return { success: false, error: 'Error al crear el tablero' };
  }
}

// Actualizar un tablero
export async function updateBoard(
  boardId: string,
  data: UpdateBoardInput
): Promise<ApiResponse<IBoard>> {
  try {
    if (!isValidObjectId(boardId)) {
      return { success: false, error: 'ID de tablero inválido' };
    }

    if (data.projectId !== undefined && data.projectId !== null && !isValidObjectId(data.projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    await connectDB();

    if (data.projectId) {
      const Project = (await import('@/models/Project')).default;
      const project = await Project.findById(data.projectId);
      if (!project) {
        return { success: false, error: 'Proyecto no encontrado' };
      }
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.color !== undefined) updateData.color = data.color;
    if (data.members !== undefined) updateData.members = data.members;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;

    const updatedBoard = await Board.findByIdAndUpdate(
      boardId,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!updatedBoard) {
      return { success: false, error: 'Tablero no encontrado' };
    }

    revalidatePath('/dashboard');
    revalidatePath(`/project/${boardId}`);
    if (updatedBoard.projectId) {
      revalidatePath(`/parent-project/${updatedBoard.projectId}`);
    }

    return { success: true, data: JSON.parse(JSON.stringify(updatedBoard)) };
  } catch (error) {
    console.error('Error al actualizar tablero:', error);
    return { success: false, error: 'Error al actualizar el tablero' };
  }
}

// Eliminar un tablero
export async function deleteBoard(boardId: string): Promise<ApiResponse<null>> {
  try {
    if (!isValidObjectId(boardId)) {
      return { success: false, error: 'ID de tablero inválido' };
    }

    await connectDB();

    const board = await Board.findById(boardId);
    if (!board) {
      return { success: false, error: 'Tablero no encontrado' };
    }

    await Task.deleteMany({ projectId: boardId });
    await Board.findByIdAndDelete(boardId);

    revalidatePath('/dashboard');
    if (board.projectId) {
      revalidatePath(`/parent-project/${board.projectId}`);
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('Error al eliminar tablero:', error);
    return { success: false, error: 'Error al eliminar el tablero' };
  }
}

// Agregar miembro al tablero
export async function addBoardMember(
  boardId: string,
  email: string
): Promise<ApiResponse<IBoard>> {
  try {
    if (!isValidObjectId(boardId)) {
      return { success: false, error: 'ID de tablero inválido' };
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return { success: false, error: 'Email inválido' };
    }

    await connectDB();

    const board = await Board.findById(boardId);

    if (!board) {
      return { success: false, error: 'Tablero no encontrado' };
    }

    if (board.members.includes(email)) {
      return { success: false, error: 'El miembro ya está en el tablero' };
    }

    board.members.push(email);
    await board.save();

    revalidatePath(`/project/${boardId}`);

    return { success: true, data: JSON.parse(JSON.stringify(board)) };
  } catch (error) {
    console.error('Error al agregar miembro:', error);
    return { success: false, error: 'Error al agregar el miembro' };
  }
}

// Eliminar miembro del tablero
export async function removeBoardMember(
  boardId: string,
  email: string
): Promise<ApiResponse<IBoard>> {
  try {
    if (!isValidObjectId(boardId)) {
      return { success: false, error: 'ID de tablero inválido' };
    }

    await connectDB();

    const board = await Board.findById(boardId);

    if (!board) {
      return { success: false, error: 'Tablero no encontrado' };
    }

    board.members = board.members.filter((member) => member !== email);
    await board.save();

    revalidatePath(`/project/${boardId}`);

    return { success: true, data: JSON.parse(JSON.stringify(board)) };
  } catch (error) {
    console.error('Error al eliminar miembro:', error);
    return { success: false, error: 'Error al eliminar el miembro' };
  }
}

// Reordenar tableros
export async function reorderBoards(
  userId: string,
  boardOrders: Array<{ boardId: string; order: number; projectId?: string | null }>
): Promise<ApiResponse<IBoard[]>> {
  try {
    if (!isValidObjectId(userId)) {
      return { success: false, error: 'ID de usuario inválido' };
    }

    await connectDB();

    // Verificar que el usuario es owner de todos los tableros
    const boardIds = boardOrders.map(bo => bo.boardId);
    const boards = await Board.find({
      _id: { $in: boardIds },
      owner: userId
    });

    if (boards.length !== boardOrders.length) {
      return { success: false, error: 'No tienes permiso para reordenar algunos tableros' };
    }

    // Actualizar el orden de cada tablero
    const updatePromises = boardOrders.map(({ boardId, order, projectId }) =>
      Board.findByIdAndUpdate(
        boardId,
        { order, ...(projectId !== undefined && { projectId }) },
        { new: true, runValidators: true }
      ).lean()
    );

    const updatedBoards = await Promise.all(updatePromises);

    revalidatePath('/dashboard');

    return { success: true, data: JSON.parse(JSON.stringify(updatedBoards)) };
  } catch (error) {
    console.error('Error al reordenar tableros:', error);
    return { success: false, error: 'Error al reordenar los tableros' };
  }
}

// Convertir un project existente a board on-the-fly
export async function createBoardFromProject(projectId: string): Promise<ApiResponse<IBoard>> {
  try {
    if (!isValidObjectId(projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    await connectDB();

    const Project = (await import('@/models/Project')).default;
    const Task = (await import('@/models/Task')).default;

    const project = await Project.findById(projectId);

    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    // Crear un nuevo Board con los datos del Project
    const board = new Board({
      _id: project._id, // Usar el mismo ID
      name: project.name,
      description: project.description || '',
      owner: project.owner,
      members: project.members || [],
      tags: [],
      projectId: null,
    });

    await board.save();

    // Migrar tasks asociadas a este project
    const tasks = await Task.find({ projectId: project._id });
    if (tasks.length > 0) {
      await Task.updateMany(
        { projectId: project._id },
        { boardId: project._id }
      );
    }

    return { success: true, data: JSON.parse(JSON.stringify(board)) };
  } catch (error) {
    console.error('Error al convertir project a board:', error);
    return { success: false, error: 'Error al convertir el proyecto a tablero' };
  }
}
