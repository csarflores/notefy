import { getPublicBoard } from '@/actions/board-actions';
import { Lock, CheckCircle2, Circle } from 'lucide-react';

export const metadata = {
  title: 'Tablero compartido - Harold',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ff9500',
  medium: '#0066cc',
  low: '#8e8e93',
};

export default async function PublicBoardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getPublicBoard(token);

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#e0e0e0] shadow-xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-5">
            <Lock size={26} className="text-[#a0a0a8]" />
          </div>
          <h1 className="text-xl font-semibold text-[#1d1d1f] mb-2">Tablero no disponible</h1>
          <p className="text-sm text-[#7a7a7a]">
            Este enlace fue revocado o el tablero ya no existe.
          </p>
        </div>
      </div>
    );
  }

  const board = result.data;
  const updatedAt = board.updatedAt
    ? new Date(board.updatedAt).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <header className="bg-white border-b border-[#e5e5e5]">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
          <span className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight">Harold</span>
          <span className="text-[11px] text-[#a0a0a8] font-medium">Vista de solo lectura</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8">
        <div className="flex items-center gap-3 mb-1">
          {board.icon ? (
            <span className="text-2xl">{board.icon}</span>
          ) : (
            <span
              className="w-8 h-8 rounded-lg shrink-0"
              style={{ backgroundColor: board.color || '#0066cc' }}
            />
          )}
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] tracking-tight">
            {board.name}
          </h1>
        </div>
        {updatedAt && (
          <p className="text-[12px] text-[#a0a0a8] mb-6 ml-11">Actualizado el {updatedAt}</p>
        )}

        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {board.columns.map((column) => {
            const tasks = board.tasks.filter((t) => t.status === column.id);
            return (
              <div
                key={column.id}
                className="w-[280px] shrink-0 bg-[#f0f0f3] rounded-2xl p-3"
              >
                <div className="flex items-center gap-2 px-1.5 mb-3">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: column.color || '#8e8e93' }}
                  />
                  <h2 className="text-[12px] font-semibold text-[#1d1d1f] uppercase tracking-wider truncate">
                    {column.title}
                  </h2>
                  <span className="ml-auto text-[11px] text-[#a0a0a8]">{tasks.length}</span>
                </div>

                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task._id}
                      className="bg-white rounded-xl p-3 shadow-sm border border-[#e8e8ea]"
                    >
                      <p className="text-[13px] font-medium text-[#1d1d1f] leading-snug">
                        {task.title}
                      </p>
                      {task.description && (
                        <div
                          className="ProseMirror text-[11.5px] text-[#7a7a7a] mt-1.5 line-clamp-3"
                          dangerouslySetInnerHTML={{ __html: task.description }}
                        />
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {task.priority && PRIORITY_LABELS[task.priority] && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                            style={{
                              color: PRIORITY_COLORS[task.priority],
                              backgroundColor: `${PRIORITY_COLORS[task.priority]}18`,
                            }}
                          >
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="text-[10px] text-[#a0a0a8]">
                            {new Date(task.dueDate).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        )}
                        {task.tags?.slice(0, 3).map((tag) => (
                          <span
                            key={tag.text}
                            className="text-[10px] px-1.5 py-0.5 rounded-md"
                            style={{
                              color: tag.color || '#7a7a7a',
                              backgroundColor: `${tag.color || '#8e8e93'}18`,
                            }}
                          >
                            {tag.text}
                          </span>
                        ))}
                      </div>
                      {task.checklist && task.checklist.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {task.checklist.slice(0, 4).map((item, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              {item.done ? (
                                <CheckCircle2 size={11} className="text-[#34c759] shrink-0" />
                              ) : (
                                <Circle size={11} className="text-[#c7c7cc] shrink-0" />
                              )}
                              <span
                                className={`text-[11px] ${
                                  item.done ? 'text-[#a0a0a8] line-through' : 'text-[#3a3a3c]'
                                }`}
                              >
                                {item.text}
                              </span>
                            </div>
                          ))}
                          {task.checklist.length > 4 && (
                            <p className="text-[10px] text-[#a0a0a8]">
                              +{task.checklist.length - 4} más
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-[11px] text-[#c7c7cc] text-center py-4">Sin tareas</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
