import { HomeAbout } from '@/widgets/home-about/home-about';
import type { Metadata } from 'next';
import { isLocale } from '@/shared/i18n/config';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { localizedAlternates } from '@/shared/lib/seo';
import { HomeBlog } from '@/widgets/home-blog/home-blog';
import { HomeContact } from '@/widgets/home-contact/home-contact';
import { HomeHero } from '@/widgets/home-hero/home-hero';

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

  return (
    <main>
      <HomeHero locale={locale} dict={dict.hero} radarDict={dict.radar} />
      <HomeAbout locale={locale} dict={dict.about} />
      <HomeBlog locale={locale} dict={dict.blog} />
      <HomeContact dict={dict.contact} />
    </main>
  );
}
