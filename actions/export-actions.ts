'use server';

import connectDB from '@/lib/mongodb';
import { Types } from 'mongoose';
import Project from '@/models/Project';
import Board from '@/models/Board';
import Task from '@/models/Task';
import Note from '@/models/Note';
import { ApiResponse, ITag, MemberRole, TaskPriority, TaskRecurrence } from '@/types';
import {
  getAuthUser,
  isSelf,
  findAccessibleBoard,
  findEditableBoard,
} from '@/lib/auth-helpers';

// ─── Backup completo de la cuenta en JSON ────────────────────────────────────

export async function exportAccountJSON(
  userId: string
): Promise<ApiResponse<{ filename: string; json: string }>> {
  try {
    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    await connectDB();

    const email = user.email.toLowerCase();
    const scope = {
      $or: [{ owner: userId }, { members: email }],
      deletedAt: null,
    };

    const [projects, boards, notes] = await Promise.all([
      Project.find(scope).lean(),
      Board.find(scope).lean(),
      Note.find(scope).lean(),
    ]);

    const boardIds = boards.map((b) => b._id);
    const tasks = await Task.find({ boardId: { $in: boardIds }, deletedAt: null }).lean();

    const backup = {
      format: 'harold-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      projects: projects.map((p) => ({
        name: p.name,
        description: p.description,
        color: p.color,
        icon: (p as { icon?: string }).icon,
        isOwner: p.owner.toString() === userId,
      })),
      boards: boards.map((b) => ({
        name: b.name,
        description: b.description,
        color: b.color,
        icon: (b as { icon?: string }).icon,
        columns: b.columns,
        tags: b.tags,
        projectIndex: pIndexOf(projects, b.projectId),
        isOwner: b.owner.toString() === userId,
      })),
      tasks: tasks.map((t) => ({
        title: t.title,
        description: t.description,
        status: t.status,
        boardIndex: boardIds.findIndex((id) => id.toString() === t.boardId.toString()),
        priority: t.priority,
        tags: t.tags,
        checklist: t.checklist?.map((c) => ({ text: c.text, done: c.done })),
        dueDate: t.dueDate,
        deliveryDate: t.deliveryDate,
        recurrence: t.recurrence,
      })),
      notes: notes.map((n) => ({
        title: n.title,
        content: n.content,
        visibility: n.visibility,
        color: (n as { color?: string }).color,
        projectIndex: pIndexOf(projects, n.projectId),
        isOwner: n.owner.toString() === userId,
      })),
    };

    const date = new Date().toISOString().slice(0, 10);
    return {
      success: true,
      data: {
        filename: `harold-backup-${date}.json`,
        json: JSON.stringify(backup, null, 2),
      },
    };
  } catch (error) {
    console.error('Error al exportar backup:', error);
    return { success: false, error: 'Error al generar el backup' };
  }
}

function pIndexOf(
  projects: { _id: { toString(): string } }[],
  projectId?: { toString(): string } | null
): number {
  if (!projectId) return -1;
  return projects.findIndex((p) => p._id.toString() === projectId.toString());
}

// ─── Exportar tablero a CSV ──────────────────────────────────────────────────

const CSV_HEADERS = [
  'title',
  'description',
  'column',
  'priority',
  'dueDate',
  'deliveryDate',
  'tags',
  'checklist',
];

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function stripHtml(html: string): string {
  return (html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

export async function exportBoardCSV(
  boardId: string
): Promise<ApiResponse<{ filename: string; csv: string }>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const board = await findAccessibleBoard(boardId, user);
    if (!board) {
      return { success: false, error: 'Tablero no encontrado o sin acceso' };
    }

    const tasks = await Task.find({ boardId, deletedAt: null }).sort({ order: 1 }).lean();
    const columnTitle = new Map(
      (board.columns ?? []).map((c) => [c.id, c.title])
    );

    const rows = tasks.map((t) =>
      [
        t.title,
        stripHtml(t.description ?? ''),
        columnTitle.get(t.status) ?? t.status,
        t.priority ?? '',
        t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : '',
        t.deliveryDate ? new Date(t.deliveryDate).toISOString().slice(0, 10) : '',
        (t.tags ?? []).map((tag) => tag.text).join('|'),
        (t.checklist ?? [])
          .map((c) => `${c.done ? '[x]' : '[ ]'} ${c.text}`)
          .join('|'),
      ]
        .map((v) => csvEscape(String(v)))
        .join(',')
    );

    const csv = [CSV_HEADERS.join(','), ...rows].join('\n');
    const safeName = board.name.replace(/[^\wáéíóúñü -]/gi, '').trim() || 'tablero';
    return {
      success: true,
      data: { filename: `${safeName}.csv`, csv },
    };
  } catch (error) {
    console.error('Error al exportar CSV:', error);
    return { success: false, error: 'Error al generar el CSV' };
  }
}

