import { Suspense } from 'react';
import { Plus } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserProjects } from '@/actions/project-actions';
import { getUserBoards } from '@/actions/board-actions';
import { getUserNotes } from '@/actions/note-actions';
import { getUserById } from '@/actions/user-actions';
import DashboardClient from './DashboardClient';
import DashboardWithDragDrop from './DashboardWithDragDrop';
import Footer from '@/components/dashboard/Footer';
import TabSyncer from '@/components/tabs/TabSyncer';

async function ProjectsAndBoardsList({ userId, userEmail }: { userId: string; userEmail?: string }) {
  const [projectsResult, boardsResult, notesResult] = await Promise.all([
    getUserProjects(userId),
    getUserBoards(userId),
    getUserNotes(userId)
  ]);

  if (!projectsResult.success || !boardsResult.success || !notesResult.success) {
    return (
      <div className="text-center py-12">
        <p className="text-[#7a7a7a]">Error al cargar los proyectos, tableros y notas</p>
      </div>
    );
  }

  const allProjects = projectsResult.data || [];
  const allBoards = boardsResult.data || [];
  const allNotes = notesResult.data || [];

  // Filtrar notas: solo mostrar notas que NO están en un proyecto
  const unassignedNotes = allNotes.filter((note) => !note.projectId);

  // Obtener información del owner de cada nota
  const notesWithOwnerInfo = await Promise.all(
    unassignedNotes.map(async (note) => {
      const ownerResult = await getUserById(note.owner.toString());
      if (ownerResult.success && ownerResult.data) {
        return {
          note,
          ownerEmail: ownerResult.data.email || '',
          ownerName: ownerResult.data.name || ''
        };
      }
      return {
        note,
        ownerEmail: '',
        ownerName: ''
      };
    })
  );

  if (allProjects.length === 0 && allBoards.length === 0 && unassignedNotes.length === 0) {
    return (
      <div className="py-12 sm:py-16">
        <div className="max-w-lg mx-auto px-4">
          <h3 className="text-[17px] sm:text-[20px] font-semibold text-[#1d1d1f] mb-1 tracking-tight">
            Bienvenido a Notefy
          </h3>
          <p className="text-[13px] text-[#7a7a7a] mb-8">
            Empieza en tres pasos:
          </p>
          <ol className="space-y-4">
            {[
              { n: 1, title: 'Crea un Proyecto', desc: 'Agrupa tableros y notas bajo un mismo tema o cliente.', hint: 'Usa el botón "+ Nuevo" o el sidebar izquierdo.' },
              { n: 2, title: 'Agrega un Tablero', desc: 'Organiza tus tareas en columnas: Pendiente, En Progreso, Hecho.', hint: 'Desde el proyecto, usa "+ Nuevo Tablero".' },
              { n: 3, title: 'Crea tus primeras tareas', desc: 'Asigna responsables, fechas y etiquetas a cada tarea.', hint: 'Dentro del tablero, haz clic en "+" en cada columna.' },
            ].map((step) => (
              <li key={step.n} className="flex gap-4 bg-white rounded-xl p-4 border border-[#e0e0e0]">
                <div className="w-7 h-7 rounded-full bg-[#0066cc] text-white text-[13px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step.n}
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#1d1d1f]">{step.title}</p>
                  <p className="text-[12px] text-[#7a7a7a] mt-0.5">{step.desc}</p>
                  <p className="text-[11px] text-[#a0a0a8] mt-1 italic">{step.hint}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-[12px] text-[#a0a0a8] mt-6 text-center">
            Tip: usa <kbd className="bg-[#f0f0f2] px-1.5 py-0.5 rounded text-[11px] border border-[#e0e0e0]">Ctrl+K</kbd> para buscar y crear desde cualquier pantalla.
          </p>
        </div>
      </div>
    );
  }

  // Contar tableros por proyecto
  const projectsWithBoardCount = allProjects.map((project) => {
    const boardCount = allBoards.filter(
      (board) => board.projectId?.toString() === project._id.toString()
    ).length;
    return { item: project, childCount: boardCount };
  });

  // Tableros sin proyecto
  const unassignedBoards = allBoards
    .filter((board) => !board.projectId)
    .map((board) => ({ item: board }));

  return (
    <DashboardWithDragDrop
      projects={projectsWithBoardCount}
      unassignedBoards={unassignedBoards}
      notes={notesWithOwnerInfo}
      userId={userId}
    />
  );
}

function ProjectsLoading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-[#e0e0e0] p-4 sm:p-5 animate-pulse"
        >
          <div className="space-y-3">
            <div>
              <div className="h-5 bg-[#f5f5f7] rounded-lg w-3/4 mb-2" />
              <div className="h-3 bg-[#f5f5f7] rounded-lg w-full" />
              <div className="h-3 bg-[#f5f5f7] rounded-lg w-2/3 mt-1" />
            </div>
            <div className="flex gap-3">
              <div className="h-3 bg-[#f5f5f7] rounded-lg w-16" />
              <div className="h-3 bg-[#f5f5f7] rounded-lg w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  return (
    <div className="w-full flex flex-col min-h-full">
      <TabSyncer id="dashboard" type="dashboard" title="Dashboard" url="/dashboard" />
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 lg:py-6">
        {/* Botones de acción */}
        <DashboardClient userId={session.user.id} userName={session.user.name} userEmail={session.user.email} />

        {/* Lista de proyectos y tableros */}
        <div className="mt-4 sm:mt-5">
          <Suspense fallback={<ProjectsLoading />}>
            <ProjectsAndBoardsList userId={session.user.id} userEmail={session.user.email} />
          </Suspense>
        </div>
      </div>

      <Footer />
    </div>
  );
}
