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
      <div className="text-center py-12 sm:py-16">
        <div className="max-w-md mx-auto px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-[#f5f5f7] flex items-center justify-center">
            <Plus size={24} className="sm:hidden text-[#7a7a7a]" />
            <Plus size={32} className="hidden sm:block text-[#7a7a7a]" />
          </div>
          <h3 className="text-[17px] sm:text-[21px] font-semibold text-[#1d1d1f] mb-2 tracking-[-0.374px]">
            No tienes proyectos aún
          </h3>
          <p className="text-[14px] sm:text-[17px] text-[#7a7a7a] tracking-[-0.224px]">
            Crea tu primer proyecto para comenzar a organizar tus tareas
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-4">
      {projects.map((project) => (
        <ProjectCard key={project._id.toString()} project={project} />
      ))}
    </div>
  );
}

function ProjectsLoading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-[#e0e0e0] p-4 sm:p-5 animate-pulse"
        >
          <div className="space-y-3">
            <div>
              <div className="h-5 bg-[#f5f5f7] rounded-lg w-3/4 mb-2" />
              <div className="h-3 bg-[#f5f5f7] rounded-lg w-full" />
              <div className="h-3 bg-[#f5f5f7] rounded-lg w-2/3 mt-1" />
            </div>
            <div className="flex gap-3">
              <div className="h-3 bg-[#f5f5f7] rounded-lg w-16" />
              <div className="h-3 bg-[#f5f5f7] rounded-lg w-20" />
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
    <div className="min-h-screen bg-[#f5f5f7] overflow-x-hidden w-full">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 lg:py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-5">
          <h1 className="text-[20px] sm:text-[28px] lg:text-[34px] font-semibold text-[#1d1d1f] mb-1 tracking-tight leading-tight">
            Mis Proyectos
          </h1>
          <p className="text-[12px] sm:text-[13px] text-[#7a7a7a] tracking-[-0.12px]">
            Gestiona y organiza todos tus proyectos
          </p>
        </div>

        {/* Botón de crear proyecto */}
        <DashboardClient userId={session.user.id} userName={session.user.name} />

        {/* Lista de proyectos */}
        <div className="mt-4 sm:mt-5">
          <Suspense fallback={<ProjectsLoading />}>
            <ProjectsList userId={session.user.id} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
