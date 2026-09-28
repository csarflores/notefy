import { getPublicNote } from '@/actions/note-actions';
import { Lock } from 'lucide-react';

export const metadata = {
  title: 'Nota compartida - Harold',
};

export default async function PublicNotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getPublicNote(token);

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#e0e0e0] shadow-xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-5">
            <Lock size={26} className="text-[#a0a0a8]" />
          </div>
          <h1 className="text-xl font-semibold text-[#1d1d1f] mb-2">Nota no disponible</h1>
          <p className="text-sm text-[#7a7a7a]">
            Este enlace fue revocado o la nota ya no existe.
          </p>
        </div>
      </div>
    );
  }

  const note = result.data;
  const updatedAt = note.updatedAt
    ? new Date(note.updatedAt).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <header className="bg-white border-b border-[#e5e5e5]">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <span className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight">Harold</span>
          <span className="text-[11px] text-[#a0a0a8] font-medium">Vista de solo lectura</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-8">
        <div className="bg-white rounded-2xl border border-[#e5e5e5] shadow-sm p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] tracking-tight mb-1">
            {note.title}
          </h1>
          {updatedAt && (
            <p className="text-[12px] text-[#a0a0a8] mb-6">Actualizada el {updatedAt}</p>
          )}
          <div
            className="ProseMirror text-[15px] leading-relaxed text-[#1d1d1f]"
            dangerouslySetInnerHTML={{ __html: note.content }}
          />
        </div>
      </main>
    </div>
  );
}
