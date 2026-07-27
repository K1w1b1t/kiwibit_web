import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/shared/i18n/config';
import type { Dictionary } from '@/shared/i18n/get-dictionary';

const CONTACT_EMAIL = 'tech@kiwibit.com.br';

interface SiteFooterProps {
  locale: Locale;
  dict: Dictionary['footer'];
  headerDict: Dictionary['header'];
  year: number;
}

export function SiteFooter({ locale, dict, headerDict, year }: SiteFooterProps) {
  const base = `/${locale}`;
  const navLinks = [
    { href: `${base}#services`, label: headerDict.nav.services },
    { href: `${base}#method`, label: headerDict.nav.method },
    { href: `${base}/projects`, label: headerDict.nav.projects },
    { href: `${base}/blog`, label: headerDict.nav.blog },
    { href: `${base}/team`, label: headerDict.nav.team },
    { href: `${base}#contact`, label: headerDict.nav.contact },
  ];

  return (
    <footer className="border-t border-white/10 bg-black px-6 py-14 text-white sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/kiwi.png" alt="" width={32} height={32} className="rounded" />
            <span className="text-sm font-semibold uppercase tracking-[0.25em]">
              {headerDict.brand}
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-white/60">{dict.blurb}</p>
        </div>

        <nav aria-label={dict.navTitle}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            {dict.navTitle}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            {navLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-accent">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            {dict.legalTitle}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            <li>
              <Link href={`${base}/privacy-policy`} className="transition hover:text-accent">
                {dict.privacy}
              </Link>
            </li>
            <li>
              <Link href={`${base}/terms-of-use`} className="transition hover:text-accent">
                {dict.terms}
              </Link>
            </li>
          </ul>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            {dict.contactTitle}
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-3 inline-block text-sm text-white/70 transition hover:text-accent"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40">
        <p>
          © {year} {headerDict.brand}. {dict.rights}
        </p>
        {/* Internal area — not locale-prefixed: /login is excluded from locale negotiation. */}
        <Link
          href="/login"
          className="font-semibold uppercase tracking-[0.12em] transition hover:text-accent"
        >
          {dict.login}
        </Link>
      </div>
    </footer>
  );
}
