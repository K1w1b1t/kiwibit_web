'use client';

import { SessionProvider } from 'next-auth/react';
import { AnalyticsUserIdentity } from '@/features/analytics/user-identity';

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SessionProvider>
      <AnalyticsUserIdentity />
      {children}
    </SessionProvider>
  );
}
