export const locales = ['pt', 'en'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'pt';

export const LOCALE_COOKIE = 'NEXT_LOCALE';

/** Maps an app locale to the value used in the <html lang> attribute. */
export const htmlLang: Record<Locale, string> = {
  pt: 'pt-BR',
  en: 'en',
};

/** Maps an app locale to the Open Graph locale value. */
export const ogLocale: Record<Locale, string> = {
  pt: 'pt_BR',
  en: 'en_US',
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
