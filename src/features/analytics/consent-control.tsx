'use client';
import { useEffect, useState } from 'react';
import {
  type AnalyticsConsent,
  initializeAnalyticsFromConsent,
  setAnalyticsConsent,
} from '@/shared/lib/analytics';
import type { Dictionary } from '@/shared/i18n/dictionaries/en';

interface AnalyticsConsentControlProps {
  dict: Dictionary['analytics'];
  cookiePolicyHref: string;
}

export function AnalyticsConsentControl({ dict, cookiePolicyHref }: AnalyticsConsentControlProps) {
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
    <aside className="fixed bottom-4 left-4 right-4 z-50" aria-label={dict.preferencesLabel}>
      {decision === undefined || open ? (
        <div
          role="dialog"
          aria-labelledby="analytics-title"
          className="mx-auto max-w-2xl rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-zinc-100 shadow-2xl"
        >
          <strong id="analytics-title">{dict.title}</strong>
          <p className="mt-2 text-sm text-zinc-300">{dict.description}</p>
          <a
            className="mt-3 inline-block text-sm text-emerald-400 underline underline-offset-2"
            href={cookiePolicyHref}
          >
            {dict.cookiePolicyLink}
          </a>
          <div className="mt-3 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className="rounded bg-emerald-500 px-4 py-2 text-black"
              onClick={() => choose('granted')}
            >
              {dict.accept}
            </button>
            <button
              type="button"
              className="rounded border border-zinc-500 px-4 py-2"
              onClick={() => choose('denied')}
            >
              {dict.decline}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="ml-auto block rounded border border-zinc-600 bg-zinc-950 px-3 py-2 text-xs text-white underline"
          onClick={() => setOpen(true)}
        >
          {dict.preferencesLabel}
        </button>
      )}
    </aside>
  );
}
