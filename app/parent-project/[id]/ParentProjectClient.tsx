'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import CreateBoardModal from '@/components/dashboard/CreateBoardModal';

interface ParentProjectClientProps {
  userId: string;
  parentId: string;
}

export default function ParentProjectClient({ userId, parentId }: ParentProjectClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
