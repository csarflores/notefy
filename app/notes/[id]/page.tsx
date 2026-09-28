import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getNoteById } from '@/actions/note-actions';
import { NoteEditorClient } from './NoteEditorClient';
import TabSyncer from '@/components/tabs/TabSyncer';
import { MemberRole } from '@/types';

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

  // Rol del usuario sobre la nota (memberRoles llega serializado como objeto plano)
  const memberRoles = (note.memberRoles ?? {}) as unknown as Record<string, MemberRole>;
  const email = session.user.email?.toLowerCase() ?? '';
  const userRole: MemberRole | 'owner' =
    note.owner.toString() === session.user.id
      ? 'owner'
      : note.members?.includes(email)
        ? (memberRoles[email] ?? 'editor')
        : 'viewer';

  return (
    <div className="w-full min-h-full overflow-x-hidden">
      <TabSyncer
        id={`note-${note._id}`}
        type="note"
        title={note.title}
        url={`/notes/${note._id}`}
        resourceId={note._id.toString()}
      />
      <NoteEditorClient note={note} userId={session.user.id} userRole={userRole} />
    </div>
  );
}
