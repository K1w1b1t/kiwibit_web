import Image from 'next/image';
import Link from 'next/link';
import { LocaleSwitcher } from '@/features/locale-switch/ui/locale-switcher';
import type { Locale } from '@/shared/i18n/config';
import type { Dictionary } from '@/shared/i18n/get-dictionary';

interface SiteHeaderProps {
  locale: Locale;
  dict: Dictionary['header'];
}

export function SiteHeader({ locale, dict }: SiteHeaderProps) {
  const base = `/${locale}`;
  const links = [
    { href: `${base}#services`, label: dict.nav.services },
    { href: `${base}#method`, label: dict.nav.method },
    { href: `${base}/projects`, label: dict.nav.projects },
    { href: `${base}/blog`, label: dict.nav.blog },
    { href: `${base}/team`, label: dict.nav.team },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3 sm:px-10 lg:px-16">
        <Link href={base} className="flex items-center gap-3" aria-label={dict.brand}>
          <Image src="/kiwi.png" alt="" width={30} height={30} className="rounded" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/90">
            {dict.brand}
          </span>
        </Link>

        <nav className="hidden flex-wrap items-center gap-1 md:flex">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher current={locale} label={dict.localeLabel} />
          <Link
            href={`${base}#contact`}
            className="hidden rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-black transition hover:bg-accent/85 sm:inline-flex"
          >
            {dict.cta}
          </Link>
        </div>
      </div>
    </header>
  );
}
