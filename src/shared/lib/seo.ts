import type { Metadata } from 'next';
import { COMPANY } from '@/shared/config/company';
import { defaultLocale, locales, type Locale } from '@/shared/i18n/config';

const FALLBACK_SITE_URL = 'https://www.kiwibit.com.br';

/** Absolute site origin, without trailing slash. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL;
  return raw.replace(/\/+$/, '');
}

/** Builds an absolute URL for a given path (path must start with '/'). */
export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

const HREFLANG: Record<Locale, string> = {
  pt: 'pt-BR',
  en: 'en',
};

/**
 * Produces canonical + hreflang alternates for a localized page.
 * `path` is the locale-agnostic suffix (e.g. '' for home, '/projects').
 */
export function localizedAlternates(locale: Locale, path: string): Metadata['alternates'] {
  const suffix = path === '/' ? '' : path;
  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[HREFLANG[loc]] = `/${loc}${suffix}`;
  }
  languages['x-default'] = `/${defaultLocale}${suffix}`;

  return {
    canonical: `/${locale}${suffix}`,
    languages,
  };
}

interface JsonLd {
  '@context': 'https://schema.org';
  '@type': string;
  [key: string]: unknown;
}

export function organizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: COMPANY.name,
    legalName: COMPANY.legalName,
    url: siteUrl(),
    logo: absoluteUrl('/kiwi.png'),
    email: COMPANY.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: COMPANY.city,
      addressRegion: COMPANY.state,
      addressCountry: COMPANY.country,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: COMPANY.email,
      contactType: 'sales',
    },
  };
}

export function websiteJsonLd(locale: Locale): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: COMPANY.name,
    url: absoluteUrl(`/${locale}`),
    inLanguage: HREFLANG[locale],
  };
}

export function professionalServiceJsonLd(locale: Locale, description: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: COMPANY.name,
    url: absoluteUrl(`/${locale}`),
    email: COMPANY.email,
    description,
    areaServed: COMPANY.country,
    serviceType: ['Information security consulting', 'Penetration testing', 'Application security'],
  };
}
