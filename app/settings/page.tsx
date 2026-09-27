import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserById } from '@/actions/user-actions';
import SettingsClient from './SettingsClient';
import TabSyncer from '@/components/tabs/TabSyncer';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  const result = await getUserById(session.user.id);

  if (!result.success || !result.data) {
    redirect('/dashboard');
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <TabSyncer id="settings" type="settings" title="Mi cuenta" url="/settings" />
      <h1 className="text-[20px] sm:text-[24px] font-semibold text-[#1d1d1f] tracking-tight mb-6">
        Mi cuenta
      </h1>
      <SettingsClient user={result.data} />
    </div>
  );
}
