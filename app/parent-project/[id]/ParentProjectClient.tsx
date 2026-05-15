'use client';

import { useState } from 'react';
import { Plus, UserPlus } from 'lucide-react';
import Button from '@/components/ui/Button';
import CreateBoardModal from '@/components/dashboard/CreateBoardModal';
import InviteMemberModal from '@/components/project/InviteMemberModal';
import { IProject } from '@/types';

interface ParentProjectClientProps {
  userId: string;
  parentId: string;
  project?: IProject;
  mode?: 'board' | 'share';
}

export default function ParentProjectClient({ 
  userId, 
  parentId, 
  project,
  mode = 'board' 
}: ParentProjectClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (mode === 'share' && project) {
    return (
      <>
        <Button
          onClick={() => setIsModalOpen(true)}
          size="sm"
          variant="ghost"
        >
          <UserPlus size={15} className="mr-1.5" />
          Invitar
        </Button>

        <InviteMemberModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          project={project}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex justify-start">
        <Button
          onClick={() => setIsModalOpen(true)}
          size="sm"
        >
          <Plus size={15} className="mr-1.5" />
          Nuevo Tablero
        </Button>
      </div>

      <CreateBoardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
        projectId={parentId}
      />
    </>
  );
}