// ─── Parser CSV simple (soporta comillas y saltos de línea dentro de celdas) ──

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

// ─── Importar CSV a un tablero ───────────────────────────────────────────────

const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);
const VALID_RECURRENCE = new Set(['daily', 'weekly', 'monthly']);

export async function importCSVToBoard(
  boardId: string,
  csvText: string
): Promise<ApiResponse<{ imported: number }>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const board = await findEditableBoard(boardId, user);
    if (!board) {
      return { success: false, error: 'Tablero no encontrado o sin permisos de edición' };
    }

    if (!csvText || csvText.length > 2_000_000) {
      return { success: false, error: 'Archivo CSV vacío o demasiado grande (máx. 2 MB)' };
    }

    const rows = parseCSV(csvText).filter((r) => r.some((c) => c.trim() !== ''));
    if (rows.length === 0) {
      return { success: false, error: 'El CSV no contiene filas' };
    }

    // Cabeceras (en inglés o español)
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const colOf = (names: string[]) => {
      for (const name of names) {
        const idx = headers.indexOf(name);
        if (idx !== -1) return idx;
      }
      return -1;
    };
    const iTitle = colOf(['title', 'título', 'titulo', 'name', 'nombre']);
    if (iTitle === -1) {
      return { success: false, error: 'El CSV debe tener una columna "title" o "título"' };
    }
    const iDesc = colOf(['description', 'descripción', 'descripcion', 'desc']);
    const iCol = colOf(['column', 'columna', 'status', 'estado']);
    const iPrio = colOf(['priority', 'prioridad']);
    const iDue = colOf(['duedate', 'fecha', 'fecha_limite', 'fechalimite']);
    const iDeliv = colOf(['deliverydate', 'entrega']);
    const iTags = colOf(['tags', 'etiquetas']);
    const iCheck = colOf(['checklist', 'subtareas']);

    const columns = board.columns ?? [];
    const columnIdByTitle = new Map(
      columns.map((c) => [c.title.toLowerCase(), c.id])
    );
    const defaultStatus = columns[0]?.id ?? 'todo';
    const boardTags = new Map(
      (board.tags ?? []).map((t: ITag) => [t.text.toLowerCase(), t])
    );

    const dataRows = rows.slice(1).slice(0, 500); // límite de seguridad
    const parseDate = (v: string) => {
      const d = new Date(v.trim());
      return isNaN(d.getTime()) ? null : d;
    };

    const docs = dataRows.map((r) => {
      const colName = iCol !== -1 ? r[iCol]?.trim().toLowerCase() : '';
      const status = colName && columnIdByTitle.has(colName)
        ? columnIdByTitle.get(colName)!
        : defaultStatus;

      const prio = iPrio !== -1 ? r[iPrio]?.trim().toLowerCase() : '';
      const tags = (iTags !== -1 ? r[iTags] ?? '' : '')
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10)
        .map((text) => boardTags.get(text.toLowerCase()) ?? { text, color: '#8e8e93' });

      const checklist = (iCheck !== -1 ? r[iCheck] ?? '' : '')
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 50)
        .map((raw) => {
          const done = /^\[x\]/i.test(raw);
          return { text: raw.replace(/^\[[ xX]\]\s*/, '').trim(), done };
        });

      return {
        title: (r[iTitle] ?? '').trim().slice(0, 200),
        description: iDesc !== -1 ? `<p>${(r[iDesc] ?? '').trim()}</p>` : '',
        boardId: board._id,
        status,
        priority: VALID_PRIORITIES.has(prio) ? (prio as TaskPriority) : undefined,
        tags,
        checklist,
        dueDate: iDue !== -1 ? parseDate(r[iDue] ?? '') : null,
        deliveryDate: iDeliv !== -1 ? parseDate(r[iDeliv] ?? '') : null,
        createdBy: user.id,
        assignedTo: [],
      };
    }).filter((d) => d.title.length > 0);

    if (docs.length === 0) {
      return { success: false, error: 'No se encontraron tareas válidas en el CSV' };
    }

    await Task.insertMany(docs);

    return { success: true, data: { imported: docs.length } };
  } catch (error) {
    console.error('Error al importar CSV:', error);
    return { success: false, error: 'Error al importar el CSV' };
  }
}

