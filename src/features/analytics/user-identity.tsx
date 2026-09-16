'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { identifyAnalyticsUser, resetAnalyticsUser } from '@/shared/lib/analytics';
export function AnalyticsUserIdentity() {
  const { data, status } = useSession();
  useEffect(() => {
    const identify = () => {
      if (status === 'authenticated' && data.user.id) identifyAnalyticsUser(data.user.id);
    };
    identify();
    window.addEventListener('analytics-consent-granted', identify);
    if (status === 'unauthenticated') resetAnalyticsUser();
    return () => window.removeEventListener('analytics-consent-granted', identify);
  }, [data?.user.id, status]);
  return null;
}
