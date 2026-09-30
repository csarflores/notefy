import Link from 'next/link';
import {
  CalendarDays,
  Check,
  CodeXml,
  FileText,
  Folder,
  GitFork,
  KanbanSquare,
  ListChecks,
  Users,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logotipo';
import KanbanPreview from './KanbanPreview';

const FEATURES = [
  {
    icon: KanbanSquare,
    title: 'Tableros Kanban',
    desc: 'Arrastra y suelta tareas entre Pendiente, En Proceso y Finalizado. Con etiquetas por color, fechas límite y responsables.',
  },
  {
    icon: Folder,
    title: 'Multiproyecto',
    desc: 'Cada proyecto con sus propios tableros y notas. Cambia de contexto sin perderte entre clientes o temas.',
  },
  {
    icon: FileText,
    title: 'Notas con editor rico',
    desc: 'Documenta ideas con formato completo, tipo Word. Privadas, compartidas o asociadas a un proyecto.',
  },
  {
    icon: Users,
    title: 'Colaboración real',
    desc: 'Invita a tu equipo por correo. Sin tope de miembros ni planes que encarezcan cuando el equipo crece.',
  },
  {
    icon: CalendarDays,
    title: 'Calendario integrado',
    desc: 'Todas tus fechas límite y entregas en una vista de calendario. Nada se te pasa por alto.',
  },
  {
    icon: ListChecks,
    title: 'Mi día',
    desc: 'Una vista priorizada de lo que toca hoy. Y Ctrl+K para buscar y crear desde cualquier pantalla.',
  },
];

const FREE_POINTS = [
  'Proyectos y tableros ilimitados',
  'Miembros ilimitados por correo',
  'Notas con editor de texto rico',
  'Calendario y vista "Mi día"',
  'Código abierto, auditable en GitHub',
  'Sin tarjeta de crédito',
];

const REPO_URL = 'https://github.com/csarflores/notefy';

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#e0e0e0] bg-white/80 backdrop-blur-md dark:border-[#38383a] dark:bg-black/70">
      <nav className="mx-auto flex h-13 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Logo size="small" />
        <div className="flex items-center gap-4 sm:gap-6">
          <a
            href="#funciones"
            className="hidden text-[13px] text-[#3a3a3c] transition-colors hover:text-[#1d1d1f] sm:block"
          >
            Funciones
          </a>
          <a
            href="#codigo-abierto"
            className="hidden text-[13px] text-[#3a3a3c] transition-colors hover:text-[#1d1d1f] sm:block"
          >
            Código abierto
          </a>
          <a
            href="#gratis"
            className="hidden text-[13px] text-[#3a3a3c] transition-colors hover:text-[#1d1d1f] sm:block"
          >
            Precio
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Repositorio en GitHub"
            className="text-[#3a3a3c] transition-colors hover:text-[#1d1d1f]"
          >
            <CodeXml size={16} />
          </a>
          <Link
            href="/auth/login"
            className="text-[13px] text-[#0066cc] transition-colors hover:text-[#0071e3]"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/auth/register"
            className="rounded-full bg-[#0066cc] px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#0071e3]"
          >
            Empezar gratis
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="bg-[#f5f5f7] px-4 pb-16 pt-16 sm:pb-20 sm:pt-24">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-[40px] font-semibold leading-[1.07] tracking-[-0.5px] text-[#1d1d1f] sm:text-[56px]">
          Tus proyectos,
          <br className="hidden sm:block" /> por fin en orden.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-[#7a7a7a] sm:text-[19px]">
          Harold reúne tableros Kanban, notas y calendario en un solo lugar.
          Simple, rápido, gratis y de código abierto.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/auth/register"
            className="w-full rounded-full bg-[#0066cc] px-7 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#0071e3] sm:w-auto"
          >
            Empezar gratis
          </Link>
          <Link
            href="/auth/login"
            className="w-full rounded-full bg-white px-7 py-3 text-[15px] font-medium text-[#0066cc] transition-colors hover:bg-[#f5f5f7] sm:w-auto"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-14 max-w-4xl">
        <KanbanPreview />
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="funciones" className="scroll-mt-20 bg-white px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-[28px] font-semibold tracking-tight text-[#1d1d1f] sm:text-[40px]">
          Todo lo que tu equipo necesita.
          <br className="hidden sm:block" /> Nada que sobre.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-[17px] text-[#7a7a7a]">
          Un espacio de trabajo completo sin la complejidad de las herramientas enterprise.
        </p>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-[18px] bg-[#f5f5f7] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f0fb] text-[#0066cc]">
                <feature.icon size={20} />
              </div>
              <h3 className="mt-4 text-[17px] font-semibold text-[#1d1d1f]">{feature.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#7a7a7a]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DarkTile() {
  const stats = [
    { value: '∞', label: 'Proyectos' },
    { value: '∞', label: 'Miembros por equipo' },
    { value: '∞', label: 'Tableros y notas' },
  ];

  return (
    <section className="bg-[#272729] px-4 py-16 text-center sm:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-[28px] font-semibold tracking-tight text-white sm:text-[40px]">
          Crece sin que te cobren por ello.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-[#cccccc]">
          La mayoría de las herramientas limitan su plan gratuito por usuarios o
          tableros. Harold no. Invita a todo tu equipo y crea cuantos proyectos
          necesites.
        </p>
        <div className="mt-12 grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-[32px] font-semibold text-white sm:text-[48px]">{stat.value}</p>
              <p className="mt-1 text-[12px] text-[#a0a0a8] sm:text-[14px]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OpenSource() {
  const points = [
    'Audita el código completo',
    'Contribuye con issues y pull requests',
    'Aloja tu propia instancia',
  ];

  return (
    <section id="codigo-abierto" className="scroll-mt-20 bg-white px-4 py-16 sm:py-24">
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <p className="flex items-center justify-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-[#0066cc] lg:justify-start">
            <CodeXml size={15} />
            Open source
          </p>
          <h2 className="mt-3 text-[28px] font-semibold tracking-tight text-[#1d1d1f] sm:text-[40px]">
            Abierto por diseño.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[17px] leading-relaxed text-[#7a7a7a] lg:mx-0">
            Harold es un proyecto de código abierto. El código es público:
            míralo, audítalo, mejóralo o aloja tu propia instancia. Es tuyo.
          </p>
          <ul className="mx-auto mt-6 max-w-xs space-y-2.5 text-left lg:mx-0">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-[14px] text-[#3a3a3c]">
                <Check size={16} className="mt-0.5 shrink-0 text-[#0066cc]" />
                {point}
              </li>
            ))}
          </ul>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#e0e0e0] bg-white px-6 py-2.5 text-[15px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
          >
            <GitFork size={16} />
            Ver el repositorio
          </a>
        </div>

        {/* Terminal-style card echoing the hero mockup */}
        <div className="overflow-hidden rounded-2xl bg-[#1d1d1f] shadow-[3px_5px_30px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-1.5 border-b border-[#3a3a3c] px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-[12px] font-medium text-[#98989d]">Terminal</span>
          </div>
          <div className="space-y-3 p-5 font-mono text-[13px] leading-relaxed sm:text-[14px]">
            <p>
              <span className="text-[#6e6e73]">$ </span>
              <span className="text-[#f5f5f7]">git clone https://github.com/csarflores/notefy.git</span>
            </p>
            <p>
              <span className="text-[#6e6e73]">$ </span>
              <span className="text-[#f5f5f7]">cd notefy && npm install</span>
            </p>
            <p>
              <span className="text-[#6e6e73]">$ </span>
              <span className="text-[#f5f5f7]">npm run dev</span>
            </p>
            <p className="text-[#30d158]">✓ Listo en http://localhost:3000</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FreeSection() {
  return (
    <section id="gratis" className="scroll-mt-20 bg-[#f5f5f7] px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f] sm:text-[40px]">
          Gratis. De verdad.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[17px] text-[#7a7a7a]">
          Sin planes ocultos, sin límites de usuarios, sin tarjeta de crédito.
          Harold es un proyecto de código abierto.
        </p>
        <div className="mx-auto mt-10 max-w-md rounded-[18px] border border-[#e0e0e0] bg-white p-8 text-center sm:p-10">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[#0066cc]">Harold</p>
          <p className="mt-2 text-[48px] font-semibold leading-none tracking-tight text-[#1d1d1f]">
            $0
            <span className="ml-2 text-[17px] font-normal text-[#7a7a7a]">/ para siempre</span>
          </p>
          <ul className="mx-auto mt-8 max-w-xs space-y-3 text-left">
            {FREE_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-[14px] text-[#3a3a3c]">
                <Check size={16} className="mt-0.5 shrink-0 text-[#0066cc]" />
                {point}
              </li>
            ))}
          </ul>
          <Link
            href="/auth/register"
            className="mt-8 block w-full rounded-full bg-[#0066cc] px-7 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#0071e3]"
          >
            Crear cuenta gratis
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-[#0066cc] transition-colors hover:text-[#0071e3]"
          >
            <CodeXml size={14} />
            Ver el código en GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-white px-4 py-16 text-center sm:py-24">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f] sm:text-[40px]">
          Empieza a organizar tu trabajo hoy.
        </h2>
        <p className="mt-3 text-[17px] text-[#7a7a7a]">
          Crea tu cuenta en menos de un minuto.
        </p>
        <Link
          href="/auth/register"
          className="mt-8 inline-block rounded-full bg-[#0066cc] px-7 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#0071e3]"
        >
          Empezar gratis
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#e0e0e0] bg-[#f5f5f7] px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Logo size="small" />
        <div className="flex items-center gap-6 text-[12px] text-[#7a7a7a]">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[#1d1d1f]"
          >
            GitHub
          </a>
          <Link href="/auth/login" className="transition-colors hover:text-[#1d1d1f]">
            Iniciar sesión
          </Link>
          <Link href="/auth/register" className="transition-colors hover:text-[#1d1d1f]">
            Crear cuenta
          </Link>
        </div>
        <p className="text-[12px] text-[#a0a0a8]">© {new Date().getFullYear()} Harold</p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main>
        <Hero />
        <Features />
        <DarkTile />
        <OpenSource />
        <FreeSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
