import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import TabSyncer from '@/components/tabs/TabSyncer';
import { getBoardById } from '@/actions/board-actions';
import { getBoardTasks } from '@/actions/task-actions';
import { getBoardUsers } from '@/actions/board-actions';
import { getProjectById } from '@/actions/project-actions';
import BoardClient from './BoardClient';

interface BoardPageProps {
  params: Promise<{ id: string }>;
}

async function BoardContent({ boardId }: { boardId: string }) {
  const [boardResult, tasksResult, usersResult] = await Promise.all([
    getBoardById(boardId),
    getBoardTasks(boardId),
    getBoardUsers(boardId),
  ]);

  if (!boardResult.success || !boardResult.data) {
    notFound();
  }

  const board = boardResult.data;
  const tasks = tasksResult.success && tasksResult.data ? tasksResult.data : [];
  const users = usersResult.success && usersResult.data ? usersResult.data : [];

  // Nombre del proyecto padre para el breadcrumb
  let projectName: string | undefined;
  if (board.projectId) {
    const projectResult = await getProjectById(board.projectId.toString());
    if (projectResult.success && projectResult.data) {
      projectName = projectResult.data.name;
    }
  }

  return (
    <>
      <TabSyncer
        id={`board-${boardId}`}
        type="board"
        title={board.name}
        url={`/board/${boardId}`}
        resourceId={boardId}
      />
      <BoardClient
        board={board}
        tasks={tasks}
        boardUsers={users}
        boardTags={board.tags || []}
        projectName={projectName}
      />
    </>
  );
}

function BoardLoading() {
  return (
    <div className="w-full min-h-full overflow-x-hidden">
      {/* Header skeleton */}
      <div className="bg-white border-b border-gray-100 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
              <div>
                <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse mb-2" />
                <div className="h-4 w-96 bg-gray-200 rounded-lg animate-pulse" />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-40 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-10 w-32 bg-gray-200 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Board skeleton */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-6 w-32 bg-gray-200 rounded-lg animate-pulse mb-4" />
              <div className="space-y-3">
                {[1, 2].map((j) => (
                  <div
                    key={j}
                    className="bg-white rounded-xl p-4 shadow-sm animate-pulse"
                  >
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  return (
    <div className="w-full min-h-full overflow-x-hidden">
      <Suspense fallback={<BoardLoading />}>
        <BoardContent boardId={id} />
      </Suspense>
    </div>
  );
}
