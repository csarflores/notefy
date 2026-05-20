import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
  getUserTasksWithDeliveryDate,
  getUpcomingTasks,
  getOverdueTasks,
} from "@/actions/calendar-actions";
import CalendarClient from "./CalendarClient";
import TabSyncer from "@/components/tabs/TabSyncer";

async function CalendarData({ userId }: { userId: string }) {
  const [tasksResult, upcomingResult, overdueResult] = await Promise.all([
    getUserTasksWithDeliveryDate(userId),
    getUpcomingTasks(userId, 7),
    getOverdueTasks(userId),
  ]);

  if (
    !tasksResult.success ||
    !upcomingResult.success ||
    !overdueResult.success
  ) {
    return (
      <div className="text-center py-12">
        <p className="text-[#7a7a7a]">
          Error al cargar las tareas del calendario
        </p>
      </div>
    );
  }

  return (
    <CalendarClient
      initialTasks={tasksResult.data || []}
      upcomingTasks={upcomingResult.data || []}
      overdueTasks={overdueResult.data || []}
      userId={userId}
    />
  );
}

function CalendarLoading() {
  return (
    <div className="bg-white rounded-xl border border-[#e0e0e0] p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[#f5f5f7] rounded-lg w-1/4" />
        <div className="h-96 bg-[#f5f5f7] rounded-lg" />
      </div>
    </div>
  );
}

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="w-full flex flex-col min-h-full">
      <TabSyncer id="calendar" type="calendar" title="Calendario" url="/calendar" />
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 lg:py-6">
        <div className="mb-4">
          <h1 className="text-[20px] sm:text-[24px] font-semibold text-[#1d1d1f] tracking-tight">
            Calendario de Tareas
          </h1>
          <p className="text-[13px] text-[#6b7280] mt-0.5">
            Visualiza y gestiona tus tareas por fecha de entrega
          </p>
        </div>

        <Suspense fallback={<CalendarLoading />}>
          <CalendarData userId={session.user.id} />
        </Suspense>
      </div>
    </div>
  );
}