// ─── Importar JSON de Trello a un tablero ────────────────────────────────────

interface TrelloCard {
  name: string;
  desc?: string;
  idList: string;
  closed?: boolean;
  due?: string | null;
  labels?: { name?: string; color?: string }[];
  checklists?: {
    checkItems?: { name: string; state?: string }[];
  }[];
}

interface TrelloList {
  id: string;
  name: string;
  closed?: boolean;
}

const TRELLO_COLORS: Record<string, string> = {
  green: '#34c759', yellow: '#ffcc00', orange: '#ff9500', red: '#ff3b30',
  purple: '#af52de', blue: '#0066cc', sky: '#5ac8fa', lime: '#a0e22e',
  pink: '#ff2d55', black: '#1d1d1f',
};

export async function importTrelloJSON(
  boardId: string,
  jsonText: string
): Promise<ApiResponse<{ imported: number; columns: number }>> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const board = await findEditableBoard(boardId, user);
    if (!board) {
      return { success: false, error: 'Tablero no encontrado o sin permisos de edición' };
    }

    if (!jsonText || jsonText.length > 10_000_000) {
      return { success: false, error: 'Archivo vacío o demasiado grande (máx. 10 MB)' };
    }

    let trello: { lists?: TrelloList[]; cards?: TrelloCard[] };
    try {
      trello = JSON.parse(jsonText);
    } catch {
      return { success: false, error: 'El archivo no es un JSON válido' };
    }

    const lists = (trello.lists ?? []).filter((l) => !l.closed);
    const cards = (trello.cards ?? []).filter((c) => !c.closed && c.name?.trim());
    if (cards.length === 0) {
      return { success: false, error: 'El JSON no contiene tarjetas de Trello' };
    }

    // Crear columnas que no existan ya (por nombre)
    const columns = [...(board.columns ?? [])];
    const listToColumn = new Map<string, string>();
    const byTitle = new Map(columns.map((c) => [c.title.toLowerCase(), c.id]));

    for (const list of lists) {
      const existing = byTitle.get(list.name.trim().toLowerCase());
      if (existing) {
        listToColumn.set(list.id, existing);
      } else {
        const newId = `col-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        columns.push({ id: newId, title: list.name.slice(0, 40), color: '#8e8e93' });
        listToColumn.set(list.id, newId);
      }
    }
    board.columns = columns;
    await board.save();

    const defaultStatus = columns[0]?.id ?? 'todo';
    const docs = cards.slice(0, 500).map((card) => ({
      title: card.name.trim().slice(0, 200),
      description: card.desc?.trim() ? `<p>${card.desc.trim()}</p>` : '',
      boardId: board._id,
      status: listToColumn.get(card.idList) ?? defaultStatus,
      tags: (card.labels ?? [])
        .filter((l) => l.name)
        .slice(0, 10)
        .map((l) => ({
          text: (l.name ?? '').slice(0, 30),
          color: TRELLO_COLORS[l.color ?? ''] ?? '#8e8e93',
        })),
      checklist: (card.checklists ?? [])
        .flatMap((cl) => cl.checkItems ?? [])
        .slice(0, 50)
        .map((ci) => ({ text: ci.name.slice(0, 200), done: ci.state === 'complete' })),
      dueDate: card.due ? new Date(card.due) : null,
      createdBy: user.id,
      assignedTo: [],
    }));

    await Task.insertMany(docs);

    return {
      success: true,
      data: { imported: docs.length, columns: listToColumn.size },
    };
  } catch (error) {
    console.error('Error al importar Trello:', error);
    return { success: false, error: 'Error al importar el archivo de Trello' };
  }
}

// ─── Restaurar backup completo de la cuenta ──────────────────────────────────

interface BackupFile {
  format?: string;
  projects?: { name: string; description?: string; color?: string; icon?: string; isOwner?: boolean }[];
  boards?: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    columns?: { id: string; title: string; color: string }[];
    tags?: ITag[];
    projectIndex?: number;
    isOwner?: boolean;
  }[];
  tasks?: {
    title: string;
    description?: string;
    status?: string;
    boardIndex?: number;
    priority?: string;
    tags?: ITag[];
    checklist?: { text: string; done: boolean }[];
    dueDate?: string;
    deliveryDate?: string;
    recurrence?: string;
  }[];
  notes?: {
    title: string;
    content?: string;
    visibility?: string;
    color?: string;
    projectIndex?: number;
    isOwner?: boolean;
  }[];
}

export async function importAccountBackup(
  userId: string,
  jsonText: string
): Promise<ApiResponse<{ projects: number; boards: number; tasks: number; notes: number }>> {
  try {
    const user = await getAuthUser();
    if (!user || !isSelf(user, userId)) {
      return { success: false, error: 'No autorizado' };
    }

    if (!jsonText || jsonText.length > 20_000_000) {
      return { success: false, error: 'Archivo vacío o demasiado grande (máx. 20 MB)' };
    }

    let backup: BackupFile;
    try {
      backup = JSON.parse(jsonText);
    } catch {
      return { success: false, error: 'El archivo no es un JSON válido' };
    }
    if (backup.format !== 'harold-backup') {
      return { success: false, error: 'El archivo no es un backup de Harold' };
    }

    await connectDB();
    const email = user.email.toLowerCase();

    // 1. Proyectos (solo los propios; los compartidos no se pueden recrear)
    const projectIds: (Types.ObjectId | null)[] = [];
    for (const p of backup.projects ?? []) {
      if (p.isOwner === false || !p.name?.trim()) {
        projectIds.push(null);
        continue;
      }
      const doc = await Project.create({
        name: p.name.trim().slice(0, 100),
        description: p.description ?? '',
        color: p.color ?? '#0066cc',
        icon: p.icon,
        owner: user.id,
        members: [email],
        memberRoles: { [email]: 'editor' as MemberRole },
      });
      projectIds.push(doc._id);
    }

    // 2. Tableros
    const boardIds: (Types.ObjectId | null)[] = [];
    for (const b of backup.boards ?? []) {
      if (b.isOwner === false || !b.name?.trim()) {
        boardIds.push(null);
        continue;
      }
      const doc = await Board.create({
        name: b.name.trim().slice(0, 100),
        description: b.description ?? '',
        color: b.color ?? '#0066cc',
        icon: b.icon,
        columns: b.columns?.length ? b.columns : undefined,
        tags: (b.tags ?? []).slice(0, 50),
        projectId:
          b.projectIndex != null && b.projectIndex >= 0
            ? projectIds[b.projectIndex]
            : null,
        owner: user.id,
        members: [email],
        memberRoles: { [email]: 'editor' as MemberRole },
        order: 0,
      });
      boardIds.push(doc._id);
    }

    // 3. Tareas
    let taskCount = 0;
    const taskDocs = (backup.tasks ?? []).slice(0, 2000).flatMap((t) => {
      const idx = t.boardIndex ?? -1;
      const target = idx >= 0 ? boardIds[idx] : null;
      if (!target || !t.title?.trim()) return [];
      taskCount++;
      return [{
        title: t.title.trim().slice(0, 200),
        description: t.description ?? '',
        boardId: target,
        status: t.status ?? 'todo',
        priority: VALID_PRIORITIES.has(t.priority ?? '')
          ? (t.priority as TaskPriority)
          : undefined,
        tags: (t.tags ?? []).slice(0, 10),
        checklist: (t.checklist ?? []).slice(0, 50),
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        deliveryDate: t.deliveryDate ? new Date(t.deliveryDate) : null,
        recurrence: VALID_RECURRENCE.has(t.recurrence ?? '')
          ? (t.recurrence as TaskRecurrence)
          : null,
        createdBy: user.id,
        assignedTo: [],
      }];
    });
    if (taskDocs.length > 0) await Task.insertMany(taskDocs);

    // 4. Notas
    let noteCount = 0;
    for (const n of backup.notes ?? []) {
      if (n.isOwner === false || !n.title?.trim()) continue;
      await Note.create({
        title: n.title.trim().slice(0, 200),
        content: n.content ?? '',
        visibility: n.visibility === 'shared' ? 'shared' : 'private',
        owner: user.id,
        members: [email],
        projectId:
          n.projectIndex != null && n.projectIndex >= 0
            ? projectIds[n.projectIndex]
            : null,
      });
      noteCount++;
    }

    return {
      success: true,
      data: {
        projects: projectIds.filter(Boolean).length,
        boards: boardIds.filter(Boolean).length,
        tasks: taskCount,
        notes: noteCount,
      },
    };
  } catch (error) {
    console.error('Error al restaurar backup:', error);
    return { success: false, error: 'Error al restaurar el backup' };
  }
}
