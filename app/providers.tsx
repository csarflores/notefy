'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { NotificationProvider } from '@/components/ui/NotificationContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </SessionProvider>
  );
}
