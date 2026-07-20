'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LOCALE_COOKIE, isLocale, locales, type Locale } from '@/shared/i18n/config';

interface LocaleSwitcherProps {
  current: Locale;
  label: string;
}

function persistLocale(target: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`;
}

function swapLocale(pathname: string, target: Locale): string {
  const segments = pathname.split('/');
  // segments[0] is '' (leading slash); segments[1] is the current locale prefix.
  if (segments.length > 1 && isLocale(segments[1])) {
    segments[1] = target;
  } else {
    segments.splice(1, 0, target);
  }
  const next = segments.join('/');
  return next.length > 0 ? next : `/${target}`;
}

export function LocaleSwitcher({ current, label }: LocaleSwitcherProps) {
  const pathname = usePathname() || `/${current}`;

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-white/20 p-1"
      role="group"
      aria-label={label}
    >
      {locales.map((locale) => {
        const isActive = locale === current;
        return (
          <Link
            key={locale}
            href={swapLocale(pathname, locale)}
            hrefLang={locale}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => persistLocale(locale)}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] transition ${
              isActive ? 'bg-white text-black' : 'text-white/70 hover:text-white'
            }`}
          >
            {locale}
          </Link>
        );
      })}
    </div>
  );
}
