'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { NotificationProvider } from '@/components/ui/NotificationContext';
import { TabProvider } from '@/components/tabs/TabContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <NotificationProvider>
        <TabProvider>
          {children}
        </TabProvider>
      </NotificationProvider>
    </SessionProvider>
  );
}
