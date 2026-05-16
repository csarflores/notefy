'use client';

import { useState } from 'react';
import { Plus, UserPlus, FileText } from 'lucide-react';
import Button from '@/components/ui/Button';
import CreateBoardModal from '@/components/dashboard/CreateBoardModal';
import InviteMemberModal from '@/components/project/InviteMemberModal';
import CreateNoteModal from '@/components/notes/CreateNoteModal';
import { IProject } from '@/types';

interface ParentProjectClientProps {
  userId: string;
  parentId: string;
  project?: IProject;
  mode?: 'board' | 'share' | 'note';
  ownerEmail?: string;
  ownerName?: string;
}

export default function ParentProjectClient({
  userId,
  parentId,
  project,
  mode = 'board',
  ownerEmail,
  ownerName
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

  if (mode === 'note') {
    return (
      <>
        <div className="flex justify-start">
          <Button
            onClick={() => setIsModalOpen(true)}
            size="sm"
            variant="secondary"
          >
            <FileText size={15} className="mr-1.5" />
            Nueva Nota
          </Button>
        </div>

        <CreateNoteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          userId={userId}
          projectId={parentId}
          ownerEmail={ownerEmail}
          ownerName={ownerName}
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
