const en = {
  meta: {
    defaultTitle: 'Kiwibit | Digital products, security & AppSec',
    defaultDescription:
      'Kiwibit is a cybersecurity team offering information security consulting, penetration testing and AppSec for products that cannot fail.',
    keywords: [
      'cybersecurity',
      'penetration testing',
      'pentest',
      'application security',
      'appsec',
      'information security consulting',
      'ai code refactoring',
      'digital products',
      'bug bounty',
      'kiwibit',
    ],
    home: {
      title: 'Digital products & security consulting',
      description:
        'We build digital products and secure yours: security consulting, pentest and AppSec from a team that writes code every day.',
    },
    projects: {
      title: 'Products',
      description: 'Products and security tooling built and maintained by the Kiwibit team.',
    },
    blog: {
      title: 'Blog',
      description: 'Research, writeups and lessons from the Kiwibit security team.',
    },
    team: {
      title: 'Team',
      description: 'The people behind Kiwibit and how to join the team.',
    },
    privacy: {
      title: 'Privacy Policy',
      description: 'How Kiwibit collects, uses and protects personal data under the LGPD.',
    },
    terms: {
      title: 'Terms of Use',
      description: 'The terms that govern the use of the Kiwibit website.',
    },
  },

  header: {
    brand: 'Kiwibit',
    nav: {
      services: 'Services',
      method: 'Method',
      projects: 'Projects',
      blog: 'Blog',
      team: 'Team',
      contact: 'Contact',
    },
    cta: 'Talk to us',
    localeLabel: 'Language',
  },

  hero: {
    eyebrow: 'Products · Offensive security · AppSec',
    titleLead: 'We build digital products and',
    titleAccent: 'the security behind them.',
    description:
      'A team that ships digital products and secures yours too, with security consulting, pentest and AppSec from people who write code every day.',
    primaryCta: 'Explore our products',
    secondaryCta: 'Our services',
  },

  radar: {
    status: 'scanning',
    signals: 'signals',
    active: 'active',
    label: 'Threat surface',
  },

  services: {
    eyebrow: 'What we do',
    title: 'Security services',
    description:
      'Focused engagements that map, test and reduce the real risk in your applications and infrastructure.',
    items: [
      {
        title: 'Information Security Consulting',
        description:
          'Risk posture, threat modeling and continuous guidance to raise the security maturity of your product and team.',
        bullets: ['Threat modeling', 'Risk assessment', 'Security roadmap'],
      },
      {
        title: 'Penetration Testing',
        description:
          'Web, API and infrastructure pentests with a report that proves impact and shows exactly how to fix each finding.',
        bullets: ['Web & API', 'Infrastructure', 'Reproducible reporting'],
      },
      {
        title: 'AppSec & AI Code Refactoring',
        description:
          'Secure SDLC, review and refactoring of AI-generated code. We make what AI ships secure, readable and production-ready, embedded into the pipelines your team already uses.',
        bullets: ['Secure SDLC', 'AI-generated code', 'CI/CD automation'],
      },
    ],
  },

  method: {
    eyebrow: 'How we work',
    title: 'Clear scope. Deep testing. Actionable reporting.',
    description:
      'A straightforward engagement built around evidence, reproducibility and fixes your team can actually ship.',
    steps: [
      {
        title: 'Scope',
        description: 'We define targets, rules of engagement and success criteria together.',
      },
      {
        title: 'Test',
        description: 'We test in depth, manually and with tooling, documenting every step.',
      },
      {
        title: 'Report',
        description: 'You get a clear report: impact, reproduction and prioritized remediation.',
      },
      {
        title: 'Support',
        description: 'We support remediation and re-test the fixes until the risk is closed.',
      },
    ],
    principlesTitle: 'Principles we work by',
    principles: [
      'We build our own products',
      'We publish what we learn',
      'Quality over quantity',
      'We automate whenever possible',
      'We document technical decisions',
    ],
  },

  projectsTeaser: {
    eyebrow: 'Products',
    title: 'Products and tools we build and maintain.',
    description:
      'We don’t just secure software, we build it too. Explore the products and security tools we develop and use every day.',
    cta: 'Explore our products',
  },

  projects: {
    eyebrow: 'Highlights',
    title: 'Products',
    subtitle: 'Products and security tooling, built and maintained in the open.',
    viewAll: 'View all projects',
    labels: {
      project: 'Project',
      live: 'Live',
      repository: 'Repository',
      noDescription: 'Description coming soon.',
    },
    // Accessible names for the image carousel on a project's own page.
    carousel: {
      previous: 'Previous image',
      next: 'Next image',
      goTo: 'Go to image',
    },
    error: 'Could not load projects right now. Please try again in a few moments.',
    empty: 'Our projects are being published. Get in touch to hear what we are currently building.',
  },

  blog: {
    eyebrow: 'Research & writing',
    title: 'Blog',
    subtitle: 'Research, writeups and lessons from our security work.',
    viewAll: 'View all posts',
    labels: {
      article: 'Article',
      author: 'Author',
      updated: 'Updated',
      readMore: 'Read article',
    },
    post: {
      backToAll: 'All posts',
      by: 'By',
      suggestions: 'Suggested reading',
    },
    error: 'Could not load blog highlights right now.',
    empty: 'First articles in production. We publish what we learn.',
  },

  team: {
    eyebrow: 'The people behind it',
    title: 'Our team',
    subtitle: 'A team that builds products and advances security and AppSec practices.',
    viewAll: 'View all members',
    labels: {
      viewFullProfile: 'View full profile',
      noBio: 'Profile details will be published soon.',
    },
    member: {
      backToAll: 'All members',
      suggestions: 'Meet the rest of the team',
    },
    error: 'Could not load members right now.',
    empty: 'Team profiles are being published soon.',
    join: {
      title: 'Want to join the team?',
      description:
        'We run a selection process arranged case by case. Reach out and tell us what you are into.',
      cta: 'Start a conversation',
    },
  },

  contact: {
    eyebrow: 'Contact',
    title: "Let's map your risk?",
    description:
      'Tell us about your product, engagement or partnership idea. We reply within a couple of business days.',
    form: {
      name: 'Name',
      email: 'Email',
      company: 'Company',
      companyOptional: 'optional',
      message: 'Message',
      submit: 'Send message',
      submitting: 'Sending…',
    },
    success: 'Message sent. We will get back to you shortly.',
    error: 'Could not send your message.',
    errorFallback: 'Please write to us directly at',
    validation: {
      name: 'Please enter your name.',
      email: 'Please enter a valid email address.',
      company: 'Company name is too long.',
      message: 'Please write a message with at least 10 characters.',
    },
    directEmail: 'Prefer email? Write to',
  },

  footer: {
    blurb:
      'A team that builds digital products, does bug bounty and advances security and AppSec practices.',
    navTitle: 'Navigate',
    legalTitle: 'Legal',
    privacy: 'Privacy Policy',
    terms: 'Terms of Use',
    rights: 'All rights reserved.',
    contactTitle: 'Contact',
    login: 'Sign in',
  },

  legal: {
    backToHome: 'Back to home',
    lastUpdated: 'Last updated',
  },

  notFound: {
    title: 'Page not found',
    description: 'The page you are looking for does not exist or has been moved.',
    cta: 'Back to home',
  },
};

export type Dictionary = typeof en;

export default en;
