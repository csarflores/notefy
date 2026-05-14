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
      <div className="flex items-center justify-between">
        <Button
          onClick={() => setIsModalOpen(true)}
          size="lg"
          className="shadow-lg hover:shadow-xl"
        >
          <Plus size={20} className="mr-2" />
          Nuevo Proyecto
        </Button>

        <div className="flex items-center gap-4">
          {/* Usuario */}
          <div className="flex items-center gap-2 text-sm text-[#7a7a7a]">
            <User size={16} />
            <span>{userName}</span>
          </div>

          {/* Botón cerrar sesión */}
          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="md"
            className="text-[#7a7a7a] hover:text-[#1d1d1f]"
          >
            <LogOut size={18} className="mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
      />
    </>
  );
}
