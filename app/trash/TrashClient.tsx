'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Folder,
  LayoutGrid,
  FileText,
  CheckSquare,
  RotateCcw,
  Trash2,
  Inbox,
} from 'lucide-react';
import { TrashItem, restoreItem, permanentlyDeleteItem } from '@/actions/trash-actions';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useNotification } from '@/components/ui/NotificationContext';

const KIND_META: Record<TrashItem['kind'], { label: string; icon: typeof Folder }> = {
  project: { label: 'Proyecto', icon: Folder },
  board: { label: 'Tablero', icon: LayoutGrid },
  note: { label: 'Nota', icon: FileText },
  task: { label: 'Tarea', icon: CheckSquare },
};

function formatDeletedAt(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

export default function TrashClient({ items }: { items: TrashItem[] }) {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [pendingDelete, setPendingDelete] = useState<TrashItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const handleRestore = async (item: TrashItem) => {
    setBusy(item.id);
    const res = await restoreItem(item.kind, item.id);
    if (res.success) {
      showNotification(`${KIND_META[item.kind].label} restaurado`, 'success');
      router.refresh();
    } else {
      showNotification(res.error || 'Error al restaurar', 'error');
    }
    setBusy(null);
  };

  const handlePermanentDelete = async () => {
    if (!pendingDelete) return;
    setBusy(pendingDelete.id);
    const res = await permanentlyDeleteItem(pendingDelete.kind, pendingDelete.id);
    if (res.success) {
      showNotification('Eliminado definitivamente', 'success');
      setPendingDelete(null);
      router.refresh();
    } else {
      showNotification(res.error || 'Error al eliminar', 'error');
    }
    setBusy(null);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-full bg-[#f5f5f7] flex items-center justify-center mb-4">
          <Inbox size={32} className="text-[#7a7a7a]" />
        </div>
        <h3 className="text-lg font-semibold text-[#1d1d1f] mb-1">La papelera está vacía</h3>
        <p className="text-[13px] text-[#7a7a7a]">
          Los proyectos, tableros, notas y tareas eliminados aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="bg-white rounded-xl border border-[#e0e0e0] divide-y divide-[#f0f0f2] overflow-hidden">
        {items.map((item) => {
          const meta = KIND_META[item.kind];
          const Icon = meta.icon;
          return (
            <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-[#f5f5f7] flex items-center justify-center shrink-0">
                <Icon size={14} className="text-[#7a7a7a]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#1d1d1f] truncate">{item.title}</p>
                <p className="text-[11px] text-[#a0a0a8]">
                  {meta.label} · eliminado {formatDeletedAt(item.deletedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRestore(item)}
                disabled={busy === item.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5e5ea] text-[12px] font-medium text-[#0066cc] hover:border-[#0066cc] transition-all disabled:opacity-50"
              >
                <RotateCcw size={12} />
                Restaurar
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(item)}
                disabled={busy === item.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5e5ea] text-[12px] font-medium text-red-500 hover:border-red-300 hover:bg-red-50 transition-all disabled:opacity-50"
              >
                <Trash2 size={12} />
                Eliminar
              </button>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handlePermanentDelete}
        title="Eliminar definitivamente"
        message={
          <p className="text-[#7a7a7a]">
            ¿Eliminar definitivamente <strong>&quot;{pendingDelete?.title}&quot;</strong>? Esta acción no se puede deshacer.
          </p>
        }
        confirmText="Eliminar definitivamente"
        isLoading={!!busy}
        variant="danger"
      />
    </>
  );
}
