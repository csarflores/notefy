import { IBoardColumn } from '@/types';

// Columnas por defecto cuando el tablero no tiene columnas personalizadas
export const DEFAULT_COLUMNS: IBoardColumn[] = [
  { id: 'todo', title: 'Pendiente', color: '#ff9500' },
  { id: 'in-progress', title: 'En Proceso', color: '#0066cc' },
  { id: 'done', title: 'Finalizado', color: '#34c759' },
];

export function getBoardColumns(columns?: IBoardColumn[] | null): IBoardColumn[] {
  return columns && columns.length > 0 ? columns : DEFAULT_COLUMNS;
}

// Una tarea cuenta como "completada" si está en la última columna del tablero
export function getDoneColumnId(columns?: IBoardColumn[] | null): string {
  const cols = getBoardColumns(columns);
  return cols[cols.length - 1].id;
}

// true si la tarea está en la última columna de su tablero.
// Usa board.columns si boardId viene poblado; si no, asume las columnas por defecto.
export function isTaskDone(task: { status: string; boardId?: unknown }): boolean {
  const board = task.boardId as { columns?: IBoardColumn[] } | null | undefined;
  const cols = board?.columns && board.columns.length > 0 ? board.columns : DEFAULT_COLUMNS;
  return task.status === cols[cols.length - 1].id;
}
