import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getBoardById } from '@/actions/board-actions';
import { getBoardTasks } from '@/actions/task-actions';
import { getBoardUsers } from '@/actions/board-actions';
import { getProjectById } from '@/actions/project-actions';
import BoardClient from './BoardClient';
import BoardWithFilters from './BoardWithFilters';
import { isValidObjectId } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import Board from '@/models/Board';
import Task from '@/models/Task';

interface BoardPageProps {
  params: Promise<{ id: string }>;
}

async function BoardContent({ boardId }: { boardId: string }) {
  // Try to get the board first
  let boardResult = await getBoardById(boardId);

  // If board doesn't exist, try to convert from project
  if (!boardResult.success || !boardResult.data) {
    const projectResult = await getProjectById(boardId);

    if (projectResult.success && projectResult.data) {
      // Convert project to board directly
      try {
        if (isValidObjectId(boardId)) {
          await connectDB();

          const project = projectResult.data;

          // Check if board already exists
          const existingBoard = await Board.findById(boardId);
          if (!existingBoard) {
            // Create a new Board with the Project data
            const board = new Board({
              _id: project._id,
              name: project.name,
              description: project.description || '',
              owner: project.owner,
              members: project.members || [],
              tags: [],
              projectId: null,
            });

            await board.save();

            // Migrate tasks associated with this project
            const tasks = await Task.find({ projectId: project._id });
            if (tasks.length > 0) {
              await Task.updateMany(
                { projectId: project._id },
                { boardId: project._id }
              );
            }

            console.log(`✅ Converted project "${project.name}" to board with ${tasks.length} tasks`);
          }

          // Try to get the board again
          boardResult = await getBoardById(boardId);
        }
      } catch (error) {
        console.error('Error converting project to board:', error);
      }
    }
  }

  const [tasksResult, usersResult] = await Promise.all([
    getBoardTasks(boardId),
    getBoardUsers(boardId),
  ]);

  if (!boardResult.success || !boardResult.data) {
    notFound();
  }

  const board = boardResult.data;
  const tasks = tasksResult.success && tasksResult.data ? tasksResult.data : [];
  const users = usersResult.success && usersResult.data ? usersResult.data : [];

  return (
    <>
      <BoardClient board={board} />

      <BoardWithFilters
        tasks={tasks}
        boardId={boardId}
        boardUsers={users}
        boardTags={board.tags || []}
      />
    </>
  );
}

function BoardLoading() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] overflow-x-hidden">
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

  return (
    <div className="min-h-screen bg-[#f5f5f7] overflow-x-hidden w-full">
      <Suspense fallback={<BoardLoading />}>
        <BoardContent boardId={id} />
      </Suspense>
    </div>
  );
}
