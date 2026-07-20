import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Geist, Geist_Mono } from 'next/font/google';
import { COMPANY } from '@/shared/config/company';
import { htmlLang, isLocale, locales, ogLocale, type Locale } from '@/shared/i18n/config';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { localizedAlternates, organizationJsonLd, siteUrl, websiteJsonLd } from '@/shared/lib/seo';
import { SiteFooter } from '@/widgets/site-footer/site-footer';
import { SiteHeader } from '@/widgets/site-header/site-header';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const dynamicParams = false;

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

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
    metadataBase: new URL(siteUrl()),
    title: {
      default: dict.meta.defaultTitle,
      template: `%s | ${COMPANY.name}`,
    },
    description: dict.meta.defaultDescription,
    keywords: dict.meta.keywords,
    alternates: localizedAlternates(locale, '/'),
    openGraph: {
      siteName: COMPANY.name,
      locale: ogLocale[locale],
      type: 'website',
      url: `/${locale}`,
      title: dict.meta.defaultTitle,
      description: dict.meta.defaultDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.meta.defaultTitle,
      description: dict.meta.defaultDescription,
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  const typedLocale: Locale = locale;
  const dict = getDictionary(typedLocale);
  const year = new Date().getFullYear();

  const jsonLd = [organizationJsonLd(), websiteJsonLd(typedLocale)];

  return (
    <html lang={htmlLang[typedLocale]}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SiteHeader locale={typedLocale} dict={dict.header} />
        {children}
        <SiteFooter locale={typedLocale} dict={dict.footer} headerDict={dict.header} year={year} />
      </body>
    </html>
  );
}
