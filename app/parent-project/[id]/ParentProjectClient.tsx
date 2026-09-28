'use client';

import { useState } from 'react';
import { Plus, Share2, FileText } from 'lucide-react';
import Button from '@/components/ui/Button';
import CreateBoardModal from '@/components/dashboard/CreateBoardModal';
import ShareDialog from '@/components/share/ShareDialog';
import CreateNoteModal from '@/components/notes/CreateNoteModal';
import { IProject } from '@/types';

interface ParentProjectClientProps {
  userId: string;
  parentId: string;
  project?: IProject;
  mode?: 'board' | 'share' | 'note';
  ownerEmail?: string;
  ownerName?: string;
  canEdit?: boolean;
}

export default function ParentProjectClient({
  userId,
  parentId,
  project,
  mode = 'board',
  ownerEmail,
  ownerName,
  canEdit = true
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
          <Share2 size={15} className="mr-1.5" />
          Compartir
        </Button>

        <ShareDialog
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          resourceType="project"
          resourceId={parentId}
          resourceName={project.name}
          ownerId={project.owner.toString()}
        />
      </>
    );
  }

  if (mode === 'note') {
    if (!canEdit) return null;
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

  if (!canEdit) return null;

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
