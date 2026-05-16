import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getNoteById } from '@/actions/note-actions';
import { NoteEditorClient } from './NoteEditorClient';

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  const noteResult = await getNoteById(id, session.user.id);

  if (!noteResult.success || !noteResult.data) {
    redirect('/dashboard');
  }

  const note = noteResult.data;

  return (
    <div className="min-h-screen bg-[#f5f5f7] overflow-x-hidden w-full">
      <NoteEditorClient note={note} userId={session.user.id} />
    </div>
  );
}
