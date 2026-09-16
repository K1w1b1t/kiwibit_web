/**
 * Public company identity used across the marketing site and legal pages.
 *
 * Only public business information is stored here. Personal data from the CNPJ
 * registration (owner's home address, personal email and phone) is deliberately
 * omitted — it must never be published on the site.
 */
export const COMPANY = {
  name: 'Kiwibit',
  legalName: 'KIWIBIT SERVIÇOS DE TECNOLOGIA LTDA',
  cnpj: '68.004.918/0001-42',
  email: 'tech@kiwibit.com.br',
  domain: 'kiwibit.com.br',
  city: 'São José dos Campos',
  address: 'Rua Alagoinhas, nº 92, Jardim Vale do Sol, São José dos Campos/SP, CEP 12238-020',
  state: 'SP',
  country: 'BR',
} as const;
