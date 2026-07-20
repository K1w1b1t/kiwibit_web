import { ContactForm } from '@/features/contact/ui/contact-form';
import type { Dictionary } from '@/shared/i18n/get-dictionary';

const CONTACT_EMAIL = 'tech@kiwibit.com.br';

interface HomeContactProps {
  dict: Dictionary['contact'];
}

export function HomeContact({ dict }: HomeContactProps) {
  return (
    <section
      id="contact"
      className="scroll-mt-20 bg-black px-6 py-20 text-slate-100 sm:px-10 lg:px-16"
    >
      <div className="mx-auto grid max-w-6xl gap-10 rounded-3xl border border-white/15 bg-white/[0.03] p-8 backdrop-blur lg:grid-cols-[0.9fr_1.1fr] lg:p-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
            {dict.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase leading-[0.95] tracking-[-0.03em] sm:text-4xl">
            {dict.title}
          </h2>
          <p className="mt-4 max-w-md text-white/70">{dict.description}</p>
          <p className="mt-6 text-sm text-white/60">
            {dict.directEmail}{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent transition hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>

        <ContactForm dict={dict} />
      </div>
    </section>
  );
}
