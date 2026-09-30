import { Calendar, Check } from 'lucide-react';

interface PreviewCard {
  title: string;
  tag: string;
  due?: string;
  initials?: string;
  done?: boolean;
}

interface PreviewColumn {
  name: string;
  dot: string;
  cards: PreviewCard[];
}

const TAG_STYLES: Record<string, string> = {
  'Diseño': 'bg-[#e8f0fb] text-[#0066cc]',
  'Desarrollo': 'bg-[#e6f9ec] text-[#1a7a33]',
  'Producto': 'bg-[#f0f0f2] text-[#7a7a7a]',
  'Docs': 'bg-[#fff4e0] text-[#b36400]',
};

const COLUMNS: PreviewColumn[] = [
  {
    name: 'Pendiente',
    dot: 'bg-[#c7c7cc]',
    cards: [
      { title: 'Diseñar la landing de lanzamiento', tag: 'Diseño', due: '3 oct', initials: 'CF' },
      { title: 'Definir el roadmap del Q4', tag: 'Producto', initials: 'MG' },
    ],
  },
  {
    name: 'En Proceso',
    dot: 'bg-[#0066cc]',
    cards: [
      { title: 'Integrar autenticación con Google', tag: 'Desarrollo', due: 'Hoy', initials: 'JR' },
      { title: 'Documentar la API pública', tag: 'Docs', initials: 'AL' },
    ],
  },
  {
    name: 'Finalizado',
    dot: 'bg-[#34c759]',
    cards: [
      { title: 'Configurar el repositorio', tag: 'Desarrollo', done: true },
      { title: 'Logo e identidad de marca', tag: 'Diseño', done: true },
    ],
  },
];

// Static CSS mockup of a Harold board, used as the hero "product shot".
export default function KanbanPreview() {
  return (
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-[#e0e0e0] bg-white text-left shadow-[3px_5px_30px_rgba(0,0,0,0.22)]">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 border-b border-[#f0f0f2] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-[12px] font-medium text-[#7a7a7a]">Harold · Lanzamiento</span>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[540px] grid-cols-3 gap-3 p-4">
          {COLUMNS.map((column) => (
            <div key={column.name} className="rounded-xl bg-[#f5f5f7] p-3">
              <div className="mb-3 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${column.dot}`} />
                <span className="text-[12px] font-semibold text-[#1d1d1f]">{column.name}</span>
                <span className="ml-auto text-[11px] text-[#a0a0a8]">{column.cards.length}</span>
              </div>
              <div className="space-y-2">
                {column.cards.map((card) => (
                  <div
                    key={card.title}
                    className="rounded-lg border border-[#e0e0e0] bg-white p-3 shadow-sm"
                  >
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${TAG_STYLES[card.tag]}`}>
                      {card.tag}
                    </span>
                    <p className={`mt-1.5 text-[13px] font-medium leading-snug text-[#1d1d1f] ${card.done ? 'line-through opacity-60' : ''}`}>
                      {card.title}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      {card.done ? (
                        <span className="flex items-center gap-1 text-[11px] text-[#1a7a33]">
                          <Check size={11} />
                          Hecho
                        </span>
                      ) : card.due ? (
                        <span className="flex items-center gap-1 text-[11px] text-[#7a7a7a]">
                          <Calendar size={11} />
                          {card.due}
                        </span>
                      ) : (
                        <span />
                      )}
                      {card.initials && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0066cc] text-[9px] font-semibold text-white">
                          {card.initials}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
