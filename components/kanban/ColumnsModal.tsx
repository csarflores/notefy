'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowUp, ArrowDown, Columns3 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { IBoardColumn } from '@/types';
import { getBoardColumns } from '@/lib/board-columns';
import { saveBoardColumns } from '@/actions/board-actions';
import { useNotification } from '@/components/ui/NotificationContext';

const COLUMN_COLORS = [
  '#ff9500',
  '#0066cc',
  '#34c759',
  '#ff3b30',
  '#af52de',
  '#5ac8fa',
  '#ffcc00',
  '#ff2d55',
  '#8e8e93',
];

interface ColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  initialColumns?: IBoardColumn[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30) || 'columna';
}

export default function ColumnsModal({ isOpen, onClose, boardId, initialColumns }: ColumnsModalProps) {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [columns, setColumns] = useState<IBoardColumn[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Inicializar con las columnas efectivas del tablero al abrir
  useEffect(() => {
    if (isOpen) {
      setColumns(getBoardColumns(initialColumns).map((c) => ({ ...c })));
      setNewTitle('');
      setError('');
    }
  }, [isOpen, initialColumns]);

  const updateColumn = (index: number, patch: Partial<IBoardColumn>) => {
    setColumns((cols) => cols.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const moveColumn = (index: number, dir: -1 | 1) => {
    setColumns((cols) => {
      const target = index + dir;
      if (target < 0 || target >= cols.length) return cols;
      const next = [...cols];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeColumn = (index: number) => {
    if (columns.length <= 1) return;
    setColumns((cols) => cols.filter((_, i) => i !== index));
  };

  const addColumn = () => {
    const title = newTitle.trim();
    if (!title || columns.length >= 8) return;
    const base = slugify(title);
    let id = base;
    let n = 2;
    while (columns.some((c) => c.id === id)) id = `${base}-${n++}`;
    const color = COLUMN_COLORS[columns.length % COLUMN_COLORS.length];
    setColumns((cols) => [...cols, { id, title, color }]);
    setNewTitle('');
  };

  const handleSave = async () => {
    if (columns.some((c) => !c.title.trim())) {
      setError('Todas las columnas necesitan un nombre');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const result = await saveBoardColumns(boardId, columns);
      if (result.success) {
        showNotification('Columnas actualizadas', 'success');
        onClose();
        router.refresh();
      } else {
        setError(result.error || 'Error al guardar las columnas');
      }
    } catch {
      setError('Error inesperado al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md" title="Personalizar columnas">
      <div className="space-y-4">
        <p className="text-[12px] text-[#7a7a7a] leading-relaxed">
          Renombrá, reordená o agregá columnas. Si eliminás una columna con tareas,
          esas tareas se mueven a la primera columna.
        </p>

        <div className="space-y-1">
          {columns.map((col, index) => (
            <div
              key={col.id}
              className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-[#f5f5f7] group transition-colors"
            >
              {/* Color */}
              <label
                className="relative w-5 h-5 rounded-full shrink-0 cursor-pointer overflow-hidden ring-1 ring-black/5"
                style={{ backgroundColor: col.color }}
                title="Cambiar color"
              >
                <input
                  type="color"
                  value={col.color}
                  onChange={(e) => updateColumn(index, { color: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>

              {/* Nombre */}
              <input
                type="text"
                value={col.title}
                onChange={(e) => updateColumn(index, { title: e.target.value.slice(0, 30) })}
                maxLength={30}
                className="flex-1 min-w-0 px-2 py-1 rounded-lg text-[13px] text-[#1d1d1f] bg-transparent border border-transparent hover:border-[#e0e0e0] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all"
              />

              {/* Reordenar */}
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => moveColumn(index, -1)}
                  disabled={index === 0}
                  className="p-1 rounded-md text-[#7a7a7a] hover:text-[#1d1d1f] hover:bg-white disabled:opacity-30 transition-colors"
                  title="Subir"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  onClick={() => moveColumn(index, 1)}
                  disabled={index === columns.length - 1}
                  className="p-1 rounded-md text-[#7a7a7a] hover:text-[#1d1d1f] hover:bg-white disabled:opacity-30 transition-colors"
                  title="Bajar"
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  onClick={() => removeColumn(index)}
                  disabled={columns.length <= 1}
                  className="p-1 rounded-md text-[#7a7a7a] hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
                  title="Eliminar columna"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Agregar columna */}
        {columns.length < 8 && (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full shrink-0 bg-[#f0f0f2] flex items-center justify-center">
              <Plus size={11} className="text-[#8e8e93]" />
            </div>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value.slice(0, 30))}
              onKeyDown={(e) => e.key === 'Enter' && addColumn()}
              placeholder="Nueva columna…"
              maxLength={30}
              className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-[13px] text-[#1d1d1f] border border-dashed border-[#e0e0e0] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all placeholder:text-[#c7c7cc]"
            />
            <Button variant="secondary" size="sm" onClick={addColumn} disabled={!newTitle.trim()}>
              Agregar
            </Button>
          </div>
        )}

        {error && <p className="text-[12px] text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
            <Columns3 size={13} className="mr-1" />
            {isSaving ? 'Guardando…' : 'Guardar columnas'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
