'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { importCSVToBoard, importTrelloJSON } from '@/actions/export-actions';
import { useNotification } from '@/components/ui/NotificationContext';
import { Upload, FileText, Loader2 } from 'lucide-react';

export default function ImportBoardModal({
  isOpen,
  onClose,
  boardId,
}: {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
}) {
  const router = useRouter();
  const { showNotification } = useNotification();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const isJSON = file?.name.toLowerCase().endsWith('.json');

  const handleImport = async () => {
    if (!file || isImporting) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const result = isJSON
        ? await importTrelloJSON(boardId, text)
        : await importCSVToBoard(boardId, text);

      if (result.success && result.data) {
        const { imported } = result.data;
        showNotification(`${imported} tareas importadas`, 'success');
        setFile(null);
        onClose();
        router.refresh();
      } else {
        showNotification(result.error || 'Error al importar', 'error');
      }
    } catch {
      showNotification('Error al leer el archivo', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importar tareas" className="max-w-lg">
      <div className="space-y-4">
        <p className="text-[13px] text-[#7a7a7a]">
          Sube un archivo <strong>CSV</strong> (con columna <code>title</code>) o un{' '}
          <strong>JSON exportado de Trello</strong>. Las tareas se agregan al tablero sin
          borrar las existentes.
        </p>

        <button
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-[#e5e5ea] hover:border-[#0066cc] transition-colors p-6 flex flex-col items-center gap-2 text-[#a0a0a8] hover:text-[#0066cc]"
        >
          {file ? (
            <>
              <FileText size={22} />
              <span className="text-[13px] font-medium text-[#1d1d1f]">{file.name}</span>
              <span className="text-[11px]">
                {isJSON ? 'Se importará como Trello' : 'Se importará como CSV'}
              </span>
            </>
          ) : (
            <>
              <Upload size={22} />
              <span className="text-[13px]">Elegir archivo .csv o .json</span>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <div className="text-[11px] text-[#a0a0a8] space-y-1">
          <p>
            <strong>CSV:</strong> columnas soportadas: title, description, column, priority,
            dueDate, tags, checklist.
          </p>
          <p>
            <strong>Trello:</strong> usa &quot;Exportar → JSON&quot; en Trello. Las listas se
            convierten en columnas y las tarjetas en tareas.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isImporting}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={!file || isImporting}
          >
            {isImporting ? (
              <Loader2 size={14} className="animate-spin mr-1.5" />
            ) : (
              <Upload size={14} className="mr-1.5" />
            )}
            Importar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
