import type { Metadata } from 'next';
import { isLocale } from '@/shared/i18n/config';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { localizedAlternates } from '@/shared/lib/seo';
import { HomeTeam } from '@/widgets/home-team/home-team';

export const dynamic = 'force-static';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return {};
  }
  const dict = getDictionary(locale);
  return {
    title: dict.meta.team.title,
    description: dict.meta.team.description,
    alternates: localizedAlternates(locale, '/team'),
  };
}

export default async function TeamPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return null;
  }
  const dict = getDictionary(locale);

  return (
    <main>
      <section className="bg-black px-6 pb-4 pt-16 text-white sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs uppercase tracking-[0.28em] text-accent">{dict.team.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.03em] sm:text-5xl">
            {dict.team.title}
          </h1>
          <p className="mt-4 max-w-3xl text-white/70">{dict.team.subtitle}</p>
        </div>
      </section>
      <HomeTeam locale={locale} dict={dict.team} showHeader={false} />
    </main>
  );
}
