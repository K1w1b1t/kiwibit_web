import { COMPANY } from '@/shared/config/company';
import { LegalArticle } from './legal-article';

export function TermsOfUsePt() {
  return (
    <LegalArticle>
      <p>
        Estes Termos de Uso regem o acesso e a utilização do site da {COMPANY.legalName} (CNPJ{' '}
        {COMPANY.cnpj}). Ao navegar neste site, você concorda com estes termos.
      </p>

      <section>
        <h2>1. Objeto</h2>
        <p>
          Este site tem caráter informativo e institucional, apresentando os serviços de segurança
          da informação, teste de intrusão (pentest) e AppSec oferecidos pela {COMPANY.name}, além
          de conteúdos e projetos da equipe.
        </p>
      </section>

      <section>
        <h2>2. Uso do site</h2>
        <p>
          Você concorda em utilizar o site de forma lícita, sem tentar comprometer sua segurança,
          disponibilidade ou integridade. O formulário de contato deve ser usado apenas para
          comunicações legítimas.
        </p>
      </section>

      <section>
        <h2>3. Propriedade intelectual</h2>
        <p>
          A marca, o logotipo, os textos e os elementos visuais deste site pertencem à{' '}
          {COMPANY.name}, salvo indicação em contrário. Projetos publicados em código aberto seguem
          as licenças indicadas em seus respectivos repositórios.
        </p>
      </section>

      <section>
        <h2>4. Limitação de responsabilidade</h2>
        <p>
          As informações deste site são fornecidas &quot;no estado em que se encontram&quot;, sem
          garantias. A contratação de serviços é formalizada por proposta e contrato específicos.
          Não nos responsabilizamos por decisões tomadas exclusivamente com base no conteúdo
          institucional aqui apresentado.
        </p>
      </section>

      <section>
        <h2>5. Proteção de dados</h2>
        <p>
          O tratamento de dados pessoais é regido pela nossa Política de Privacidade, em
          conformidade com a LGPD.
        </p>
      </section>

      <section>
        <h2>6. Lei aplicável e foro</h2>
        <p>
          Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro
          da comarca de {COMPANY.city} — {COMPANY.state} para dirimir eventuais controvérsias.
        </p>
      </section>

      <section>
        <h2>7. Contato</h2>
        <p>
          Dúvidas sobre estes termos podem ser enviadas para{' '}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </p>
      </section>
    </LegalArticle>
  );
}
