'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { identifyAnalyticsUser, resetAnalyticsUser } from '@/shared/lib/analytics';
export function AnalyticsUserIdentity() {
  const { data, status } = useSession();
  useEffect(() => {
    if (status === 'authenticated' && data.user.id) identifyAnalyticsUser(data.user.id);
    if (status === 'unauthenticated') resetAnalyticsUser();
  }, [data?.user.id, status]);
  return null;
}
