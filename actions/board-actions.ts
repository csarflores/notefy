'use server';

import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/mongodb';
import Board from '@/models/Board';
import Task from '@/models/Task';
import { CreateBoardInput, UpdateBoardInput, ApiResponse, IBoard, IUser } from '@/types';
import { isValidObjectId } from '@/lib/utils';
import { deleteS3Prefix, S3_KEY_PREFIX } from '@/lib/s3';
import {
  getAuthUser,
  isSelf,
  findAccessibleBoard,
  findAccessibleProject,
  findOwnedBoard,
} from '@/lib/auth-helpers';

// Obtener todos los tableros del usuario
export async function getUserBoards(userId: string): Promise<ApiResponse<IBoard[]>> {
  try {
    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    await connectDB();

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

    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    await connectDB();

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
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const board = await findAccessibleBoard(boardId, user);
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
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const board = await findAccessibleBoard(boardId, user);
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
    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
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
      const project = await findAccessibleProject(data.projectId, user);
      if (!project) {
        return { success: false, error: 'Proyecto no encontrado' };
      }
      // Heredar los miembros del proyecto (incluyendo el email del owner)
      const User = (await import('@/models/User')).default;
      const owner = await User.findById(project.owner).lean();
      const ownerEmail = owner?.email;

      projectMembers = project.members || [];
      // Asegurar que el email del owner esté en la lista
      if (ownerEmail && !projectMembers.includes(ownerEmail)) {
        projectMembers.push(ownerEmail);
      }
      // Asegurar que el email del creador esté en la lista
      if (!projectMembers.includes(user.email)) {
        projectMembers.push(user.email);
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

// Actualizar un tablero (solo el propietario)
export async function updateBoard(
  boardId: string,
  data: UpdateBoardInput
): Promise<ApiResponse<IBoard>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    if (data.projectId !== undefined && data.projectId !== null && !isValidObjectId(data.projectId)) {
      return { success: false, error: 'ID de proyecto inválido' };
    }

    const board = await findOwnedBoard(boardId, user);
    if (!board) {
      return { success: false, error: 'Tablero no encontrado o sin permisos' };
    }

    if (data.projectId) {
      const project = await findAccessibleProject(data.projectId, user);
      if (!project) {
        return { success: false, error: 'Proyecto no encontrado' };
      }
    }

    const updateData: UpdateBoardInput = {};
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
    revalidatePath(`/board/${boardId}`);
    if (updatedBoard.projectId) {
      revalidatePath(`/parent-project/${updatedBoard.projectId}`);
    }

    return { success: true, data: JSON.parse(JSON.stringify(updatedBoard)) };
  } catch (error) {
    console.error('Error al actualizar tablero:', error);
    return { success: false, error: 'Error al actualizar el tablero' };
  }
}

// Eliminar un tablero (solo el propietario)
export async function deleteBoard(boardId: string): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const board = await findOwnedBoard(boardId, user);
    if (!board) {
      return { success: false, error: 'Tablero no encontrado o sin permisos' };
    }

    const taskIds = await Task.find({ boardId }).select('_id').lean();
    await Task.deleteMany({ boardId });
    await Board.findByIdAndDelete(boardId);
    await Promise.all(
      taskIds.map((t) => deleteS3Prefix(`${S3_KEY_PREFIX}/tareas/${t._id}/`))
    );

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

// Agregar miembro al tablero (solo el propietario)
export async function addBoardMember(
  boardId: string,
  email: string
): Promise<ApiResponse<IBoard>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return { success: false, error: 'Email inválido' };
    }

    const board = await findOwnedBoard(boardId, user);
    if (!board) {
      return { success: false, error: 'Tablero no encontrado o sin permisos' };
    }

    if (board.members.includes(email)) {
      return { success: false, error: 'El miembro ya está en el tablero' };
    }

    board.members.push(email);
    await board.save();

    revalidatePath(`/board/${boardId}`);

    return { success: true, data: JSON.parse(JSON.stringify(board)) };
  } catch (error) {
    console.error('Error al agregar miembro:', error);
    return { success: false, error: 'Error al agregar el miembro' };
  }
}

// Eliminar miembro del tablero (solo el propietario)
export async function removeBoardMember(
  boardId: string,
  email: string
): Promise<ApiResponse<IBoard>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const board = await findOwnedBoard(boardId, user);
    if (!board) {
      return { success: false, error: 'Tablero no encontrado o sin permisos' };
    }

    board.members = board.members.filter((member) => member !== email);
    await board.save();

    revalidatePath(`/board/${boardId}`);

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
    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    // Validar todos los IDs
    const invalidIds = boardOrders.filter(bo => !isValidObjectId(bo.boardId));
    if (invalidIds.length > 0) {
      return { success: false, error: 'Algunos IDs de tablero son inválidos' };
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

    // Verificar acceso a los proyectos de destino
    const targetProjectIds = [...new Set(
      boardOrders
        .map(bo => bo.projectId)
        .filter((pid): pid is string => !!pid)
    )];
    for (const pid of targetProjectIds) {
      if (!isValidObjectId(pid) || !(await findAccessibleProject(pid, user))) {
        return { success: false, error: 'Proyecto de destino no encontrado o sin permisos' };
      }
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
