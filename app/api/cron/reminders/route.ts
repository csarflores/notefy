import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import Board from '@/models/Board';
import { notifyUser, notifyUserByEmail } from '@/lib/notify';
import { getDoneColumnId } from '@/lib/board-columns';

// GET /api/cron/reminders — envía recordatorios in-app por tareas próximas a vencer.
// Protegido por CRON_SECRET (Authorization: Bearer <secret>). Configurar un scheduler
// externo (p.ej. Vercel Cron, GitHub Actions, cron-job.org) que llame esta ruta cada hora.
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = req.headers.get('authorization');
      if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
    }

    await connectDB();

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Tareas que vencen en las próximas 24h, sin recordatorio para este vencimiento
    const tasks = await Task.find({
      deletedAt: null,
      dueDate: { $gt: now, $lte: in24h },
      $or: [
        { reminderSentFor: null },
        { reminderSentFor: { $exists: false } },
      ],
    }).select('_id title dueDate boardId assignedTo reminderSentFor').lean();

    // Columna "completada" (última) de cada tablero involucrado
    const boardIds = [...new Set(tasks.map((t) => t.boardId.toString()))];
    const boards = await Board.find({ _id: { $in: boardIds } }).select('_id columns').lean();
    const doneMap = new Map(boards.map((b) => [b._id.toString(), getDoneColumnId(b.columns)]));

    // Excluir completadas y las que ya fueron recordadas para este dueDate concreto
    const pending = tasks.filter(
      (t) =>
        t.status !== doneMap.get(t.boardId.toString()) &&
        (!t.reminderSentFor || t.reminderSentFor.getTime() !== new Date(t.dueDate!).getTime())
    );

    let sent = 0;
    for (const task of pending) {
      const board = await Board.findById(task.boardId).select('name members').lean();
      if (!board) continue;

      const link = `/board/${task.boardId}?task=${task._id}`;
      const message = `La tarea "${task.title}" de "${board.name}" vence en menos de 24h`;

      const notified = new Set<string>();
      for (const assigneeId of task.assignedTo ?? []) {
        const uid = assigneeId.toString();
        if (notified.has(uid)) continue;
        notified.add(uid);
        await notifyUser(uid, 'reminder', message, link);
      }
      // Si no hay asignados, recordar a los miembros del tablero (por email)
      if ((task.assignedTo ?? []).length === 0) {
        for (const email of board.members ?? []) {
          await notifyUserByEmail(email, 'reminder', message, link);
        }
      }

      await Task.updateOne(
        { _id: task._id },
        { $set: { reminderSentFor: new Date(task.dueDate!) } }
      );
      sent++;
    }

    return NextResponse.json({ ok: true, reminded: sent });
  } catch (error) {
    console.error('Error en cron de recordatorios:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
