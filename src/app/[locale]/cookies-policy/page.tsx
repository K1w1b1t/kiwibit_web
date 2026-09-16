import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { COMPANY } from '@/shared/config/company';
import { isLocale } from '@/shared/i18n/config';
import { localizedAlternates } from '@/shared/lib/seo';
import { LegalArticle } from '@/widgets/legal-content/legal-article';

export const dynamic = 'force-static';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: locale === 'pt' ? 'Política de Cookies' : 'Cookie Policy',
    description:
      locale === 'pt'
        ? 'Como a Kiwibit usa cookies essenciais e opcionais.'
        : 'How Kiwibit uses essential and optional cookies.',
    alternates: localizedAlternates(locale, '/cookies-policy'),
  };
}

export default async function CookiesPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const portuguese = locale === 'pt';

  return (
    <main className="bg-black px-6 py-16 text-white sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-black uppercase tracking-[-0.03em] sm:text-4xl">
          {portuguese ? 'Política de Cookies' : 'Cookie Policy'}
        </h1>
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/50">
          {portuguese ? 'Última atualização' : 'Last updated'}: 16/09/2026
        </p>
        <div className="mt-10">
          <LegalArticle>
            <p>
              {portuguese
                ? `A ${COMPANY.legalName} usa cookies para manter o site funcionando e, somente com sua autorização, entender o uso e corrigir problemas.`
                : `${COMPANY.legalName} uses cookies to keep this website working and, only with your permission, understand usage and fix problems.`}
            </p>
            <section>
              <h2>{portuguese ? 'Cookies essenciais' : 'Essential cookies'}</h2>
              <p>
                {portuguese
                  ? 'São necessários para recursos básicos, como lembrar o idioma escolhido. Eles não dependem do consentimento para cookies opcionais.'
                  : 'They are needed for basic features, such as remembering your language choice. They do not depend on consent for optional cookies.'}
              </p>
            </section>
            <section>
              <h2>{portuguese ? 'Cookies opcionais' : 'Optional cookies'}</h2>
              <p>
                {portuguese
                  ? 'Ajudam a entender quais páginas e recursos funcionam bem e a identificar falhas. Eles só são ativados após sua aceitação, não são usados para publicidade e podem ser recusados sem afetar os recursos essenciais.'
                  : 'They help us understand which pages and features work well and identify failures. They are enabled only after acceptance, are not used for advertising, and can be declined without affecting essential features.'}
              </p>
            </section>
            <section>
              <h2>{portuguese ? 'Sua escolha' : 'Your choice'}</h2>
              <p>
                {portuguese
                  ? 'Você pode aceitar, recusar ou alterar sua decisão em “Preferências de cookies”. A sua escolha é guardada por até 180 dias.'
                  : 'You can accept, decline, or change your decision through “Cookie preferences”. Your choice is stored for up to 180 days.'}
              </p>
            </section>
            <section>
              <h2>{portuguese ? 'Contato' : 'Contact'}</h2>
              <p>
                {portuguese ? 'Para dúvidas, escreva para ' : 'For questions, contact '}
                <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
              </p>
            </section>
          </LegalArticle>
        </div>
      </div>
    </main>
  );
}
