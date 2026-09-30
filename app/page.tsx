import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import type { Metadata } from 'next';
import { authOptions } from '@/lib/auth';
import LandingPage from '@/components/landing/LandingPage';

export const metadata: Metadata = {
  title: 'Harold — Gestión de proyectos simple y gratis',
  description:
    'Tableros Kanban, notas y calendario en un solo lugar. Gratis, sin límites de usuarios ni de tableros.',
};

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect('/dashboard');
  }

  return <LandingPage />;
}
