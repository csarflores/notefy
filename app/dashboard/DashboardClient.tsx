'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Folder, LayoutGrid, FileText } from 'lucide-react';
import CreateProjectGroupModal from '@/components/dashboard/CreateProjectGroupModal';
import CreateBoardModal from '@/components/dashboard/CreateBoardModal';
import CreateNoteModal from '@/components/notes/CreateNoteModal';

interface DashboardClientProps {
  userId: string;
  userName: string;
  userEmail?: string;
}

export default function DashboardClient({ userId, userName, userEmail }: DashboardClientProps) {
  const [open, setOpen] = useState(false);
  const [projectModal, setProjectModal] = useState(false);
  const [boardModal, setBoardModal] = useState(false);
  const [noteModal, setNoteModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const options = [
    {
      icon: <Folder size={15} className="text-[#0066cc]" />,
      label: 'Nuevo Proyecto',
      desc: 'Agrupa tableros y notas',
      action: () => { setOpen(false); setProjectModal(true); },
    },
    {
      icon: <LayoutGrid size={15} className="text-[#8b5cf6]" />,
      label: 'Nuevo Tablero',
      desc: 'Organiza tareas en Kanban',
      action: () => { setOpen(false); setBoardModal(true); },
    },
    {
      icon: <FileText size={15} className="text-[#10b981]" />,
      label: 'Nueva Nota',
      desc: 'Escribe con editor de texto',
      action: () => { setOpen(false); setNoteModal(true); },
    },
  ];

  return (
    <>
      <div ref={menuRef} className="relative inline-block">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066cc] hover:bg-[#0052a3] text-white text-[13px] font-medium rounded-lg transition-colors shadow-sm"
        >
          <Plus size={15} />
          Nuevo
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-[#e0e0e0] py-1.5 z-50">
            {options.map((opt) => (
              <button
                key={opt.label}
                onClick={opt.action}
                className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-[#f5f5f7] transition-colors text-left"
              >
                <div className="mt-0.5 shrink-0">{opt.icon}</div>
                <div>
                  <p className="text-[13px] font-medium text-[#1d1d1f]">{opt.label}</p>
                  <p className="text-[11px] text-[#7a7a7a]">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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
    </>
  );
}
