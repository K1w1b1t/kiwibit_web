import type { Metadata } from 'next';
import { isLocale } from '@/shared/i18n/config';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { localizedAlternates } from '@/shared/lib/seo';
import { PrivacyPolicyEn } from '@/widgets/legal-content/privacy-policy-en';
import { PrivacyPolicyPt } from '@/widgets/legal-content/privacy-policy-pt';

export const dynamic = 'force-static';

const LAST_UPDATED = '2026-07-18';

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
    title: dict.meta.privacy.title,
    description: dict.meta.privacy.description,
    alternates: localizedAlternates(locale, '/privacy-policy'),
  };
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return null;
  }
  const dict = getDictionary(locale);
  const formattedDate = new Date(LAST_UPDATED).toLocaleDateString(locale === 'pt' ? 'pt-BR' : 'en');

  return (
    <main className="bg-black px-6 py-16 text-white sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-black uppercase tracking-[-0.03em] sm:text-4xl">
          {dict.meta.privacy.title}
        </h1>
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/50">
          {dict.legal.lastUpdated}: {formattedDate}
        </p>
        <div className="mt-10">{locale === 'pt' ? <PrivacyPolicyPt /> : <PrivacyPolicyEn />}</div>
      </div>
    </main>
  );
}
