'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LogOut, User, Folder, FileText, Calendar } from 'lucide-react';
import { signOut } from 'next-auth/react';
import Button from '@/components/ui/Button';
import CreateProjectModal from '@/components/dashboard/CreateProjectModal';
import CreateBoardModal from '@/components/dashboard/CreateBoardModal';
import CreateProjectGroupModal from '@/components/dashboard/CreateProjectGroupModal';
import CreateNoteModal from '@/components/notes/CreateNoteModal';

interface DashboardClientProps {
  userId: string;
  userName: string;
  userEmail?: string;
}

export default function DashboardClient({ userId, userName, userEmail }: DashboardClientProps) {
  const router = useRouter();
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/login' });
  };

  return (
    <>
      {/* Mobile-first header */}
      <div className="flex flex-col max-w-full sm:flex-row sm:items-center sm:justify-between gap-2">
        {/* Botones de creación - Visible solo en desktop */}
        <div className="hidden sm:flex gap-2">
          <Button
            onClick={() => router.push('/calendar')}
            size="sm"
            variant="secondary"
          >
            <Calendar size={15} className="mr-1.5" />
            Calendario
          </Button>
          <Button
            onClick={() => setIsProjectModalOpen(true)}
            size="sm"
            variant="secondary"
          >
            <Folder size={15} className="mr-1.5" />
            Nuevo Proyecto
          </Button>
          <Button
            onClick={() => setIsBoardModalOpen(true)}
            size="sm"
          >
            <Plus size={15} className="mr-1.5" />
            Nuevo Tablero
          </Button>
          <Button
            onClick={() => setIsNoteModalOpen(true)}
            size="sm"
            variant="secondary"
          >
            <FileText size={15} className="mr-1.5" />
            Nueva Nota
          </Button>
        </div>

        {/* Usuario y acciones - Stack en mobile, row en desktop */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Usuario */}
          <div className="flex items-center gap-1.5 text-[12px] text-[#7a7a7a] tracking-[-0.12px]">
            <User size={14} className="shrink-0" />
            <span className="truncate max-w-[140px] sm:max-w-none">{userName}</span>
          </div>

          {/* Botón cerrar sesión */}
          <Button
            onClick={handleSignOut}
            variant="secondary"
            size="sm"
            className="text-[#7a7a7a] hover:text-[#1d1d1f]"
          >
            <LogOut size={14} className="sm:mr-1.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </Button>
        </div>

        {/* Botones - Visible solo en mobile, full width */}
        <div className="sm:hidden flex flex-col gap-2 w-full">
          <Button
            onClick={() => router.push('/calendar')}
            size="sm"
            variant="secondary"
            className="w-full"
          >
            <Calendar size={15} className="mr-1.5" />
            Calendario
          </Button>
          <Button
            onClick={() => setIsProjectModalOpen(true)}
            size="sm"
            variant="secondary"
            className="w-full"
          >
            <Folder size={15} className="mr-1.5" />
            Nuevo Proyecto
          </Button>
          <Button
            onClick={() => setIsBoardModalOpen(true)}
            size="sm"
            className="w-full"
          >
            <Plus size={15} className="mr-1.5" />
            Nuevo Tablero
          </Button>
          <Button
            onClick={() => setIsNoteModalOpen(true)}
            size="sm"
            variant="secondary"
            className="w-full"
          >
            <FileText size={15} className="mr-1.5" />
            Nueva Nota
          </Button>
        </div>
      </div>

      <CreateBoardModal
        isOpen={isBoardModalOpen}
        onClose={() => setIsBoardModalOpen(false)}
        userId={userId}
      />

      <CreateProjectGroupModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        userId={userId}
      />

      <CreateNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        userId={userId}
        ownerEmail={userEmail}
        ownerName={userName}
      />
    </>
  );
}
