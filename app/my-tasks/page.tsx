import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getMyTasks } from '@/actions/dashboard-actions';
import MyTasksClient from './MyTasksClient';
import TabSyncer from '@/components/tabs/TabSyncer';

async function MyTasksData() {
  const result = await getMyTasks();

  if (!result.success) {
    return (
      <div className="text-center py-12">
        <p className="text-[#7a7a7a]">Error al cargar tus tareas</p>
      </div>
    );
  }

  return <MyTasksClient initialTasks={result.data || []} />;
}

function MyTasksLoading() {
  return (
    <div className="bg-white rounded-xl border border-[#e0e0e0] p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[#f5f5f7] rounded-lg w-1/4" />
        <div className="h-64 bg-[#f5f5f7] rounded-lg" />
      </div>
    </div>
  );
}

export default async function MyTasksPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  return (
    <div className="w-full flex flex-col min-h-full">
      <TabSyncer id="my-tasks" type="calendar" title="Mis tareas" url="/my-tasks" />
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5 lg:py-6">
        <div className="mb-4">
          <h1 className="text-[20px] sm:text-[24px] font-semibold text-[#1d1d1f] tracking-tight">
            Mis tareas
          </h1>
          <p className="text-[13px] text-[#6b7280] mt-0.5">
            Todas las tareas asignadas a ti, en todos los tableros
          </p>
        </div>

        <Suspense fallback={<MyTasksLoading />}>
          <MyTasksData />
        </Suspense>
      </div>
    </div>
  );
}
