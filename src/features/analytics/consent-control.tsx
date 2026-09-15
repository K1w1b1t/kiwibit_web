'use client';
import { useEffect, useState } from 'react';
import {
  type AnalyticsConsent,
  initializeAnalyticsFromConsent,
  setAnalyticsConsent,
} from '@/shared/lib/analytics';
export function AnalyticsConsentControl() {
  const [decision, setDecision] = useState<AnalyticsConsent>();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setDecision(initializeAnalyticsFromConsent()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const choose = (value: AnalyticsConsent) => {
    setAnalyticsConsent(value);
    setDecision(value);
    setOpen(false);
  };
  return (
    <aside className="fixed bottom-4 left-4 right-4 z-50" aria-label="Privacy preferences">
      {decision === undefined || open ? (
        <div
          role="dialog"
          aria-labelledby="analytics-title"
          className="mx-auto max-w-2xl rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-zinc-100 shadow-2xl"
        >
          <strong id="analytics-title">Analytics and private session replay</strong>
          <p className="mt-2 text-sm text-zinc-300">
            With your permission, PostHog helps us understand usage and fix errors. All text and
            inputs are masked. You can change this choice at any time.
          </p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              className="rounded bg-emerald-500 px-4 py-2 text-black"
              onClick={() => choose('granted')}
            >
              Accept
            </button>
            <button
              type="button"
              className="rounded border border-zinc-500 px-4 py-2"
              onClick={() => choose('denied')}
            >
              Decline
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="ml-auto block rounded border border-zinc-600 bg-zinc-950 px-3 py-2 text-xs text-white underline"
          onClick={() => setOpen(true)}
        >
          Privacy preferences
        </button>
      )}
    </aside>
  );
}
