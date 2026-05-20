'use client';

import { useRouter } from 'next/navigation';
import ProjectCard from '@/components/dashboard/ProjectCard';
import BoardCard from '@/components/dashboard/BoardCard';
import NoteCard from '@/components/notes/NoteCard';
import ViewEditNoteModal from '@/components/notes/ViewEditNoteModal';
import { IProject, IBoard, INote } from '@/types';
import { updateBoard, reorderBoards } from '@/actions/board-actions';
import { useState } from 'react';
import { useNotification } from '@/components/ui/NotificationContext';

interface DashboardWithDragDropProps {
  projects: Array<{ item: IProject; childCount: number }>;
  unassignedBoards: Array<{ item: IBoard }>;
  notes: Array<{ note: INote; ownerEmail: string; ownerName: string }>;
  userId: string;
}

export default function DashboardWithDragDrop({
  projects,
  unassignedBoards,
  notes,
  userId
}: DashboardWithDragDropProps) {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedNote, setSelectedNote] = useState<INote | null>(null);
  const [selectedOwnerEmail, setSelectedOwnerEmail] = useState<string>('');
  const [selectedOwnerName, setSelectedOwnerName] = useState<string>('');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [draggedBoard, setDraggedBoard] = useState<{ id: string; index: number; projectId?: string | null } | null>(null);

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
        showNotification(result.error || 'Error al mover el tablero', 'error');
      }
    } catch (error) {
      console.error('Error al mover tablero:', error);
      showNotification('Error al mover el tablero', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBoardDragStart = (boardId: string, index: number, projectId?: string | null) => {
    setDraggedBoard({ id: boardId, index, projectId });
  };

  const handleBoardDragEnd = () => {
    setDraggedBoard(null);
  };

  const handleBoardDropWrapper = (draggedBoardId: string, targetIndex: number) => {
    handleBoardReorder(draggedBoardId, targetIndex, null);
  };

  const handleBoardReorder = async (draggedBoardId: string, targetIndex: number, projectId?: string | null) => {
    
    if (isUpdating) {
      return;
    }

    setIsUpdating(true);
    try {
      // Obtener los tableros actuales
      const currentBoards = projectId 
        ? unassignedBoards.filter(b => b.item.projectId?.toString() === projectId)
        : unassignedBoards;

      // Encontrar el tablero arrastrado
      const draggedBoard = currentBoards.find(b => b.item._id.toString() === draggedBoardId);
      if (!draggedBoard) {
        console.error('Dragged board not found');
        return;
      }

      // Crear nuevo orden
      const newOrder = [...currentBoards];
      const draggedIndex = newOrder.findIndex(b => b.item._id.toString() === draggedBoardId);
      
      // Mover el tablero a la nueva posición
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedBoard);

      // Preparar actualización de orden
      const boardOrders = newOrder.map((board, index) => ({
        boardId: board.item._id.toString(),
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

  const handleNoteClick = (note: INote, ownerEmail: string, ownerName: string) => {
    setSelectedNote(note);
    setSelectedOwnerEmail(ownerEmail);
    setSelectedOwnerName(ownerName);
    setIsNoteModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Proyectos */}
      {projects.length > 0 && (
        <div>
          <h2 className="text-[14px] font-semibold text-[#1d1d1f] mb-2 tracking-[-0.24px]">
            Proyectos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
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
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-[14px] font-semibold text-[#1d1d1f] tracking-[-0.24px]">
              Tableros
            </h2>
            <span className="text-[10px] text-[#7a7a7a] bg-[#f5f5f7] px-2 py-0.5 rounded-full">
              Arrastra tableros a un proyecto para organizarlos
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
            {unassignedBoards.map(({ item }, index) => (
              <BoardCard 
                key={item._id.toString()} 
                board={item} 
                index={index}
                onDragStart={handleBoardDragStart}
                onDragEnd={handleBoardDragEnd}
                onDrop={handleBoardDropWrapper}
                isDragOver={draggedBoard?.projectId === null || false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Notas */}
      {notes.length > 0 && (
        <div>
          <h2 className="text-[14px] font-semibold text-[#1d1d1f] mb-2 tracking-[-0.24px]">
            Notas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
            {notes.map(({ note, ownerEmail, ownerName }) => (
              <NoteCard
                key={note._id.toString()}
                note={note}
                onOpenNote={() => handleNoteClick(note, ownerEmail, ownerName)}
                isOwner={true}
                userId={userId}
                onDelete={() => router.refresh()}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal de notas */}
      {selectedNote && (
        <ViewEditNoteModal
          isOpen={isNoteModalOpen}
          onClose={() => {
            setIsNoteModalOpen(false);
            setSelectedNote(null);
          }}
          note={selectedNote}
          userId={userId}
          ownerEmail={selectedOwnerEmail}
          ownerName={selectedOwnerName}
        />
      )}
    </div>
  );
}
