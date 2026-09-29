'use client';

import { SessionProvider } from 'next-auth/react';
import { MotionConfig } from 'framer-motion';
import { ReactNode } from 'react';
import { NotificationProvider } from '@/components/ui/NotificationContext';
import { TabProvider } from '@/components/tabs/TabContext';
import AppShell from '@/components/layout/AppShell';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {/* Respeta prefers-reduced-motion en todas las animaciones */}
      <MotionConfig reducedMotion="user">
      <NotificationProvider>
        <TabProvider>
          <AppShell>
            {children}
          </AppShell>
        </TabProvider>
      </NotificationProvider>
      </MotionConfig>
    </SessionProvider>
  );
}
