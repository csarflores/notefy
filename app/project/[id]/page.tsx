import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getProjectById } from '@/actions/project-actions';
import { getProjectTasks } from '@/actions/task-actions';
import { getProjectUsers } from '@/actions/project-actions';
import ProjectClient from './ProjectClient';
import ProjectWithFilters from './ProjectWithFilters';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

async function ProjectContent({ projectId }: { projectId: string }) {
  const [projectResult, tasksResult, usersResult] = await Promise.all([
    getProjectById(projectId),
    getProjectTasks(projectId),
    getProjectUsers(projectId),
  ]);

  if (!projectResult.success || !projectResult.data) {
    notFound();
  }

  const project = projectResult.data;
  const tasks = tasksResult.success && tasksResult.data ? tasksResult.data : [];
  const users = usersResult.success && usersResult.data ? usersResult.data : [];

  console.log('📦 Project data:', project);
  console.log('🏷️ Project tags from server:', project.tags);

  return (
    <>
      <ProjectClient project={project} />

      <ProjectWithFilters 
        tasks={tasks} 
        projectId={projectId} 
        projectUsers={users}
        projectTags={project.tags || []}
      />
    </>
  );
}

function ProjectLoading() {
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

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[#f5f5f7] overflow-x-hidden w-full">
      <Suspense fallback={<ProjectLoading />}>
        <ProjectContent projectId={id} />
      </Suspense>
    </div>
  );
}
