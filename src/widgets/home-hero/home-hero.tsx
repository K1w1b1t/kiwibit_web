import type { Locale } from '@/shared/i18n/config';
import type { Dictionary } from '@/shared/i18n/get-dictionary';
import { PillLink } from '@/shared/ui/pill-link';
import { ThreatRadar } from './threat-radar';

interface HomeHeroProps {
  locale: Locale;
  dict: Dictionary['hero'];
  radarDict: Dictionary['radar'];
}

export function HomeHero({ locale, dict, radarDict }: HomeHeroProps) {
  const base = `/${locale}`;

  return (
    <section
      id="home"
      className="architectural-grid relative overflow-hidden px-6 pb-24 pt-16 text-slate-100 sm:px-10 lg:px-16"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.10),transparent_35%),linear-gradient(135deg,#020202_0%,#050505_45%,#090909_100%)]" />

      <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="mb-5 text-xs uppercase tracking-[0.32em] text-accent">{dict.eyebrow}</p>
          <h1 className="max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            {dict.titleLead} <span className="text-accent">{dict.titleAccent}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base text-white/75 sm:text-lg">{dict.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PillLink href={`${base}#products`} variant="accent">
              {dict.primaryCta}
            </PillLink>
            <PillLink href={`${base}#services`} variant="outline">
              {dict.secondaryCta}
            </PillLink>
          </div>
        </div>

        <ThreatRadar dict={radarDict} />
      </div>
    </section>
  );
}
