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
          aria-describedby="analytics-description"
          className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-zinc-950/95 text-zinc-100 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur"
        >
          <div className="flex gap-3 p-5 sm:gap-4 sm:p-6">
            <div
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-lg"
            >
              🍪
            </div>
            <div className="min-w-0">
              <strong
                id="analytics-title"
                className="block text-base font-semibold tracking-tight text-white"
              >
                {dict.title}
              </strong>
              <p
                id="analytics-description"
                className="mt-1.5 max-w-xl text-sm leading-6 text-zinc-300"
              >
                {dict.description}
              </p>
              <a
                className="mt-3 inline-flex rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-emerald-300/60 hover:text-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                href={cookiePolicyHref}
              >
                {dict.cookiePolicyLink}
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:justify-end sm:px-5 sm:py-4">
            <button
              type="button"
              className="order-2 min-h-11 rounded-lg border border-zinc-600 px-4 text-sm font-semibold text-white transition hover:border-zinc-400 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 sm:order-1 sm:min-w-36"
              onClick={() => choose('denied')}
            >
              {dict.decline}
            </button>
            <button
              type="button"
              className="order-1 min-h-11 rounded-lg border border-emerald-300 bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 sm:order-2 sm:min-w-36"
              onClick={() => choose('granted')}
            >
              {dict.accept}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="ml-auto flex min-h-10 items-center rounded-full border border-zinc-700 bg-zinc-950/95 px-4 text-xs font-medium text-white shadow-lg backdrop-blur transition hover:border-emerald-300/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          onClick={() => setOpen(true)}
        >
          {dict.preferencesLabel}
        </button>
      )}
    </aside>
  );
}
