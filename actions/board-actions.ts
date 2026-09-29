'use server';

import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Board from '@/models/Board';
import Task from '@/models/Task';
import { CreateBoardInput, UpdateBoardInput, ApiResponse, IBoard, IBoardColumn, IUser, MemberRole } from '@/types';
import { DEFAULT_COLUMNS, getBoardColumns } from '@/lib/board-columns';
import { isValidObjectId } from '@/lib/utils';
import { createInvitation } from '@/actions/invitation-actions';
import {
  getAuthUser,
  isSelf,
  findAccessibleBoard,
  findEditableBoard,
  findEditableProject,
  findOwnedBoard,
  removeMemberRole,
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
      ],
      deletedAt: null,
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
      deletedAt: null,
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

// Obtener las columnas efectivas de un tablero (personalizadas o por defecto)
export async function getBoardColumnsAction(boardId: string): Promise<ApiResponse<IBoardColumn[]>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const board = await findAccessibleBoard(boardId, user);
    if (!board) {
      return { success: false, error: 'Tablero no encontrado' };
    }

    return { success: true, data: getBoardColumns(board.columns) };
  } catch (error) {
    console.error('Error al obtener columnas:', error);
    return { success: false, error: 'Error al obtener las columnas' };
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
      const project = await findEditableProject(data.projectId, user);
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
      icon: data.icon?.slice(0, 8) || '',
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
      const project = await findEditableProject(data.projectId, user);
      if (!project) {
        return { success: false, error: 'Proyecto no encontrado' };
      }
    }

    const updateData: UpdateBoardInput = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon ? data.icon.slice(0, 8) : '';
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

    // Soft-delete del tablero y sus tareas (restaurable desde la papelera)
    const now = new Date();
    await Task.updateMany({ boardId, deletedAt: null }, { deletedAt: now });
    board.deletedAt = now;
    await board.save();

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

// Invitar miembro al tablero (solo el propietario) — crea invitación pendiente
export async function addBoardMember(
  boardId: string,
  email: string,
  role: MemberRole = 'editor'
): Promise<ApiResponse<null>> {
  const result = await createInvitation('board', boardId, email, role);
  if (result.success) revalidatePath(`/board/${boardId}`);
  return { success: result.success, data: null, error: result.error };
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
    removeMemberRole(board, email);
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
      if (!isValidObjectId(pid) || !(await findEditableProject(pid, user))) {
        return { success: false, error: 'Proyecto de destino no encontrado o sin permisos de edición' };
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

// Plantillas de tablero: tareas de ejemplo por template
const BOARD_TEMPLATES: Record<string, { title: string; status: 'todo' | 'in-progress' | 'done'; priority?: 'low' | 'medium' | 'high' }[]> = {
  sprint: [
    { title: 'Planificar sprint', status: 'done', priority: 'high' },
    { title: 'Definir historias de usuario', status: 'in-progress', priority: 'high' },
    { title: 'Daily standup', status: 'in-progress' },
    { title: 'Desarrollar funcionalidad principal', status: 'todo', priority: 'medium' },
    { title: 'Code review', status: 'todo' },
    { title: 'Demo y retrospectiva', status: 'todo', priority: 'low' },
  ],
  personal: [
    { title: 'Definir objetivos de la semana', status: 'todo', priority: 'medium' },
    { title: 'Revisar pendientes', status: 'todo' },
    { title: 'Reservar tiempo de foco', status: 'in-progress' },
    { title: 'Cierre semanal', status: 'todo', priority: 'low' },
  ],
  client: [
    { title: 'Kickoff con el cliente', status: 'done', priority: 'high' },
    { title: 'Relevamiento de requisitos', status: 'in-progress', priority: 'high' },
    { title: 'Propuesta y presupuesto', status: 'todo', priority: 'medium' },
    { title: 'Entrega de avance', status: 'todo' },
    { title: 'Feedback y ajustes', status: 'todo' },
    { title: 'Entrega final', status: 'todo', priority: 'high' },
  ],
};

const BOARD_TEMPLATE_IDS = ['sprint', 'personal', 'client'] as const;
type BoardTemplateId = (typeof BOARD_TEMPLATE_IDS)[number];

// Crear un tablero desde una plantilla (con tareas de ejemplo)
export async function createBoardFromTemplate(
  userId: string,
  data: CreateBoardInput,
  templateId: string
): Promise<ApiResponse<IBoard>> {
  try {
    const template = BOARD_TEMPLATES[templateId];
    if (!template) {
      return { success: false, error: 'Plantilla no válida' };
    }

    const result = await createBoard(userId, data);
    if (!result.success || !result.data) {
      return result;
    }

    const newBoard = result.data;
    await Task.insertMany(
      template.map((t, i) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        boardId: newBoard._id,
        createdBy: userId,
        assignedTo: [],
        tags: [],
        order: i,
      }))
    );

    return { success: true, data: newBoard };
  } catch (error) {
    console.error('Error al crear tablero desde plantilla:', error);
    return { success: false, error: 'Error al crear el tablero' };
  }
}

