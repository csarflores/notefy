import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getTrashItems } from '@/actions/trash-actions';
import TrashClient from './TrashClient';
import TabSyncer from '@/components/tabs/TabSyncer';

export default async function TrashPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  const result = await getTrashItems();
  const items = result.success ? (result.data || []) : [];

  return (
    <div className="w-full flex flex-col min-h-full">
      <TabSyncer id="trash" type="dashboard" title="Papelera" url="/trash" />
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 lg:py-6">
        <div className="mb-4">
          <h1 className="text-[20px] sm:text-[24px] font-semibold text-[#1d1d1f] tracking-tight">
            Papelera
          </h1>
          <p className="text-[13px] text-[#6b7280] mt-0.5">
            Los elementos eliminados se pueden restaurar o borrar definitivamente
          </p>
        </div>

        <TrashClient items={items} />
      </div>
    </div>
  );
}
