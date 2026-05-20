'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Folder,
  LayoutGrid,
  CalendarDays,
  FileText,
  Plus,
  LogOut,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  X,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logotipo';
import { useSidebar } from './SidebarContext';
import { useCommandPalette } from './CommandPaletteContext';
import { useTabContext } from '@/components/tabs/TabContext';
import { getUserProjects, deleteProject } from '@/actions/project-actions';
import { getUserBoards, deleteBoard } from '@/actions/board-actions';
import { getUserNotes, deleteNote } from '@/actions/note-actions';
import { IProject, IBoard, INote } from '@/types';
import CreateProjectGroupModal from '@/components/dashboard/CreateProjectGroupModal';
import CreateBoardModal from '@/components/dashboard/CreateBoardModal';
import CreateNoteModal from '@/components/notes/CreateNoteModal';
import EditProjectModal from '@/components/dashboard/EditProjectModal';
import EditBoardModal from '@/components/dashboard/EditBoardModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import SidebarContextMenu, { ContextMenuItem } from './SidebarContextMenu';
import { useRecents, RecentItem } from './useRecents';

interface SidebarProps {
  userId: string;
  userName: string;
  userEmail?: string;
}

interface ProjectTree {
  project: IProject;
  boards: IBoard[];
  expanded: boolean;
}

