import { COMPANY } from '@/shared/config/company';
import { LegalArticle } from './legal-article';

export function PrivacyPolicyPt() {
  return (
    <LegalArticle>
      <p>
        Esta Política de Privacidade descreve como a {COMPANY.legalName}, inscrita no CNPJ{' '}
        {COMPANY.cnpj} (&quot;{COMPANY.name}&quot;, &quot;nós&quot;), coleta, utiliza e protege
        dados pessoais, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados —
        LGPD).
      </p>

      <section>
        <h2>1. Controlador dos dados</h2>
        <p>
          O controlador dos dados é a {COMPANY.legalName} (CNPJ {COMPANY.cnpj}), com sede em{' '}
          {COMPANY.city} — {COMPANY.state}. Contato do encarregado pelo tratamento de dados (DPO):{' '}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </p>
      </section>

      <section>
        <h2>2. Dados que coletamos</h2>
        <p>
          Coletamos apenas os dados que você nos fornece voluntariamente por meio do formulário de
          contato:
        </p>
        <ul>
          <li>Nome</li>
          <li>E-mail</li>
          <li>Empresa (opcional)</li>
          <li>Conteúdo da mensagem enviada</li>
        </ul>
        <p>
          Além disso, quando um usuário autenticado do painel administrativo conecta sua própria
          conta do LinkedIn para sincronizar a foto de perfil, podemos receber e processar dados
          básicos do perfil (como identificador único e foto) e armazenar um token de acesso de
          forma cifrada em nosso banco de dados, exclusivamente para a execução dessa
          funcionalidade. Esse processamento é limitado a usuários autenticados da área
          administrativa e não é utilizado como mecanismo de login público.
        </p>
        <p>
          Não utilizamos cookies de rastreamento ou publicidade. Utilizamos apenas um cookie
          funcional (<code>NEXT_LOCALE</code>) para lembrar o idioma escolhido.
        </p>
      </section>

      <section>
        <h2>3. Finalidade e base legal</h2>
        <p>
          Tratamos esses dados para responder ao seu contato, conduzir a comunicação comercial
          solicitada e, quando aplicável, executar a conexão voluntária do usuário com o LinkedIn
          para sincronização de foto de perfil. A base legal é o consentimento e os procedimentos
          preliminares relacionados a um contrato, nos termos do art. 7º da LGPD, bem como o
          consentimento expresso fornecido por meio do fluxo de autorização do LinkedIn.
        </p>
      </section>

      <section>
        <h2>4. Compartilhamento e retenção</h2>
        <p>
          As mensagens do formulário são encaminhadas à nossa equipe por meio de uma notificação
          interna (Discord). Não armazenamos essas mensagens em banco de dados no site e não
          vendemos ou compartilhamos seus dados com terceiros para fins de marketing. Retemos as
          comunicações apenas pelo tempo necessário para atender à sua solicitação.
        </p>
      </section>

      <section>
        <h2>5. Seus direitos (art. 18 da LGPD)</h2>
        <p>Você pode, a qualquer momento, solicitar:</p>
        <ul>
          <li>Confirmação da existência de tratamento;</li>
          <li>Acesso aos seus dados;</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>Eliminação dos dados tratados com base no consentimento;</li>
          <li>Revogação do consentimento.</li>
        </ul>
        <p>
          Para exercer seus direitos, escreva para{' '}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </p>
      </section>

      <section>
        <h2>6. Segurança</h2>
        <p>
          Como empresa de segurança da informação, adotamos medidas técnicas e organizacionais
          adequadas para proteger os dados contra acessos não autorizados, perda ou destruição.
        </p>
      </section>

      <section>
        <h2>7. Alterações</h2>
        <p>
          Esta política pode ser atualizada periodicamente. A data da última atualização é indicada
          no topo desta página.
        </p>
      </section>
    </LegalArticle>
  );
}
