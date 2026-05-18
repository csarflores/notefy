'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/components/ui/NotificationContext';
import { reorderBoards } from '@/actions/board-actions';
import BoardCard from '@/components/dashboard/BoardCard';

interface BoardsListClientProps {
  projectId: string;
  userId: string;
  boards: any[];
}

export default function BoardsListClient({ projectId, userId, boards }: BoardsListClientProps) {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [isUpdating, setIsUpdating] = useState(false);
  const [draggedBoard, setDraggedBoard] = useState<{ id: string; index: number } | null>(null);

  const handleBoardDragStart = (boardId: string, index: number, boardProjectId?: string | null) => {
    setDraggedBoard({ id: boardId, index });
  };

  const handleBoardDragEnd = () => {
    setDraggedBoard(null);
  };

  const handleBoardReorder = async (draggedBoardId: string, targetIndex: number) => {
    
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      // Crear nuevo orden
      const newOrder = [...boards];
      const draggedIndex = newOrder.findIndex(b => b._id.toString() === draggedBoardId);
      
      // Mover el tablero a la nueva posición
      const draggedBoard = newOrder[draggedIndex];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedBoard);

      // Preparar actualización de orden
      const boardOrders = newOrder.map((board, index) => ({
        boardId: board._id.toString(),
        order: index,
        projectId
      }));

      const result = await reorderBoards(userId, boardOrders);
      
      if (result.success) {
        router.refresh();
      } else {
        console.error('Reorder failed:', result.error);
        showNotification(result.error || 'Error al reordenar los tableros', 'error');
      }
    } catch (error) {
      console.error('Error al reordenar tableros:', error);
      showNotification('Error al reordenar los tableros', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-4">
      {boards.map((board, index) => (
        <BoardCard 
          key={board._id.toString()} 
          board={board} 
          index={index}
          onDragStart={handleBoardDragStart}
          onDragEnd={handleBoardDragEnd}
          onDrop={handleBoardReorder}
          isDragOver={draggedBoard?.id === board._id.toString()}
        />
      ))}
    </div>
  );
}
