import { Suspense } from 'react';
import { Plus } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserProjects } from '@/actions/project-actions';
import ProjectCard from '@/components/dashboard/ProjectCard';
import DashboardClient from './DashboardClient';

async function ProjectsList({ userId }: { userId: string }) {
  const result = await getUserProjects(userId);

  if (!result.success || !result.data) {
    return (
      <div className="text-center py-12">
        <p className="text-[#7a7a7a]">Error al cargar los proyectos</p>
      </div>
    );
  }

  const projects = result.data;

  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#f5f5f7] flex items-center justify-center">
            <Plus size={32} className="text-[#7a7a7a]" />
          </div>
          <h3 className="text-xl font-semibold text-[#1d1d1f] mb-2">
            No tienes proyectos aún
          </h3>
          <p className="text-[#7a7a7a]">
            Crea tu primer proyecto para comenzar a organizar tus tareas
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <ProjectCard key={project._id.toString()} project={project} />
      ))}
    </div>
  );
}

function ProjectsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="bg-white rounded-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 animate-pulse"
        >
          <div className="space-y-4">
            <div>
              <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded-lg w-full" />
              <div className="h-4 bg-gray-200 rounded-lg w-2/3 mt-1" />
            </div>
            <div className="flex gap-4">
              <div className="h-4 bg-gray-200 rounded-lg w-20" />
              <div className="h-4 bg-gray-200 rounded-lg w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-[#1d1d1f] mb-3 tracking-tight">
            Mis Proyectos
          </h1>
          <p className="text-lg text-[#7a7a7a]">
            Gestiona y organiza todos tus proyectos en un solo lugar
          </p>
        </div>

        {/* Botón de crear proyecto */}
        <DashboardClient userId={session.user.id} userName={session.user.name} />

        {/* Lista de proyectos */}
        <div className="mt-8">
          <Suspense fallback={<ProjectsLoading />}>
            <ProjectsList userId={session.user.id} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
