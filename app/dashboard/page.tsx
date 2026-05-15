import { Suspense } from 'react';
import { Plus } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserProjects } from '@/actions/project-actions';
import { getUserBoards } from '@/actions/board-actions';
import DashboardClient from './DashboardClient';
import DashboardWithDragDrop from './DashboardWithDragDrop';
import { Logo } from '@/components/ui/Logotipo';

async function ProjectsAndBoardsList({ userId }: { userId: string }) {
  const [projectsResult, boardsResult] = await Promise.all([
    getUserProjects(userId),
    getUserBoards(userId)
  ]);

  if (!projectsResult.success || !boardsResult.success) {
    return (
      <div className="text-center py-12">
        <p className="text-[#7a7a7a]">Error al cargar los proyectos y tableros</p>
      </div>
    );
  }

  const allProjects = projectsResult.data || [];
  const allBoards = boardsResult.data || [];

  if (allProjects.length === 0 && allBoards.length === 0) {
    return (
      <div className="text-center py-12 sm:py-16">
        <div className="max-w-md mx-auto px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-[#f5f5f7] flex items-center justify-center">
            <Plus size={24} className="sm:hidden text-[#7a7a7a]" />
            <Plus size={32} className="hidden sm:block text-[#7a7a7a]" />
          </div>
          <h3 className="text-[17px] sm:text-[21px] font-semibold text-[#1d1d1f] mb-2 tracking-[-0.374px]">
            No tienes proyectos ni tableros aún
          </h3>
          <p className="text-[14px] sm:text-[17px] text-[#7a7a7a] tracking-[-0.224px]">
            Crea tu primer proyecto o tablero para comenzar a organizar tus tareas
          </p>
        </div>
      </div>
    );
  }

  // Contar tableros por proyecto
  const projectsWithBoardCount = allProjects.map((project) => {
    const boardCount = allBoards.filter(
      (board) => board.projectId?.toString() === project._id.toString()
    ).length;
    return { item: project, childCount: boardCount };
  });

  // Tableros sin proyecto
  const unassignedBoards = allBoards
    .filter((board) => !board.projectId)
    .map((board) => ({ item: board }));

  return (
    <DashboardWithDragDrop 
      projects={projectsWithBoardCount}
      unassignedBoards={unassignedBoards}
    />
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
        <div className="mb-6 sm:mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-2.5 bg-white rounded-xl shadow-sm border border-[#e0e0e0]/50">
                  <Logo className="h-8 w-8" />
                </div>
                <div className="h-px bg-linear-to-r from-[#e0e0e0] to-transparent flex-1 max-w-[200px]" />
              </div>
              <h1 className="text-[24px] sm:text-[32px] lg:text-[40px] font-bold text-[#1d1d1f] mb-2 tracking-tight leading-tight">
                Dashboard
              </h1>
              <p className="text-[14px] sm:text-[16px] text-[#6b7280] leading-relaxed max-w-lg">
                Gestiona tus proyectos y tableros en un solo lugar
              </p>
            </div>
          </div>
        </div>

        {/* Botón de crear proyecto */}
        <DashboardClient userId={session.user.id} userName={session.user.name} />

        {/* Lista de proyectos y tableros */}
        <div className="mt-4 sm:mt-5">
          <Suspense fallback={<ProjectsLoading />}>
            <ProjectsAndBoardsList userId={session.user.id} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
