import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getProjectById, getProjectUsers } from "@/actions/project-actions";
import { getProjectBoards } from "@/actions/board-actions";
import { getProjectNotes } from "@/actions/note-actions";
import { getUserById } from "@/actions/user-actions";
import BoardsListClient from "./BoardsListClient";
import ParentProjectClient from "./ParentProjectClient";
import {
  FolderOpen,
  Users,
  Calendar as CalendarIcon,
} from "lucide-react";
import ProjectNotesClient from "./ProjectNotesClient";
import ProjectCalendarClient from "./ProjectCalendarClient";
import TabSyncer from "@/components/tabs/TabSyncer";

async function BoardsList({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}) {
  const result = await getProjectBoards(projectId, userId);

  if (!result.success || !result.data) {
    return (
      <div className="text-center py-12">
        <p className="text-[#7a7a7a]">Error al cargar los tableros</p>
      </div>
    );
  }

  const boards = result.data;

  if (boards.length === 0) {
    return (
      <div className="text-center py-12 sm:py-16">
        <div className="max-w-md mx-auto px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-[#f5f5f7] flex items-center justify-center">
            <FolderOpen size={24} className="sm:hidden text-[#7a7a7a]" />
            <FolderOpen size={32} className="hidden sm:block text-[#7a7a7a]" />
          </div>
          <h3 className="text-[17px] sm:text-[21px] font-semibold text-[#1d1d1f] mb-2 tracking-[-0.374px]">
            No hay tableros aún
          </h3>
          <p className="text-[14px] sm:text-[17px] text-[#7a7a7a] tracking-[-0.224px]">
            Crea tableros para organizar las tareas de este proyecto
          </p>
        </div>
      </div>
    );
  }

  return (
    <BoardsListClient projectId={projectId} userId={userId} boards={boards} />
  );
}

async function NotesList({
  projectId,
  userId,
  userEmail,
}: {
  projectId: string;
  userId: string;
  userEmail?: string;
}) {
  const result = await getProjectNotes(projectId, userId);

  if (!result.success || !result.data) {
    return (
      <div className="text-center py-12">
        <p className="text-[#7a7a7a]">Error al cargar las notas</p>
      </div>
    );
  }

  const notes = result.data;

  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#7a7a7a]">No hay notas en este proyecto</p>
      </div>
    );
  }

  // Obtener información del owner de cada nota
  const notesWithOwnerInfo = await Promise.all(
    notes.map(async (note) => {
      const ownerResult = await getUserById(note.owner.toString());
      if (ownerResult.success && ownerResult.data) {
        return {
          note,
          ownerEmail: ownerResult.data.email || "",
          ownerName: ownerResult.data.name || "",
        };
      }
      return {
        note,
        ownerEmail: "",
        ownerName: "",
      };
    }),
  );

  return <ProjectNotesClient notes={notesWithOwnerInfo} userId={userId} />;
}

function BoardsLoading() {
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

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  const projectResult = await getProjectById(id);

  if (!projectResult.success || !projectResult.data) {
    notFound();
  }

  const project = projectResult.data;

  const usersResult = await getProjectUsers(id);
  const users = usersResult.success && usersResult.data ? usersResult.data : [];

  const boardsResult = await getProjectBoards(id, session.user.id);
  const boards =
    boardsResult.success && boardsResult.data ? boardsResult.data : [];

  const isOwner = project.owner.toString() === session.user.id;

  return (
    <div className="w-full min-h-full">
      <TabSyncer
        id={`project-${id}`}
        type="project"
        title={project.name}
        url={`/parent-project/${id}`}
        resourceId={id}
      />
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 lg:py-6">

        {/* Header */}
        <div className="mb-4 sm:mb-5">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen size={24} className="text-[#0066cc]" />
            <h1 className="text-[20px] sm:text-[28px] lg:text-[34px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">
              {project.name}
            </h1>
          </div>
          {project.description && (
            <p className="text-[13px] sm:text-[15px] text-[#7a7a7a] tracking-[-0.12px] mb-3">
              {project.description}
            </p>
          )}
          <p className="text-[12px] sm:text-[13px] text-[#7a7a7a] tracking-[-0.12px]">
            Tableros de este proyecto
          </p>
        </div>

        {/* Miembros del proyecto */}
        <div className="mb-3 flex justify-end items-center gap-2 text-sm bg-gray-50 p-2 rounded-lg">
          <Users size={16} className="text-[#7a7a7a]" />
          <span className="text-[#7a7a7a]">
            {users.map((user, index) => (
              <span key={user._id.toString()}>
                {user.name}
                {user._id.toString() === project.owner.toString() && (
                  <span className="text-[#7a7a7a] ml-1">(owner)</span>
                )}
                {index < users.length - 1 && <span className="mx-1">·</span>}
              </span>
            ))}
          </span>
          {isOwner && (
            <ParentProjectClient
              userId={session.user.id}
              parentId={id}
              project={project}
              mode="share"
              ownerEmail={session.user.email}
              ownerName={session.user.name}
            />
          )}
        </div>

        {/* Botón de crear tablero */}
        <ParentProjectClient
          userId={session.user.id}
          parentId={id}
          ownerEmail={session.user.email}
          ownerName={session.user.name}
        />

        {/* Lista de tableros */}
        <div className="mt-4 sm:mt-5">
          <Suspense fallback={<div>Cargando tableros...</div>}>
            <BoardsList projectId={id} userId={session.user.id} />
          </Suspense>
        </div>

        {/* Separador */}
        <div className="my-8 border-t border-gray-200" />

        {/* Sección de notas */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-[#1d1d1f] tracking-[-0.24px]">
              Notas del Proyecto
            </h2>
            <ParentProjectClient
              userId={session.user.id}
              parentId={id}
              mode="note"
              ownerEmail={session.user.email}
              ownerName={session.user.name}
            />
          </div>
          <Suspense fallback={<BoardsLoading />}>
            <NotesList
              projectId={id}
              userId={session.user.id}
              userEmail={session.user.email}
            />
          </Suspense>
        </div>

        {/* Separador */}
        <div className="my-8 border-t border-gray-200" />

        {/* Sección de calendario */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon size={20} className="text-[#0066cc]" />
            <h2 className="text-[15px] font-semibold text-[#1d1d1f] tracking-[-0.24px]">
              Calendario de Tareas del Proyecto
            </h2>
          </div>
          <ProjectCalendarClient projectId={id} userId={session.user.id} />
        </div>
      </div>
    </div>
  );
}
