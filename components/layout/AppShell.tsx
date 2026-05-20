'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';
import TabBar from '@/components/tabs/TabBar';
import Sidebar from './Sidebar';
import { SidebarProvider } from './SidebarContext';
import CommandPalette from './CommandPalette';
import { CommandPaletteProvider } from './CommandPaletteContext';
import CreateProjectGroupModal from '@/components/dashboard/CreateProjectGroupModal';
import CreateBoardModal from '@/components/dashboard/CreateBoardModal';
import CreateNoteModal from '@/components/notes/CreateNoteModal';

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const { data: session } = useSession();

  const isAuthPage = pathname.startsWith('/auth');

  const [projectModal, setProjectModal] = useState(false);
  const [boardModal, setBoardModal] = useState(false);
  const [noteModal, setNoteModal] = useState(false);

  // Global keyboard shortcuts (skip when typing in inputs)
  useEffect(() => {
    if (isAuthPage || !session?.user) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'n') { e.preventDefault(); setNoteModal(true); }
      if (e.key === 'b') { e.preventDefault(); setBoardModal(true); }
      if (e.key === 'p') { e.preventDefault(); setProjectModal(true); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isAuthPage, session?.user]);

  if (isAuthPage || !session?.user) {
    return <>{children}</>;
  }

  const userId = session.user.id;
  const userName = session.user.name ?? '';
  const userEmail = session.user.email ?? undefined;

  return (
    <CommandPaletteProvider>
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-[#f5f5f7]">
        {/* Left: Sidebar */}
        <Sidebar
          userId={userId}
          userName={userName}
          userEmail={userEmail}
        />

        {/* Right: TabBar + scrollable content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="shrink-0 bg-white border-b border-[#e0e0e0] shadow-sm z-40">
            <TabBar />
          </div>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Global Ctrl+K command palette */}
      <CommandPalette
        userId={userId}
        onCreateProject={() => setProjectModal(true)}
        onCreateBoard={() => setBoardModal(true)}
        onCreateNote={() => setNoteModal(true)}
      />

      <CreateProjectGroupModal
        isOpen={projectModal}
        onClose={() => setProjectModal(false)}
        userId={userId}
      />
      <CreateBoardModal
        isOpen={boardModal}
        onClose={() => setBoardModal(false)}
        userId={userId}
      />
      <CreateNoteModal
        isOpen={noteModal}
        onClose={() => setNoteModal(false)}
        userId={userId}
        ownerEmail={userEmail}
        ownerName={userName}
      />
    </SidebarProvider>
    </CommandPaletteProvider>
  );
}
