import type { Metadata } from 'next';
import { isLocale } from '@/shared/i18n/config';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { localizedAlternates } from '@/shared/lib/seo';
import { HomeProjects } from '@/widgets/home-projects/home-projects';

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
    title: dict.meta.projects.title,
    description: dict.meta.projects.description,
    alternates: localizedAlternates(locale, '/projects'),
  };
}

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return null;
  }
  const dict = getDictionary(locale);

  return (
    <main>
      <section className="bg-black px-6 pb-4 pt-16 text-white sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs uppercase tracking-[0.28em] text-accent">{dict.projects.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.03em] sm:text-5xl">
            {dict.projects.title}
          </h1>
          <p className="mt-4 max-w-3xl text-white/70">{dict.projects.subtitle}</p>
        </div>
      </section>
      <HomeProjects locale={locale} dict={dict.projects} />
    </main>
  );
}
