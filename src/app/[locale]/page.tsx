import type { Metadata } from 'next';
import { isLocale } from '@/shared/i18n/config';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { localizedAlternates, professionalServiceJsonLd } from '@/shared/lib/seo';
import { HomeBlog } from '@/widgets/home-blog/home-blog';
import { HomeContact } from '@/widgets/home-contact/home-contact';
import { HomeHero } from '@/widgets/home-hero/home-hero';
import { HomeMethod } from '@/widgets/home-method/home-method';
import { HomeProjectsTeaser } from '@/widgets/home-projects-teaser/home-projects-teaser';
import { HomeServices } from '@/widgets/home-services/home-services';
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
  // Home keeps the layout's brand-inclusive default title (the %s template only
  // applies to child segments, not this one). We only refine the description.
  return {
    description: dict.meta.home.description,
    alternates: localizedAlternates(locale, '/'),
  };
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return null;
  }
  const dict = getDictionary(locale);
  const jsonLd = professionalServiceJsonLd(locale, dict.meta.home.description);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeHero locale={locale} dict={dict.hero} radarDict={dict.radar} />
      <HomeProjectsTeaser locale={locale} dict={dict.projectsTeaser} />
      <HomeServices dict={dict.services} />
      <HomeMethod dict={dict.method} />
      <HomeBlog locale={locale} dict={dict.blog} />
      <HomeTeam locale={locale} dict={dict.team} />
      <HomeContact dict={dict.contact} />
    </main>
  );
}
