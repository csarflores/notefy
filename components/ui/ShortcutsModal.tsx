'use client';

import Modal from './Modal';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ['Ctrl', 'K'], description: 'Abrir búsqueda global' },
  { keys: ['N'], description: 'Nueva nota' },
  { keys: ['B'], description: 'Nuevo tablero' },
  { keys: ['P'], description: 'Nuevo proyecto' },
  { keys: ['?'], description: 'Mostrar atajos de teclado' },
  { keys: ['Esc'], description: 'Cerrar modal / menú' },
  { keys: ['↑', '↓'], description: 'Navegar resultados en la búsqueda' },
  { keys: ['Enter'], description: 'Abrir elemento seleccionado' },
];

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Atajos de teclado" className="max-w-md">
      <ul className="divide-y divide-[#f0f0f2]">
        {SHORTCUTS.map((s) => (
          <li key={s.description} className="flex items-center justify-between py-2.5">
            <span className="text-[13px] text-[#3a3a3c]">{s.description}</span>
            <span className="flex items-center gap-1">
              {s.keys.map((k) => (
                <kbd
                  key={k}
                  className="min-w-6 text-center text-[11px] font-mono text-[#7a7a7a] bg-[#f5f5f7] border border-[#e5e5ea] border-b-2 rounded px-1.5 py-0.5"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-[#a0a0a8] pt-3">
        Los atajos de una tecla no se activan mientras escribes en un campo.
      </p>
    </Modal>
  );
}
