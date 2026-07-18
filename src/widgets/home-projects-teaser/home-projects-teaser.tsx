import type { Locale } from '@/shared/i18n/config';
import type { Dictionary } from '@/shared/i18n/get-dictionary';
import { PillLink } from '@/shared/ui/pill-link';

interface HomeProjectsTeaserProps {
  locale: Locale;
  dict: Dictionary['projectsTeaser'];
}

export function HomeProjectsTeaser({ locale, dict }: HomeProjectsTeaserProps) {
  return (
    <section className="scroll-mt-20 bg-[#050505] px-6 py-20 text-white sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-br from-white/[0.06] to-transparent p-8 sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          {dict.eyebrow}
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-black uppercase leading-[0.95] tracking-[-0.03em] sm:text-4xl">
          {dict.title}
        </h2>
        <p className="mt-4 max-w-2xl text-base text-white/70">{dict.description}</p>
        <div className="mt-8">
          <PillLink href={`/${locale}/projects`} variant="accent">
            {dict.cta}
          </PillLink>
        </div>
      </div>
    </section>
  );
}
