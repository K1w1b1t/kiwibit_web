'use client';

import Link from 'next/link';
import { useHighlightedMembers } from '@/features/home/model/use-public-highlights';
import type { Locale } from '@/shared/i18n/config';
import type { Dictionary } from '@/shared/i18n/get-dictionary';

interface HomeTeamProps {
  locale: Locale;
  dict: Dictionary['team'];
}

function TeamLoadingState() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <article
          key={`member-skeleton-${index}`}
          className="animate-pulse rounded-2xl border border-white/15 bg-white/5 p-5"
        >
          <div className="h-14 w-14 rounded-full bg-white/20" />
          <div className="mt-4 h-6 w-2/3 rounded bg-white/20" />
          <div className="mt-3 h-4 w-full rounded bg-white/20" />
          <div className="mt-2 h-4 w-4/6 rounded bg-white/20" />
          <div className="mt-5 h-8 w-28 rounded-full bg-white/20" />
        </article>
      ))}
    </div>
  );
}

function getInitials(name: string): string {
  const tokens = name.trim().split(/\s+/);
  return tokens
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? '')
    .join('');
}

export function HomeTeam({ locale, dict }: HomeTeamProps) {
  const { items, isLoading, error } = useHighlightedMembers(6);

  return (
    <section
      id="team"
      className="scroll-mt-20 bg-[#050505] px-6 py-20 text-white sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
              {dict.eyebrow}
            </p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.03em] sm:text-4xl">
              {dict.title}
            </h2>
          </div>
          <Link
            href={`/${locale}/team`}
            className="rounded-full border border-white/25 px-5 py-2 text-sm font-medium uppercase tracking-[0.1em] text-white/80 transition hover:border-white/70 hover:text-white"
          >
            {dict.viewAll}
          </Link>
        </div>

        {isLoading && <TeamLoadingState />}

        {!isLoading && error && (
          <div className="rounded-2xl border border-amber-300/40 bg-amber-500/10 p-5 text-sm text-amber-100">
            {dict.error}
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-white/15 bg-white/5 p-8 text-center text-white/75">
            {dict.empty}
          </div>
        )}

        {!isLoading && !error && items.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((member) => (
              <article
                key={member.id}
                id={`member-${member.id}`}
                className="flex h-full flex-col rounded-2xl border border-white/15 bg-white/5 p-5"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black text-sm font-semibold text-white">
                  {getInitials(member.name)}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-white">{member.name}</h3>
                <p className="mt-2 flex-1 text-sm text-white/70">
                  {member.bio || dict.labels.noBio}
                </p>
                <Link
                  href={`/${locale}/team#member-${member.id}`}
                  className="mt-5 inline-flex w-fit rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/80 transition hover:border-white/80 hover:text-white"
                >
                  {dict.labels.openProfile}
                </Link>
              </article>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-accent/30 bg-accent-soft p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">{dict.join.title}</h3>
            <p className="mt-2 max-w-xl text-sm text-white/70">{dict.join.description}</p>
          </div>
          <Link
            href={`/${locale}#contact`}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-black transition hover:bg-accent/85"
          >
            {dict.join.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
