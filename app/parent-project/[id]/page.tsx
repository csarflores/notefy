import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getProjectById } from '@/actions/project-actions';
import { getProjectBoards } from '@/actions/board-actions';
import BoardCard from '@/components/dashboard/BoardCard';
import { ArrowLeft, FolderOpen, Plus } from 'lucide-react';
import Link from 'next/link';
import ParentProjectClient from './ParentProjectClient';

async function BoardsList({ parentId, userId }: { parentId: string; userId: string }) {
  const result = await getProjectBoards(parentId, userId);

  if (!result.success || !result.data) {
    return (
      <div className="text-center py-12">
        <p className="text-[#7a7a7a]">Error al cargar los tableros</p>
      </div>
    );
  }

  const boards = result.data;

  if (boards.length === 0) {
    return (
      <div className="text-center py-12 sm:py-16">
        <div className="max-w-md mx-auto px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-[#f5f5f7] flex items-center justify-center">
            <FolderOpen size={24} className="sm:hidden text-[#7a7a7a]" />
            <FolderOpen size={32} className="hidden sm:block text-[#7a7a7a]" />
          </div>
          <h3 className="text-[17px] sm:text-[21px] font-semibold text-[#1d1d1f] mb-2 tracking-[-0.374px]">
            No hay tableros aún
          </h3>
          <p className="text-[14px] sm:text-[17px] text-[#7a7a7a] tracking-[-0.224px]">
            Crea tableros para organizar las tareas de este proyecto
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-4">
      {boards.map((board) => (
        <BoardCard key={board._id.toString()} board={board} />
      ))}
    </div>
  );
}

function BoardsLoading() {
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

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  const projectResult = await getProjectById(id);

  if (!projectResult.success || !projectResult.data) {
    notFound();
  }

  const project = projectResult.data;

  return (
    <div className="min-h-screen bg-[#f5f5f7] overflow-x-hidden w-full">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 lg:py-6">
        {/* Navegación de regreso */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-[13px] text-[#0066cc] hover:text-[#0071e3] mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Volver al Dashboard
        </Link>

        {/* Header */}
        <div className="mb-4 sm:mb-5">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen size={24} className="text-[#0066cc]" />
            <h1 className="text-[20px] sm:text-[28px] lg:text-[34px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">
              {project.name}
            </h1>
          </div>
          {project.description && (
            <p className="text-[13px] sm:text-[15px] text-[#7a7a7a] tracking-[-0.12px] mb-3">
              {project.description}
            </p>
          )}
          <p className="text-[12px] sm:text-[13px] text-[#7a7a7a] tracking-[-0.12px]">
            Tableros de este proyecto
          </p>
        </div>

        {/* Botón de crear tablero */}
        <ParentProjectClient userId={session.user.id} parentId={id} />

        {/* Lista de tableros */}
        <div className="mt-4 sm:mt-5">
          <Suspense fallback={<BoardsLoading />}>
            <BoardsList parentId={id} userId={session.user.id} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
