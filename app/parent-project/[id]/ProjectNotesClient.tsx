'use client';

import { useState } from 'react';
import NoteCard from '@/components/notes/NoteCard';
import ViewEditNoteModal from '@/components/notes/ViewEditNoteModal';
import { INote } from '@/types';

interface ProjectNotesClientProps {
  notes: Array<{ note: INote; ownerEmail: string; ownerName: string }>;
  userId: string;
}

export default function ProjectNotesClient({ notes, userId }: ProjectNotesClientProps) {
  const [selectedNote, setSelectedNote] = useState<INote | null>(null);
  const [selectedOwnerEmail, setSelectedOwnerEmail] = useState<string>('');
  const [selectedOwnerName, setSelectedOwnerName] = useState<string>('');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const handleNoteClick = (note: INote, ownerEmail: string, ownerName: string) => {
    setSelectedNote(note);
    setSelectedOwnerEmail(ownerEmail);
    setSelectedOwnerName(ownerName);
    setIsNoteModalOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-4">
        {notes.map(({ note, ownerEmail, ownerName }) => (
          <NoteCard
            key={note._id.toString()}
            note={note}
            onOpenNote={() => handleNoteClick(note, ownerEmail, ownerName)}
            isOwner={true}
          />
        ))}
      </div>

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
    </>
  );
}
