import { COMPANY } from '@/shared/config/company';
import { LegalArticle } from './legal-article';

export function PrivacyPolicyEn() {
  return (
    <LegalArticle>
      <p>
        This Privacy Policy describes how {COMPANY.legalName}, registered under CNPJ {COMPANY.cnpj}{' '}
        (&quot;{COMPANY.name}&quot;, &quot;we&quot;), collects, uses and protects personal data, in
        accordance with Brazilian Law No. 13.709/2018 (General Data Protection Law — LGPD).
      </p>

      <section>
        <h2>1. Data controller</h2>
        <p>
          The data controller is {COMPANY.legalName} (CNPJ {COMPANY.cnpj}), based in {COMPANY.city}{' '}
          — {COMPANY.state}, Brazil. Data Protection Officer (DPO) contact:{' '}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </p>
      </section>

      <section>
        <h2>2. Data we collect</h2>
        <p>We only collect the data you voluntarily provide through the contact form:</p>
        <ul>
          <li>Name</li>
          <li>Email</li>
          <li>Company (optional)</li>
          <li>The content of the message you send</li>
        </ul>
        <p>
          In addition, when an authenticated user from the administrative panel connects their own
          LinkedIn account to sync their profile photo, we may receive and process basic profile
          data (such as a unique identifier and photo) and store an access token encrypted in our
          database solely for the execution of that feature. This processing is limited to
          authenticated users of the administrative area and is not used as a public login
          mechanism.
        </p>
        <p>
          We do not use tracking or advertising cookies. We only use one functional cookie (
          <code>NEXT_LOCALE</code>) to remember your language preference.
        </p>
      </section>

      <section>
        <h2>3. Purpose and legal basis</h2>
        <p>
          We process this data to respond to your contact, carry out the requested business
          communication, and, where applicable, execute the user’s voluntary connection with
          LinkedIn for profile photo synchronization. The legal basis is your consent and
          pre-contractual procedures, under Article 7 of the LGPD, as well as the express consent
          provided through the LinkedIn authorization flow.
        </p>
      </section>

      <section>
        <h2>4. Sharing and retention</h2>
        <p>
          Contact form messages are forwarded to our team through an internal notification
          (Discord). We do not store these messages in a website database and we do not sell or
          share your data with third parties for marketing purposes. We retain communications only
          for as long as necessary to handle your request.
        </p>
      </section>

      <section>
        <h2>5. Your rights (Article 18, LGPD)</h2>
        <p>At any time, you may request:</p>
        <ul>
          <li>Confirmation that processing exists;</li>
          <li>Access to your data;</li>
          <li>Correction of incomplete, inaccurate or outdated data;</li>
          <li>Anonymization, blocking or deletion of unnecessary data;</li>
          <li>Deletion of data processed based on consent;</li>
          <li>Withdrawal of consent.</li>
        </ul>
        <p>
          To exercise your rights, write to <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </p>
      </section>

      <section>
        <h2>6. Security</h2>
        <p>
          As an information security company, we apply appropriate technical and organizational
          measures to protect data against unauthorized access, loss or destruction.
        </p>
      </section>

      <section>
        <h2>7. Changes</h2>
        <p>
          This policy may be updated periodically. The date of the last update is shown at the top
          of this page.
        </p>
      </section>
    </LegalArticle>
  );
}
