import type { MetadataRoute } from 'next';
import { locales } from '@/shared/i18n/config';
import { absoluteUrl } from '@/shared/lib/seo';

interface RouteDef {
  path: string;
  priority: number;
}

const ROUTES: RouteDef[] = [
  { path: '', priority: 1 },
  { path: '/projects', priority: 0.7 },
  { path: '/blog', priority: 0.7 },
  { path: '/team', priority: 0.7 },
  { path: '/privacy-policy', priority: 0.3 },
  { path: '/terms-of-use', priority: 0.3 },
];

const HREFLANG: Record<(typeof locales)[number], string> = {
  pt: 'pt-BR',
  en: 'en',
};

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-07-18');

  return ROUTES.flatMap((route) => {
    const languages: Record<string, string> = {};
    for (const locale of locales) {
      languages[HREFLANG[locale]] = absoluteUrl(`/${locale}${route.path}`);
    }
    languages['x-default'] = absoluteUrl(`/pt${route.path}`);

    return locales.map((locale) => ({
      url: absoluteUrl(`/${locale}${route.path}`),
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: route.priority,
      alternates: { languages },
    }));
  });
}
