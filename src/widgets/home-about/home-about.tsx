import Image from 'next/image';
import type { Locale } from '@/shared/i18n/config';
import type { Dictionary } from '@/shared/i18n/get-dictionary';
import { PillLink } from '@/shared/ui/pill-link';
import { SectionHeading } from '@/shared/ui/section-heading';

export function HomeAbout({ locale, dict }: { locale: Locale; dict: Dictionary['about'] }) {
  const region = process.env.OCI_STORAGE_REGION || 'sa-saopaulo-1';
  const namespace = process.env.OCI_STORAGE_NAMESPACE || 'gr8jqsbktuzk';
  const bucket = process.env.OCI_STORAGE_BUCKET || 'kiwibit-media-staging';
  const base = `https://objectstorage.${region}.oraclecloud.com/n/${namespace}/b/${bucket}/o/team/issue-118`;
  return (
    <section id="team" className="scroll-mt-20 px-6 py-20 text-white sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow={dict.eyebrow} title={dict.title} description={dict.description} />
        <p className="mb-10 max-w-3xl text-lg leading-relaxed text-white/75">{dict.practice}</p>
        <div className="grid items-start gap-6 md:grid-cols-2">
          {['team-outside-tse-v1.webp', 'team-laboratory-tse-v1.webp'].map((name, index) => (
            <figure key={name}>
              <Image
                src={`${base}/${name}`}
                alt={dict.photos[index]}
                width={1600}
                height={index === 0 ? 1200 : 1066}
                sizes="(max-width: 767px) 100vw, 50vw"
                className="h-auto w-full rounded-2xl border border-white/15"
              />
              <figcaption className="mt-3 text-sm leading-relaxed text-white/60">
                {dict.photos[index]}
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-6 text-sm text-white/65">{dict.visit}</p>
        <div className="mt-10 grid gap-8 rounded-3xl border border-accent/30 bg-accent-soft p-6 sm:p-10 md:grid-cols-2">
          <p className="leading-relaxed text-white/80">{dict.values}</p>
          <div>
            <p className="mb-6 leading-relaxed text-white/80">{dict.join}</p>
            <div className="flex flex-wrap gap-3">
              <PillLink href={`/${locale}#contact`} variant="accent">
                {dict.cta}
              </PillLink>
              <PillLink href={`/${locale}/team`} variant="outline">
                {dict.members}
              </PillLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