// Duplicar un tablero con sus tareas (sin comentarios ni adjuntos)
export async function duplicateBoard(boardId: string): Promise<ApiResponse<IBoard>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const board = await findAccessibleBoard(boardId, user);
    if (!board) {
      return { success: false, error: 'Tablero no encontrado o sin permisos' };
    }

    await connectDB();

    const lastBoard = await Board.findOne({
      owner: user.id,
      projectId: board.projectId || null,
    }).sort({ order: -1 });

    const newBoard = await Board.create({
      name: `${board.name} (copia)`.slice(0, 100),
      description: board.description || '',
      owner: user.id,
      members: board.members || [],
      tags: board.tags || [],
      projectId: board.projectId || null,
      color: board.color,
      columns: board.columns || [],
      order: lastBoard ? lastBoard.order + 1 : 0,
    });

    const tasks = await Task.find({ boardId, deletedAt: null }).lean();
    if (tasks.length > 0) {
      await Task.insertMany(
        tasks.map((t) => ({
          title: t.title,
          description: t.description,
          status: t.status,
          boardId: newBoard._id,
          createdBy: user.id,
          assignedTo: t.assignedTo,
          tags: t.tags,
          order: t.order,
          dueDate: t.dueDate,
          deliveryDate: t.deliveryDate,
          checklist: t.checklist,
          priority: t.priority,
        }))
      );
    }

    revalidatePath('/dashboard');
    if (newBoard.projectId) {
      revalidatePath(`/parent-project/${newBoard.projectId}`);
    }

    return { success: true, data: JSON.parse(JSON.stringify(newBoard)) };
  } catch (error) {
    console.error('Error al duplicar tablero:', error);
    return { success: false, error: 'Error al duplicar el tablero' };
  }
}

// Guardar las columnas personalizadas de un tablero (add/rename/reorder/color en un paso).
// Las tareas de columnas eliminadas se mueven a la primera columna restante.
export async function saveBoardColumns(
  boardId: string,
  columns: IBoardColumn[]
): Promise<ApiResponse<IBoard>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const board = await findEditableBoard(boardId, user);
    if (!board) {
      return { success: false, error: 'Tablero no encontrado o sin permisos de edición' };
    }

    // Validaciones
    if (!Array.isArray(columns) || columns.length === 0 || columns.length > 8) {
      return { success: false, error: 'El tablero debe tener entre 1 y 8 columnas' };
    }
    const ids = new Set<string>();
    for (const col of columns) {
      const id = col.id?.trim();
      const title = col.title?.trim();
      if (!id || id.length > 40 || !/^[a-z0-9-]+$/.test(id)) {
        return { success: false, error: 'Cada columna necesita un ID válido (a-z, 0-9, guiones)' };
      }
      if (!title || title.length > 30) {
        return { success: false, error: 'Cada columna necesita un nombre (máx. 30 caracteres)' };
      }
      if (!/^#[0-9A-Fa-f]{6}$/.test(col.color)) {
        return { success: false, error: 'Color de columna inválido' };
      }
      if (ids.has(id)) {
        return { success: false, error: 'IDs de columna duplicados' };
      }
      ids.add(id);
    }

    const previousIds = new Set((board.columns ?? []).map((c) => c.id));
    const newIds = new Set(columns.map((c) => c.id));
    // IDs eliminados = columnas previas que ya no están (las default no se "eliminan"
    // salvo que el tablero ya tuviera columnas personalizadas)
    const effectivePrevious = previousIds.size > 0 ? previousIds : new Set(DEFAULT_COLUMNS.map((c) => c.id));
    const removedIds = [...effectivePrevious].filter((id) => !newIds.has(id));

    board.columns = columns.map((c) => ({
      id: c.id.trim(),
      title: c.title.trim(),
      color: c.color,
    }));
    await board.save();

    // Reasignar tareas de columnas eliminadas a la primera columna
    if (removedIds.length > 0) {
      await Task.updateMany(
        { boardId, status: { $in: removedIds }, deletedAt: null },
        { $set: { status: columns[0].id.trim() } }
      );
    }

    revalidatePath(`/board/${boardId}`);

    return { success: true, data: JSON.parse(JSON.stringify(board)) };
  } catch (error) {
    console.error('Error al guardar columnas:', error);
    return { success: false, error: 'Error al guardar las columnas' };
  }
}

