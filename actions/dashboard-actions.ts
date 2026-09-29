'use server';

import connectDB from '@/lib/mongodb';
import Board from '@/models/Board';
import Task from '@/models/Task';
import { ApiResponse, ITask } from '@/types';
import { getAuthUser } from '@/lib/auth-helpers';
import { getDoneColumnId } from '@/lib/board-columns';

export interface ProjectProgress {
  projectId: string;
  total: number;
  done: number;
}

export interface ActivityItem {
  id: string;
  title: string;
  boardId: string;
  boardName: string;
  boardColor: string;
  status: string;
  updatedAt: string;
}

// Progreso (tareas done/total) por proyecto accesible
export async function getProjectsProgress(): Promise<ApiResponse<Record<string, { total: number; done: number }>>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    await connectDB();

    const boards = await Board.find({
      deletedAt: null,
      projectId: { $ne: null },
      $or: [{ owner: user.id }, { members: user.email }],
    }).select('_id projectId columns').lean();

    const boardIds = boards.map((b) => b._id);
    const boardProject = new Map(boards.map((b) => [b._id.toString(), b.projectId!.toString()]));
    const boardDoneId = new Map(boards.map((b) => [b._id.toString(), getDoneColumnId(b.columns)]));

    const grouped = await Task.aggregate([
      { $match: { boardId: { $in: boardIds }, deletedAt: null } },
      { $group: { _id: { boardId: '$boardId', status: '$status' }, count: { $sum: 1 } } },
    ]);

    const progress: Record<string, { total: number; done: number }> = {};
    for (const row of grouped) {
      const projectId = boardProject.get(row._id.boardId.toString());
      if (!projectId) continue;
      progress[projectId] ||= { total: 0, done: 0 };
      progress[projectId].total += row.count;
      if (row._id.status === boardDoneId.get(row._id.boardId.toString())) {
        progress[projectId].done += row.count;
      }
    }

    return { success: true, data: progress };
  } catch (error) {
    console.error('Error al obtener progreso:', error);
    return { success: false, error: 'Error al obtener el progreso' };
  }
}

// Actividad reciente: últimas tareas actualizadas en tableros accesibles
export async function getRecentActivity(limit = 8): Promise<ApiResponse<ActivityItem[]>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    await connectDB();

    const boards = await Board.find({
      deletedAt: null,
      $or: [{ owner: user.id }, { members: user.email }],
    }).select('_id name color').lean();

    const tasks = await Task.find({
      boardId: { $in: boards.map((b) => b._id) },
      deletedAt: null,
    })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select('title boardId status updatedAt')
      .lean();

    const boardMap = new Map(boards.map((b) => [b._id.toString(), b]));

    const items: ActivityItem[] = tasks.map((t) => {
      const board = boardMap.get(t.boardId.toString());
      return {
        id: t._id.toString(),
        title: t.title,
        boardId: t.boardId.toString(),
        boardName: board?.name || '',
        boardColor: board?.color || '#0066cc',
        status: t.status,
        updatedAt: t.updatedAt?.toISOString() || '',
      };
    });

    return { success: true, data: JSON.parse(JSON.stringify(items)) };
  } catch (error) {
    console.error('Error al obtener actividad:', error);
    return { success: false, error: 'Error al obtener la actividad' };
  }
}

// "Mi día": tareas asignadas al usuario vencidas, de hoy y de esta semana
export async function getMyDayTasks(): Promise<ApiResponse<{ overdue: ITask[]; today: ITask[]; week: ITask[] }>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    await connectDB();

    const boards = await Board.find({
      deletedAt: null,
      $or: [{ owner: user.id }, { members: user.email }],
    }).select('_id columns').lean();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    // Excluir la columna "completada" de cada tablero (última columna)
    const notDone = boards.map((b) => ({
      boardId: b._id,
      status: { $ne: getDoneColumnId(b.columns) },
    }));

    const base = {
      deletedAt: null,
      assignedTo: user.id,
      ...(notDone.length > 0 ? { $or: notDone } : { boardId: { $in: boards.map((b) => b._id) } }),
    };

    const populate = [
      { path: 'assignedTo', select: 'name email image' },
      { path: 'boardId', select: 'name projectId color columns' },
    ];

    const [overdue, today, week] = await Promise.all([
      Task.find({ ...base, deliveryDate: { $ne: null, $lt: startOfToday } })
        .populate(populate).sort({ deliveryDate: 1 }).limit(10).lean(),
      Task.find({ ...base, deliveryDate: { $gte: startOfToday, $lt: endOfToday } })
        .populate(populate).sort({ deliveryDate: 1 }).limit(10).lean(),
      Task.find({ ...base, deliveryDate: { $gte: endOfToday, $lte: endOfWeek } })
        .populate(populate).sort({ deliveryDate: 1 }).limit(10).lean(),
    ]);

    return { success: true, data: JSON.parse(JSON.stringify({ overdue, today, week })) };
  } catch (error) {
    console.error('Error al obtener Mi día:', error);
    return { success: false, error: 'Error al obtener las tareas del día' };
  }
}

// "Mis tareas": todas las tareas asignadas al usuario en tableros accesibles
export async function getMyTasks(): Promise<ApiResponse<ITask[]>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    await connectDB();

    const boards = await Board.find({
      deletedAt: null,
      $or: [{ owner: user.id }, { members: user.email }],
    }).select('_id columns').lean();

    // Excluir la columna "completada" de cada tablero (última columna)
    const notDone = boards.map((b) => ({
      boardId: b._id,
      status: { $ne: getDoneColumnId(b.columns) },
    }));

    const tasks = await Task.find({
      deletedAt: null,
      assignedTo: user.id,
      ...(notDone.length > 0 ? { $or: notDone } : { boardId: { $in: boards.map((b) => b._id) } }),
    })
      .populate([
        { path: 'assignedTo', select: 'name email image' },
        {
          path: 'boardId',
          select: 'name projectId color columns icon owner memberRoles',
          populate: { path: 'projectId', select: 'name color icon' },
        },
      ])
      .sort({ deliveryDate: 1, dueDate: 1, updatedAt: -1 })
      .limit(500)
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(tasks)) };
  } catch (error) {
    console.error('Error al obtener mis tareas:', error);
    return { success: false, error: 'Error al obtener las tareas' };
  }
}
