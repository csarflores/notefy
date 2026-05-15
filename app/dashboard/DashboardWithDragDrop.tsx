'use client';

import { useRouter } from 'next/navigation';
import ProjectCard from '@/components/dashboard/ProjectCard';
import BoardCard from '@/components/dashboard/BoardCard';
import { IProject, IBoard } from '@/types';
import { updateBoard } from '@/actions/board-actions';
import { useState } from 'react';

interface DashboardWithDragDropProps {
  projects: Array<{ item: IProject; childCount: number }>;
  unassignedBoards: Array<{ item: IBoard }>;
}

export default function DashboardWithDragDrop({ 
  projects, 
  unassignedBoards 
}: DashboardWithDragDropProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleBoardDrop = async (boardId: string, projectId: string) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      const result = await updateBoard(boardId, {
        projectId: projectId,
      });

      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || 'Error al mover el tablero');
      }
    } catch (error) {
      console.error('Error al mover tablero:', error);
      alert('Error al mover el tablero');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Proyectos */}
      {projects.length > 0 && (
        <div>
          <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-3 tracking-[-0.24px]">
            Proyectos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-4">
            {projects.map(({ item, childCount }) => (
              <ProjectCard 
                key={item._id.toString()} 
                project={item} 
                boardCount={childCount}
                onBoardDrop={handleBoardDrop}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tableros sin proyecto */}
      {unassignedBoards.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-[15px] font-semibold text-[#1d1d1f] tracking-[-0.24px]">
              Tableros
            </h2>
            <span className="text-[11px] text-[#7a7a7a] bg-[#f5f5f7] px-2 py-0.5 rounded-full">
              Arrastra tableros a un proyecto para organizarlos
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-4">
            {unassignedBoards.map(({ item }) => (
              <BoardCard key={item._id.toString()} board={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
