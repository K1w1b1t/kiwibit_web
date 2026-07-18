import type { Dictionary } from '@/shared/i18n/get-dictionary';
import { SectionHeading } from '@/shared/ui/section-heading';

interface HomeMethodProps {
  dict: Dictionary['method'];
}

export function HomeMethod({ dict }: HomeMethodProps) {
  return (
    <section
      id="method"
      className="scroll-mt-20 bg-[#030303] px-6 py-20 text-white sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow={dict.eyebrow} title={dict.title} description={dict.description} />

        <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {dict.steps.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-white/12 bg-white/[0.03] p-6">
              <span className="font-mono text-sm text-accent">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-white/70">{step.description}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 rounded-2xl border border-white/12 bg-white/[0.02] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            {dict.principlesTitle}
          </p>
          <ul className="mt-4 flex flex-wrap gap-3">
            {dict.principles.map((principle) => (
              <li
                key={principle}
                className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.12em] text-white/70"
              >
                {principle}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
