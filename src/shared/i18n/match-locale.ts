import { defaultLocale, isLocale, locales, type Locale } from './config';

interface WeightedTag {
  tag: string;
  quality: number;
}

/**
 * Negotiates the best-matching supported locale from an Accept-Language header.
 * Hand-rolled (no external dependency) — parses tags, orders by q-value, and
 * returns the first supported locale by primary language subtag.
 */
export function matchLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) {
    return defaultLocale;
  }

  const weighted: WeightedTag[] = acceptLanguage
    .split(',')
    .map((part) => {
      const [rawTag, ...params] = part.trim().split(';');
      const tag = rawTag.trim().toLowerCase();
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const quality = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { tag, quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter((entry) => entry.tag.length > 0 && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of weighted) {
    const primary = tag.split('-')[0];
    if (isLocale(primary)) {
      return primary;
    }
    const supported = locales.find((locale) => primary === locale);
    if (supported) {
      return supported;
    }
  }

  return defaultLocale;
}
