import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getProjectById } from '@/actions/project-actions';
import { getProjectTasks } from '@/actions/task-actions';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import ProjectClient from './ProjectClient';
import { Inbox } from 'lucide-react';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

async function ProjectContent({ projectId }: { projectId: string }) {
  const [projectResult, tasksResult] = await Promise.all([
    getProjectById(projectId),
    getProjectTasks(projectId),
  ]);

  if (!projectResult.success || !projectResult.data) {
    notFound();
  }

  const project = projectResult.data;
  const tasks = tasksResult.success && tasksResult.data ? tasksResult.data : [];

  return (
    <>
      <ProjectClient project={project} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {tasks.length === 0 ? (
          // Estado vacío
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 rounded-full bg-[#f5f5f7] flex items-center justify-center mb-6">
              <Inbox size={40} className="text-[#7a7a7a]" />
            </div>
            <h3 className="text-2xl font-semibold text-[#1d1d1f] mb-2">
              No hay tareas aún
            </h3>
            <p className="text-[#7a7a7a] text-center max-w-md mb-6">
              Comienza creando tu primera tarea para organizar el trabajo de este proyecto
            </p>
            <p className="text-sm text-[#7a7a7a]">
              Haz clic en <span className="font-semibold text-[#0066cc]">Nueva Tarea</span> para empezar
            </p>
          </div>
        ) : (
          // Tablero Kanban
          <KanbanBoard initialTasks={tasks} projectId={projectId} />
        )}
      </div>
    </>
  );
}

function ProjectLoading() {
  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header skeleton */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-6">
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
      <div className="max-w-7xl mx-auto px-6 py-8">
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

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <Suspense fallback={<ProjectLoading />}>
        <ProjectContent projectId={id} />
      </Suspense>
    </div>
  );
}
