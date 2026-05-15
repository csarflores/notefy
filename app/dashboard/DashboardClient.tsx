'use client';

import { useState } from 'react';
import { Plus, LogOut, User } from 'lucide-react';
import { signOut } from 'next-auth/react';
import Button from '@/components/ui/Button';
import CreateProjectModal from '@/components/dashboard/CreateProjectModal';

interface DashboardClientProps {
  userId: string;
  userName: string;
}

export default function DashboardClient({ userId, userName }: DashboardClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/login' });
  };

  return (
    <>
      {/* Mobile-first header */}
      <div className="flex flex-col max-w-full sm:flex-row sm:items-center sm:justify-between gap-2">
        {/* Botón Nuevo Proyecto - Visible solo en desktop */}
        <Button
          onClick={() => setIsModalOpen(true)}
          size="sm"
          className="hidden sm:inline-flex"
        >
          <Plus size={15} className="mr-1.5" />
          Nuevo Proyecto
        </Button>

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

        {/* Botón Nuevo Proyecto - Visible solo en mobile, full width */}
        <Button
          onClick={() => setIsModalOpen(true)}
          size="sm"
          className="sm:hidden w-full"
        >
          <Plus size={15} className="mr-1.5" />
          Nuevo Proyecto
        </Button>
      </div>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
      />
    </>
  );
}
