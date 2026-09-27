'use server';

import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import Board from '@/models/Board';
import Note from '@/models/Note';
import Task from '@/models/Task';
import { getAuthUser, isSelf } from '@/lib/auth-helpers';

export interface SearchResult {
  id: string;
  type: 'project' | 'board' | 'note' | 'task';
  title: string;
  subtitle?: string;
  url: string;
}

export async function globalSearch(userId: string, query: string): Promise<SearchResult[]> {
  const user = await getAuthUser();
  if (!user || !isSelf(user, userId)) return [];

  if (!query.trim()) return [];

  await connectDB();

  // Escapar caracteres especiales de regex para evitar ReDoS/inyección
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const q = new RegExp(escaped, 'i');
  const limit = 5;

  // Tableros accesibles para acotar la búsqueda de tareas
  const accessibleBoards = await Board.find({
    $or: [{ owner: userId }, { members: user.email }],
  }).select('_id').lean();
  const boardIds = accessibleBoards.map(b => b._id);

  const [projects, boards, notes, tasks] = await Promise.all([
    Project.find({
      $and: [
        { $or: [{ owner: userId }, { members: user.email }] },
        { name: q },
      ],
    }).limit(limit).lean(),

    Board.find({
      $and: [
        { $or: [{ owner: userId }, { members: user.email }] },
        { name: q },
      ],
    }).limit(limit).lean(),

    Note.find({
      $and: [
        { $or: [{ owner: userId }, { members: user.email, visibility: 'shared' }] },
        { $or: [{ title: q }, { content: q }] },
      ],
    }).limit(limit).lean(),

    Task.find({ boardId: { $in: boardIds }, title: q }).limit(limit).lean(),
  ]);

  const results: SearchResult[] = [
    ...projects.map((p) => ({
      id: p._id.toString(),
      type: 'project' as const,
      title: p.name,
      subtitle: p.description || undefined,
      url: `/parent-project/${p._id}`,
    })),
    ...boards.map((b) => ({
      id: b._id.toString(),
      type: 'board' as const,
      title: b.name,
      subtitle: b.description || undefined,
      url: `/board/${b._id}`,
    })),
    ...notes.map((n) => ({
      id: n._id.toString(),
      type: 'note' as const,
      title: n.title,
      url: `/notes/${n._id}`,
    })),
    ...tasks.map((t) => ({
      id: t._id.toString(),
      type: 'task' as const,
      title: t.title,
      subtitle: `Estado: ${t.status}`,
      url: `/board/${t.boardId}`,
    })),
  ];

  return JSON.parse(JSON.stringify(results));
}
