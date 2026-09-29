'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

// Emojis curados para proyectos/tableros (estilo Apple, sin librerías externas)
export const ICON_CHOICES = [
  '📁', '📋', '🚀', '💡', '🎯', '📊', '🔥', '⭐',
  '🏠', '💼', '🎨', '📱', '🛠️', '📈', '🗂️', '🧪',
  '🎓', '🏋️', '🌱', '✈️', '🎵', '📚', '🛒', '🎮',
];

export default function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#e5e5ea] hover:border-[#0066cc] transition-colors text-[13px]"
        aria-label="Elegir icono"
      >
        <span className="w-6 h-6 rounded-md bg-[#f5f5f7] flex items-center justify-center text-[14px]">
          {value || '📁'}
        </span>
        <span className="text-[#7a7a7a] text-[12px]">{value ? 'Cambiar icono' : 'Icono'}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-[#e5e5e5] p-2 z-50">
            <div className="flex items-center justify-between px-1 pb-1.5">
              <span className="text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest">
                Icono
              </span>
              {value && (
                <button
                  type="button"
                  onClick={() => { onChange(''); setOpen(false); }}
                  className="flex items-center gap-1 text-[10px] text-[#a0a0a8] hover:text-red-500 transition-colors"
                >
                  <X size={10} />
                  Quitar
                </button>
              )}
            </div>
            <div className="grid grid-cols-8 gap-0.5">
              {ICON_CHOICES.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => { onChange(icon); setOpen(false); }}
                  className={`w-7 h-7 rounded-lg text-[15px] flex items-center justify-center transition-colors ${
                    value === icon ? 'bg-[#e8f0fb] ring-1 ring-[#0066cc]' : 'hover:bg-[#f5f5f7]'
                  }`}
                  aria-label={`Icono ${icon}`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