export default function Sidebar({ userId, userName, userEmail }: SidebarProps) {
  const { collapsed, toggle } = useSidebar();
  const { open: openSearch } = useCommandPalette();
  const router = useRouter();
  const pathname = usePathname();
  const { openTab } = useTabContext();

  const [projectTree, setProjectTree] = useState<ProjectTree[]>([]);
  const [standaloneBoards, setStandaloneBoards] = useState<IBoard[]>([]);
  const [standaloneNotes, setStandaloneNotes] = useState<INote[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentsExpanded, setRecentsExpanded] = useState(true);
  const { recents, push: pushRecent, remove: removeRecent } = useRecents();

  // Modal states
  const [projectModal, setProjectModal] = useState(false);
  const [boardModal, setBoardModal] = useState(false);
  const [noteModal, setNoteModal] = useState(false);
  const [boardModalProjectId, setBoardModalProjectId] = useState<string | undefined>();

  // Edit modal states
  const [editProject, setEditProject] = useState<IProject | null>(null);
  const [editBoard, setEditBoard] = useState<IBoard | null>(null);

  // Confirm delete states
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'project' | 'board' | 'note';
    id: string;
    title: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const openContextMenu = (e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === 'project') await deleteProject(confirmDelete.id);
      else if (confirmDelete.type === 'board') await deleteBoard(confirmDelete.id);
      else if (confirmDelete.type === 'note') await deleteNote(confirmDelete.id, userId);
      await loadData();
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  const loadData = useCallback(async () => {
    const [projectsRes, boardsRes, notesRes] = await Promise.all([
      getUserProjects(userId),
      getUserBoards(userId),
      getUserNotes(userId),
    ]);
    if (!projectsRes.success || !boardsRes.success) return;

    const projects = projectsRes.data || [];
    const boards = boardsRes.data || [];
    const notes = notesRes.success ? (notesRes.data || []) : [];

    const tree: ProjectTree[] = projects.map((p) => ({
      project: p,
      boards: boards.filter((b) => b.projectId?.toString() === p._id.toString()),
      expanded: true,
    }));

    setProjectTree(tree);
    setStandaloneBoards(boards.filter((b) => !b.projectId));
    setStandaloneNotes(notes.filter((n) => !n.projectId));
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleProject = (id: string) => {
    setProjectTree((prev) =>
      prev.map((pt) =>
        pt.project._id.toString() === id ? { ...pt, expanded: !pt.expanded } : pt
      )
    );
  };

  const navigate = (url: string, tab: Parameters<typeof openTab>[0]) => {
    openTab(tab);
    pushRecent({
      id: tab.id,
      type: tab.type === 'calendar' ? 'board' : tab.type,
      title: tab.title,
      url,
    } as RecentItem);
    router.push(url);
  };

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + '/');

  const linkClass = (url: string) =>
    `group flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-colors cursor-pointer select-none ${
      isActive(url)
        ? 'bg-[#e8f0fe] text-[#1d1d1f] font-medium'
        : 'text-[#5c5c5e] hover:bg-[#f0f0f2] hover:text-[#1d1d1f]'
    }`;

  if (collapsed) {
    return (
      <div className="flex flex-col h-full w-14 bg-white border-r border-[#e0e0e0] shrink-0">
        <div className="flex flex-col items-center py-3 gap-1">
          <button
            onClick={toggle}
            className="p-2 rounded-lg hover:bg-[#f0f0f2] text-[#7a7a7a] hover:text-[#1d1d1f] transition-colors"
            title="Expandir sidebar"
          >
            <PanelLeftOpen size={16} />
          </button>
          <button
            onClick={() => openSearch()}
            className="p-2 rounded-lg hover:bg-[#f0f0f2] transition-colors"
            title="Buscar (Ctrl + K)"
          >
            <Search size={16} className="text-[#5c5c5e]" />
          </button>
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-[#f0f0f2] transition-colors" title="Dashboard">
            <LayoutDashboard size={16} className="text-[#5c5c5e]" />
          </Link>
          <Link href="/calendar" className="p-2 rounded-lg hover:bg-[#f0f0f2] transition-colors" title="Calendario">
            <CalendarDays size={16} className="text-[#5c5c5e]" />
          </Link>
        </div>
        <div className="mt-auto flex flex-col items-center pb-3 gap-1">
          <div className="p-2 rounded-full bg-[#f0f0f2]" title={userName}>
            <User size={14} className="text-[#5c5c5e]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full w-60 bg-white border-r border-[#e0e0e0] shrink-0 overflow-hidden">
        {/* Top: Logo + collapse */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-[#f0f0f2]">
          <Logo className="h-6 w-6" size="small" linkTo="/dashboard" />
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg hover:bg-[#f0f0f2] text-[#7a7a7a] hover:text-[#1d1d1f] transition-colors"
            title="Colapsar sidebar"
          >
            <PanelLeftClose size={15} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {/* Search button */}
          <button
            onClick={() => openSearch()}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] text-[#a0a0a8] bg-[#f5f5f7] hover:bg-[#ebebed] transition-colors mb-1"
          >
            <Search size={13} className="shrink-0" />
            <span className="flex-1 text-left">Buscar...</span>
            <kbd className="text-[10px] bg-white px-1 py-0.5 rounded border border-[#e0e0e0] leading-none">⌘K</kbd>
          </button>

          {/* Dashboard */}
          <Link href="/dashboard" className={linkClass('/dashboard')}>
            <LayoutDashboard size={14} className="shrink-0" />
            <span className="truncate">Dashboard</span>
          </Link>

          {/* Calendar */}
          <button
            onClick={() =>
              navigate('/calendar', {
                id: 'calendar',
                type: 'calendar',
                title: 'Calendario',
                url: '/calendar',
              })
            }
            className={linkClass('/calendar') + ' w-full text-left'}
          >
            <CalendarDays size={14} className="shrink-0" />
            <span className="truncate">Calendario</span>
          </button>

          {/* Recents section */}
          {recents.length > 0 && (
            <>
              <div className="pt-2 pb-1 px-1">
                <button
                  onClick={() => setRecentsExpanded((v) => !v)}
                  className="flex items-center gap-1 w-full text-left hover:text-[#1d1d1f] transition-colors"
                >
                  {recentsExpanded ? <ChevronDown size={11} className="text-[#a0a0a8]" /> : <ChevronRight size={11} className="text-[#a0a0a8]" />}
                  <span className="text-[11px] font-semibold text-[#a0a0a8] uppercase tracking-wider">
                    Recientes
                  </span>
                </button>
              </div>
              {recentsExpanded && recents.map((item) => {
                const Icon = item.type === 'project' ? Folder : item.type === 'note' ? FileText : LayoutGrid;
                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(item.url)}
                    onContextMenu={(e) => openContextMenu(e, [
                      { label: 'Abrir', icon: ExternalLink, onClick: () => router.push(item.url) },
                      { label: 'Quitar de recientes', icon: X, onClick: () => removeRecent(item.id), separator: true },
                    ])}
                    className={linkClass(item.url) + ' w-full text-left'}
                  >
                    <Icon size={13} className="shrink-0 opacity-70" />
                    <span className="truncate">{item.title}</span>
                  </button>
                );
              })}
            </>
          )}

          {/* Divider */}
          <div className="pt-2 pb-1 px-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#a0a0a8] uppercase tracking-wider">
                Proyectos
              </span>
              <button
                onClick={() => setProjectModal(true)}
                className="p-0.5 rounded hover:bg-[#f0f0f2] text-[#a0a0a8] hover:text-[#1d1d1f] transition-colors"
                title="Nuevo proyecto"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {/* Project tree */}
          {loading ? (
            <div className="space-y-1 px-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 bg-[#f5f5f7] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {projectTree.map(({ project, boards, expanded }) => {
                const projectId = project._id.toString();
                const projectUrl = `/parent-project/${projectId}`;
                const projectColor = project.color || '#0066cc';

                return (
                  <div key={projectId}>
                    {/* Project row */}
                    <div
                      onContextMenu={(e) => openContextMenu(e, [
                        { label: 'Editar', icon: Pencil, onClick: () => setEditProject(project) },
                        { label: 'Nuevo tablero', icon: Plus, onClick: () => { setBoardModalProjectId(projectId); setBoardModal(true); } },
                        { label: 'Abrir', icon: ExternalLink, onClick: () => navigate(projectUrl, { id: `project-${projectId}`, type: 'project', title: project.name, url: projectUrl, resourceId: projectId }) },
                        { label: 'Eliminar', icon: Trash2, onClick: () => setConfirmDelete({ type: 'project', id: projectId, title: project.name }), variant: 'danger', separator: true },
                      ])}
                      className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors cursor-pointer select-none ${
                        isActive(projectUrl)
                          ? 'bg-[#e8f0fe] text-[#1d1d1f] font-medium'
                          : 'text-[#5c5c5e] hover:bg-[#f0f0f2] hover:text-[#1d1d1f]'
                      }`}
                    >
                      <button
                        onClick={() => toggleProject(projectId)}
                        className="shrink-0 text-[#a0a0a8] hover:text-[#1d1d1f] transition-colors"
                      >
                        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                      <button
                        onClick={() =>
                          navigate(projectUrl, {
                            id: `project-${projectId}`,
                            type: 'project',
                            title: project.name,
                            url: projectUrl,
                            resourceId: projectId,
                          })
                        }
                        className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: projectColor }}
                        />
                        <span className="text-[13px] truncate">{project.name}</span>
                      </button>
                      <button
                        onClick={() => {
                          setBoardModalProjectId(projectId);
                          setBoardModal(true);
                        }}
                        className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#e0e0e0] text-[#a0a0a8] hover:text-[#1d1d1f] transition-all"
                        title="Nuevo tablero en este proyecto"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Boards under project */}
                    {expanded && boards.length > 0 && (
                      <div className="ml-5 mt-0.5 space-y-0.5">
                        {boards.map((board) => {
                          const boardUrl = `/board/${board._id}`;
                          const boardTab = { id: `board-${board._id}`, type: 'board' as const, title: board.name, url: boardUrl, resourceId: board._id.toString() };
                          return (
                            <button
                              key={board._id.toString()}
                              onClick={() => navigate(boardUrl, boardTab)}
                              onContextMenu={(e) => openContextMenu(e, [
                                { label: 'Editar', icon: Pencil, onClick: () => setEditBoard(board) },
                                { label: 'Abrir', icon: ExternalLink, onClick: () => navigate(boardUrl, boardTab) },
                                { label: 'Eliminar', icon: Trash2, onClick: () => setConfirmDelete({ type: 'board', id: board._id.toString(), title: board.name }), variant: 'danger', separator: true },
                              ])}
                              className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-[12px] transition-colors text-left ${
                                isActive(boardUrl)
                                  ? 'bg-[#e8f0fe] text-[#1d1d1f] font-medium'
                                  : 'text-[#7a7a7a] hover:bg-[#f0f0f2] hover:text-[#1d1d1f]'
                              }`}
                            >
                              <LayoutGrid size={12} className="shrink-0 opacity-70" />
                              <span className="truncate">{board.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Standalone boards */}
              {standaloneBoards.length > 0 && (
                <>
                  <div className="pt-2 pb-1 px-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#a0a0a8] uppercase tracking-wider">
                        Tableros
                      </span>
                      <button
                        onClick={() => {
                          setBoardModalProjectId(undefined);
                          setBoardModal(true);
                        }}
                        className="p-0.5 rounded hover:bg-[#f0f0f2] text-[#a0a0a8] hover:text-[#1d1d1f] transition-colors"
                        title="Nuevo tablero"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                  {standaloneBoards.map((board) => {
                    const boardUrl = `/board/${board._id}`;
                    const boardTab = { id: `board-${board._id}`, type: 'board' as const, title: board.name, url: boardUrl, resourceId: board._id.toString() };
                    return (
                      <button
                        key={board._id.toString()}
                        onClick={() => navigate(boardUrl, boardTab)}
                        onContextMenu={(e) => openContextMenu(e, [
                          { label: 'Editar', icon: Pencil, onClick: () => setEditBoard(board) },
                          { label: 'Abrir', icon: ExternalLink, onClick: () => navigate(boardUrl, boardTab) },
                          { label: 'Eliminar', icon: Trash2, onClick: () => setConfirmDelete({ type: 'board', id: board._id.toString(), title: board.name }), variant: 'danger', separator: true },
                        ])}
                        className={linkClass(boardUrl) + ' w-full text-left'}
                      >
                        <LayoutGrid size={14} className="shrink-0" />
                        <span className="truncate">{board.name}</span>
                      </button>
                    );
                  })}
                </>
              )}

              {projectTree.length === 0 && standaloneBoards.length === 0 && (
                <button
                  onClick={() => setProjectModal(true)}
                  className="w-full text-left px-3 py-2 text-[12px] text-[#a0a0a8] hover:text-[#0066cc] transition-colors"
                >
                  + Crear primer proyecto
                </button>
              )}
            </>
          )}         

          {/* Notes section */}
          {!loading && (standaloneNotes.length > 0 || true) && (
            <>
              <div className="pt-2 pb-1 px-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#a0a0a8] uppercase tracking-wider">
                    Notas
                  </span>
                  <button
                    onClick={() => setNoteModal(true)}
                    className="p-0.5 rounded hover:bg-[#f0f0f2] text-[#a0a0a8] hover:text-[#1d1d1f] transition-colors"
                    title="Nueva nota"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
              {standaloneNotes.map((note) => {
                const noteUrl = `/notes/${note._id}`;
                const noteTab = { id: `board-${note._id}`, type: 'board' as const, title: note.title, url: noteUrl, resourceId: note._id.toString() };
                return (
                  <button
                    key={note._id.toString()}
                    onClick={() => navigate(noteUrl, noteTab)}
                    onContextMenu={(e) => openContextMenu(e, [
                      { label: 'Editar', icon: Pencil, onClick: () => navigate(noteUrl, noteTab) },
                      { label: 'Abrir', icon: ExternalLink, onClick: () => navigate(noteUrl, noteTab) },
                      { label: 'Eliminar', icon: Trash2, onClick: () => setConfirmDelete({ type: 'note', id: note._id.toString(), title: note.title }), variant: 'danger', separator: true },
                    ])}
                    className={linkClass(noteUrl) + ' w-full text-left'}
                  >
                    <FileText size={14} className="shrink-0" />
                    <span className="truncate">{note.title}</span>
                  </button>
                );
              })}
              {standaloneNotes.length === 0 && (
                <button
                  onClick={() => setNoteModal(true)}
                  className="w-full text-left px-3 py-1.5 text-[12px] text-[#a0a0a8] hover:text-[#0066cc] transition-colors"
                >
                  + Nueva nota
                </button>
              )}
            </>
          )}
        </div>

        {/* Bottom: User + logout */}
        <div className="border-t border-[#f0f0f2] px-3 py-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-[#0066cc] flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white uppercase">
                {userName?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[#1d1d1f] truncate">{userName}</p>
              {userEmail && (
                <p className="text-[10px] text-[#7a7a7a] truncate">{userEmail}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-[#7a7a7a] hover:bg-[#f0f0f2] hover:text-[#1d1d1f] transition-colors"
          >
            <LogOut size={13} />
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Modals */}
      <CreateProjectGroupModal
        isOpen={projectModal}
        onClose={() => { setProjectModal(false); loadData(); }}
        userId={userId}
      />
      <CreateBoardModal
        isOpen={boardModal}
        onClose={() => { setBoardModal(false); loadData(); }}
        userId={userId}
        projectId={boardModalProjectId}
      />
      <CreateNoteModal
        isOpen={noteModal}
        onClose={async () => { setNoteModal(false); await loadData(); }}
        userId={userId}
        ownerEmail={userEmail}
        ownerName={userName}
      />
      {editProject && (
        <EditProjectModal
          isOpen={true}
          onClose={() => { setEditProject(null); loadData(); }}
          project={editProject}
        />
      )}
      {editBoard && (
        <EditBoardModal
          isOpen={true}
          onClose={() => { setEditBoard(null); loadData(); }}
          board={editBoard}
        />
      )}
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={`Eliminar ${confirmDelete?.type === 'project' ? 'proyecto' : confirmDelete?.type === 'board' ? 'tablero' : 'nota'}`}
        message={`¿Estás seguro de que querés eliminar "${confirmDelete?.title}"? Esta acción no se puede deshacer.`}
        confirmText={deleting ? 'Eliminando...' : 'Eliminar'}
        variant="danger"
      />
      {contextMenu && (
        <SidebarContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