// Crear (o devolver) el link público de solo lectura de un tablero (solo owner)
export async function createPublicBoardLink(
  boardId: string,
  userId: string
): Promise<ApiResponse<{ token: string }>> {
  try {
    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    const board = await findOwnedBoard(boardId, user);
    if (!board) {
      return { success: false, error: 'Solo el propietario puede crear un link público' };
    }

    if (!board.publicToken) {
      board.publicToken = crypto.randomBytes(24).toString('hex');
      await board.save();
    }

    return { success: true, data: { token: board.publicToken } };
  } catch (error) {
    console.error('Error al crear link público del tablero:', error);
    return { success: false, error: 'Error al crear el link' };
  }
}

// Revocar el link público de un tablero (solo owner)
export async function revokePublicBoardLink(
  boardId: string,
  userId: string
): Promise<ApiResponse<null>> {
  try {
    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    const board = await findOwnedBoard(boardId, user);
    if (!board) {
      return { success: false, error: 'Solo el propietario puede revocar el link' };
    }

    board.publicToken = null;
    await board.save();

    revalidatePath(`/board/${boardId}`);
    return { success: true, data: null };
  } catch (error) {
    console.error('Error al revocar link público del tablero:', error);
    return { success: false, error: 'Error al revocar el link' };
  }
}

// Vista pública de solo lectura — sin sesión, acceso por token
export async function getPublicBoard(token: string): Promise<
  ApiResponse<{
    name: string;
    color: string;
    icon?: string | null;
    columns: IBoardColumn[];
    tasks: {
      _id: string;
      title: string;
      description?: string;
      status: string;
      priority?: string;
      tags?: { text: string; color?: string }[];
      dueDate?: string | null;
      checklist?: { text: string; done: boolean }[];
    }[];
    updatedAt: string;
  }>
> {
  try {
    if (!token || typeof token !== 'string' || token.length > 128) {
      return { success: false, error: 'Link inválido' };
    }

    await connectDB();
    const board = await Board.findOne({ publicToken: token, deletedAt: null })
      .select('name color icon columns publicToken updatedAt')
      .lean();
    if (!board) {
      return { success: false, error: 'Tablero no encontrado o link revocado' };
    }

    const tasks = await Task.find({ boardId: board._id, deletedAt: null })
      .select('title description status priority tags dueDate checklist')
      .sort({ order: 1 })
      .lean();

    // Sanitización básica del HTML de descripciones (mismo patrón que getPublicNote)
    const sanitize = (html: string) =>
      (html ?? '')
        .replace(/<(script|iframe|object|embed|form|link|meta)[^>]*>[\s\S]*?<\/\1>/gi, '')
        .replace(/<(script|iframe|object|embed|form|link|meta)[^>]*\/?>/gi, '')
        .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/(href|src)\s*=\s*(['"]?)\s*javascript:[^'">\s]*\2/gi, '$1="#"');

    return {
      success: true,
      data: {
        name: board.name,
        color: board.color,
        icon: (board as { icon?: string }).icon ?? null,
        columns: board.columns ?? [],
        tasks: tasks.map((t) => ({
          _id: t._id.toString(),
          title: t.title,
          description: sanitize(t.description ?? ''),
          status: t.status,
          priority: t.priority,
          tags: t.tags?.map((tag) => ({ text: tag.text, color: tag.color })),
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
          checklist: t.checklist?.map((item) => ({ text: item.text, done: item.done })),
        })),
        updatedAt: board.updatedAt ? new Date(board.updatedAt).toISOString() : '',
      },
    };
  } catch (error) {
    console.error('Error al obtener tablero público:', error);
    return { success: false, error: 'Error al obtener el tablero' };
  }
}

// Timestamp de última modificación del tablero (board + tareas) para polling
export async function getBoardUpdatedAt(
  boardId: string
): Promise<ApiResponse<{ updatedAt: number }>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const board = await findAccessibleBoard(boardId, user);
    if (!board) {
      return { success: false, error: 'Tablero no encontrado' };
    }

    const latest = await Task.findOne({ boardId })
      .sort({ updatedAt: -1 })
      .select('updatedAt deletedAt')
      .lean();

    const boardTs = board.updatedAt ? new Date(board.updatedAt).getTime() : 0;
    const taskTs = latest?.updatedAt ? new Date(latest.updatedAt).getTime() : 0;
    const deletedTs = latest?.deletedAt ? new Date(latest.deletedAt).getTime() : 0;

    return { success: true, data: { updatedAt: Math.max(boardTs, taskTs, deletedTs) } };
  } catch (error) {
    console.error('Error al verificar actualización del tablero:', error);
    return { success: false, error: 'Error al verificar actualizaciones' };
  }
}
