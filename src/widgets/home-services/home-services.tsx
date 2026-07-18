import type { Dictionary } from '@/shared/i18n/get-dictionary';
import { SectionHeading } from '@/shared/ui/section-heading';

interface HomeServicesProps {
  dict: Dictionary['services'];
}

export function HomeServices({ dict }: HomeServicesProps) {
  return (
    <section
      id="services"
      className="matrix-grid-texture scroll-mt-20 bg-[#050505] px-6 py-20 text-white sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow={dict.eyebrow} title={dict.title} description={dict.description} />

        <div className="grid gap-5 md:grid-cols-3">
          {dict.items.map((item) => (
            <article
              key={item.title}
              className="flex h-full flex-col rounded-2xl border border-white/12 bg-white/[0.03] p-6 transition hover:border-accent/40"
            >
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-3 flex-1 text-sm text-white/70">{item.description}</p>
              <ul className="mt-5 space-y-2 text-sm text-white/60">
                {item.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
