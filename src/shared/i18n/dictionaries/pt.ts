import type { Dictionary } from './en';

const pt: Dictionary = {
  meta: {
    defaultTitle: 'Kiwibit — Consultoria de Segurança, Pentest e AppSec',
    defaultDescription:
      'A Kiwibit é um time de cibersegurança que oferece consultoria de segurança da informação, pentest e AppSec para produtos que não podem falhar.',
    keywords: [
      'cibersegurança',
      'teste de intrusão',
      'pentest',
      'segurança de aplicações',
      'appsec',
      'consultoria de segurança da informação',
      'code review',
      'bug bounty',
      'kiwibit',
    ],
    home: {
      title: 'Consultoria de segurança, pentest e AppSec',
      description:
        'Segurança ofensiva, teste de intrusão e segurança de aplicações para times que não podem correr o risco de um vazamento.',
    },
    projects: {
      title: 'Projetos',
      description:
        'Produtos reais e ferramentas de segurança construídos e mantidos pelo time Kiwibit.',
    },
    blog: {
      title: 'Blog',
      description: 'Pesquisa, writeups e aprendizados do time de segurança da Kiwibit.',
    },
    team: {
      title: 'Time',
      description: 'As pessoas por trás da Kiwibit e como entrar para o time.',
    },
    privacy: {
      title: 'Política de Privacidade',
      description: 'Como a Kiwibit coleta, usa e protege dados pessoais de acordo com a LGPD.',
    },
    terms: {
      title: 'Termos de Uso',
      description: 'Os termos que regem o uso do site da Kiwibit.',
    },
  },

  header: {
    brand: 'Kiwibit',
    nav: {
      services: 'Serviços',
      method: 'Método',
      projects: 'Projetos',
      blog: 'Blog',
      team: 'Time',
      contact: 'Contato',
    },
    cta: 'Fale com a gente',
    localeLabel: 'Idioma',
  },

  hero: {
    eyebrow: 'Segurança ofensiva · AppSec',
    titleLead: 'Segurança que pensa como',
    titleAccent: 'um atacante.',
    description:
      'Consultoria de segurança da informação, pentest e AppSec para produtos que não podem falhar. Também construímos software de verdade — e protegemos do jeito que engenheiros realmente trabalham.',
    primaryCta: 'Fale com a gente',
    secondaryCta: 'Nossos serviços',
  },

  radar: {
    status: 'escaneando',
    signals: 'sinais',
    active: 'ativo',
    label: 'Superfície de ataque',
  },

  services: {
    eyebrow: 'O que fazemos',
    title: 'Serviços de segurança',
    description:
      'Trabalhos focados que mapeiam, testam e reduzem o risco real nas suas aplicações e na sua infraestrutura.',
    items: [
      {
        title: 'Consultoria de Segurança da Informação',
        description:
          'Postura de risco, modelagem de ameaças e orientação contínua para elevar a maturidade de segurança do seu produto e do seu time.',
        bullets: ['Modelagem de ameaças', 'Análise de risco', 'Roadmap de segurança'],
      },
      {
        title: 'Teste de Intrusão (Pentest)',
        description:
          'Pentests de web, APIs e infraestrutura com um relatório que comprova o impacto e mostra exatamente como corrigir cada achado.',
        bullets: ['Web e APIs', 'Infraestrutura', 'Relatório reproduzível'],
      },
      {
        title: 'AppSec e Code Review',
        description:
          'SDLC seguro, revisão manual de código e automação de segurança integradas aos pipelines que seu time já usa.',
        bullets: ['SDLC seguro', 'Revisão manual de código', 'Automação em CI/CD'],
      },
    ],
  },

  method: {
    eyebrow: 'Como trabalhamos',
    title: 'Escopo claro. Teste profundo. Relatório acionável.',
    description:
      'Um trabalho direto, construído sobre evidências, reprodutibilidade e correções que seu time consegue realmente entregar.',
    steps: [
      {
        title: 'Escopo',
        description:
          'Definimos juntos os alvos, as regras de engajamento e os critérios de sucesso.',
      },
      {
        title: 'Teste',
        description: 'Testamos a fundo — manualmente e com ferramentas — documentando cada passo.',
      },
      {
        title: 'Relatório',
        description: 'Você recebe um relatório claro: impacto, reprodução e correção priorizada.',
      },
      {
        title: 'Suporte',
        description: 'Apoiamos a correção e reavaliamos os ajustes até o risco ser fechado.',
      },
    ],
    principlesTitle: 'Princípios que nos guiam',
    principles: [
      'Construímos projetos reais',
      'Publicamos o que aprendemos',
      'Qualidade acima de quantidade',
      'Automatizamos sempre que possível',
      'Documentamos decisões técnicas',
    ],
  },

  projectsTeaser: {
    eyebrow: 'Portfólio',
    title: 'Construímos e mantemos produtos reais.',
    description:
      'Segurança de quem também escreve código todos os dias. Conheça os projetos que desenvolvemos e mantemos de forma aberta.',
    cta: 'Ver projetos',
  },

  projects: {
    eyebrow: 'Destaques',
    title: 'Projetos',
    subtitle: 'Produtos reais e ferramentas de segurança, construídos e mantidos de forma aberta.',
    viewAll: 'Ver todos os projetos',
    labels: {
      project: 'Projeto',
      live: 'Ao vivo',
      repository: 'Repositório',
      noDescription: 'Descrição em breve.',
    },
    error: 'Não foi possível carregar os projetos agora. Tente novamente em instantes.',
    empty:
      'Nossos projetos estão sendo publicados — fale com a gente para saber o que estamos construindo.',
  },

  blog: {
    eyebrow: 'Pesquisa e escrita',
    title: 'Blog',
    subtitle: 'Pesquisa, writeups e aprendizados do nosso trabalho de segurança.',
    viewAll: 'Ver todos os artigos',
    labels: {
      article: 'Artigo',
      author: 'Autor',
      updated: 'Atualizado',
      readSummary: 'Ler resumo',
    },
    error: 'Não foi possível carregar os destaques do blog agora.',
    empty: 'Primeiros artigos em produção — publicamos o que aprendemos.',
  },

  team: {
    eyebrow: 'Quem está por trás',
    title: 'Nosso time',
    subtitle: 'Um time de cibersegurança que constrói produtos reais e avança práticas de AppSec.',
    viewAll: 'Ver todos os membros',
    labels: {
      openProfile: 'Abrir perfil',
      noBio: 'Os detalhes do perfil serão publicados em breve.',
    },
    error: 'Não foi possível carregar os membros agora.',
    empty: 'Os perfis do time serão publicados em breve.',
    join: {
      title: 'Quer entrar para o time?',
      description:
        'Temos um processo seletivo combinado caso a caso. Fale com a gente e conte com o que você curte trabalhar.',
      cta: 'Iniciar uma conversa',
    },
  },

  contact: {
    eyebrow: 'Contato',
    title: 'Vamos mapear o seu risco?',
    description:
      'Conte sobre seu produto, sobre um trabalho ou uma ideia de parceria. Respondemos em poucos dias úteis.',
    form: {
      name: 'Nome',
      email: 'E-mail',
      company: 'Empresa',
      companyOptional: 'opcional',
      message: 'Mensagem',
      submit: 'Enviar mensagem',
      submitting: 'Enviando…',
    },
    success: 'Mensagem enviada. Retornaremos em breve.',
    error: 'Não foi possível enviar sua mensagem.',
    errorFallback: 'Escreva diretamente para',
    validation: {
      name: 'Informe o seu nome.',
      email: 'Informe um e-mail válido.',
      company: 'O nome da empresa é muito longo.',
      message: 'Escreva uma mensagem com pelo menos 10 caracteres.',
    },
    directEmail: 'Prefere e-mail? Escreva para',
  },

  footer: {
    blurb:
      'Um time de cibersegurança que constrói produtos reais, faz bug bounty e avança práticas de AppSec.',
    navTitle: 'Navegar',
    comingSoonTitle: 'Em breve',
    comingSoon: ['Ferramentas', 'Pesquisa e writeups'],
    comingSoonBadge: 'em breve',
    legalTitle: 'Legal',
    privacy: 'Política de Privacidade',
    terms: 'Termos de Uso',
    security: 'security.txt',
    rights: 'Todos os direitos reservados.',
    contactTitle: 'Contato',
  },

  legal: {
    backToHome: 'Voltar para o início',
    lastUpdated: 'Última atualização',
  },

  notFound: {
    title: 'Página não encontrada',
    description: 'A página que você procura não existe ou foi movida.',
    cta: 'Voltar para o início',
  },
};

export default pt;
