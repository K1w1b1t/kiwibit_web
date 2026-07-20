import { COMPANY } from '@/shared/config/company';
import { LegalArticle } from './legal-article';

export function TermsOfUseEn() {
  return (
    <LegalArticle>
      <p>
        These Terms of Use govern access to and use of the {COMPANY.legalName} (CNPJ {COMPANY.cnpj})
        website. By browsing this site, you agree to these terms.
      </p>

      <section>
        <h2>1. Purpose</h2>
        <p>
          This is an informational and institutional website presenting the information security,
          penetration testing (pentest) and AppSec services offered by {COMPANY.name}, as well as
          the team&apos;s content and projects.
        </p>
      </section>

      <section>
        <h2>2. Use of the site</h2>
        <p>
          You agree to use the site lawfully, without attempting to compromise its security,
          availability or integrity. The contact form must be used only for legitimate
          communications.
        </p>
      </section>

      <section>
        <h2>3. Intellectual property</h2>
        <p>
          The brand, logo, texts and visual elements of this site belong to {COMPANY.name}, unless
          otherwise stated. Open-source projects follow the licenses indicated in their respective
          repositories.
        </p>
      </section>

      <section>
        <h2>4. Limitation of liability</h2>
        <p>
          The information on this site is provided &quot;as is&quot;, without warranties. Service
          engagements are formalized through a specific proposal and contract. We are not liable for
          decisions made solely on the basis of the institutional content presented here.
        </p>
      </section>

      <section>
        <h2>5. Data protection</h2>
        <p>
          The processing of personal data is governed by our Privacy Policy, in accordance with the
          Brazilian LGPD.
        </p>
      </section>

      <section>
        <h2>6. Governing law and jurisdiction</h2>
        <p>
          These terms are governed by the laws of the Federative Republic of Brazil. The courts of{' '}
          {COMPANY.city} — {COMPANY.state} are elected to settle any disputes.
        </p>
      </section>

      <section>
        <h2>7. Contact</h2>
        <p>
          Questions about these terms may be sent to{' '}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </p>
      </section>
    </LegalArticle>
  );
}
