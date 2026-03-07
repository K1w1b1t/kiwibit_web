# Kiwibit — Base Inicial (Next.js + TypeScript)

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-43853d?style=for-the-badge&logo=node.js&logoColor=white) ![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white) ![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=white) ![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white) ![Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen?style=for-the-badge) ![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

## Resumo rápido

- Projeto scaffolded com Next.js (App Router) + TypeScript.

## Pré-requisitos

- Node.js (recomenda-se v18+)
- npm (ou pnpm/yarn)

## Instalação e execução

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
npm run start
```

## Linters

```bash
npm run lint
npm run format
npm run lint:fix
```

## Testes Unitarios (Jest + TypeScript)

```bash
# Executa toda a suite
npm run test

# Modo watch
npm run test:watch

# Gera cobertura em /coverage
npm run test:cov
```

## Test Framework e Coverage

- Framework de testes: `Jest` com `ts-jest`.
- Config principal: `jest.config.cjs`.
- Cobertura gerada em: `coverage/`.
- Arquivos usados por ferramentas (ex.: SonarQube):
  - `coverage/lcov.info`
  - `coverage/coverage-summary.json`
  - `coverage/clover.xml`
- Badge de coverage no topo do README: valor estatico informativo (atualizar manualmente quando necessario).
- Threshold global atual (Jest): `70%` para `branches`, `functions`, `lines` e `statements`.

Para checar localmente:

```bash
npm run test:cov
```

No CI de PR (`main` e `release`) sao executados:

- `npm run lint`
- `npm run format:check`
- `npm run test:cov`
- `npm run build`

O workflow publica o artefato `coverage-report` e escreve um resumo da cobertura no Job Summary.

Regra de manutencao:

- Sempre que alterar framework, estrategia de testes ou cobertura, atualizar esta secao do README.

## Migrations (Prisma + Supabase)

Esta base usa Prisma para modelagem e `supabase/migrations` como fonte SQL versionada para deploy.

Como funciona no dia a dia:

1. Suba o banco local do projeto:

```bash
npm run db:up
```

2. Garanta que o `DATABASE_URL` em `.env` aponta para o Postgres local (`localhost:5433`).

3. Faça alteracoes em `prisma/schema.prisma`.

4. Gere/aplique migration local:

```bash
npm run prisma:migrate:dev -- --name <nome-da-migration>
```

5. Copie o SQL gerado de `prisma/migrations/<timestamp>_<nome>/migration.sql` para `supabase/migrations/<timestamp>_<nome>.sql`.

6. Se precisar de dados iniciais de desenvolvimento:

```bash
npm run prisma:seed
```

Como manter bem:

- Nunca editar migration antiga que ja foi aplicada em ambiente remoto.
- Sempre criar nova migration incremental.
- Nomear migrations com intencao clara (ex.: `add_user_avatar`, `create_posts_table`).
- Revisar SQL antes do commit (constraints, FKs e defaults).
- Commits de migration devem incluir alteracao de schema + SQL correspondente.

Automacao de deploy de migrations:

- O workflow `supabase-migrations.yml` aplica SQL automaticamente em merge para:
  - `release` (ambiente release)
  - `main` (ambiente producao)
- O workflow usa controle de historico em tabela de migrations para nao reaplicar arquivos ja executados.

Segredos necessarios no GitHub:

- `SUPABASE_DB_URL_RELEASE`: string de conexao Postgres do projeto Supabase de release.
- `SUPABASE_DB_URL_PROD`: string de conexao Postgres do projeto Supabase de producao.

Padrao adotado:

- Testes co-localizados com o modulo (`*.spec.ts` no mesmo diretorio do arquivo testado)
- Foco em comportamento (arrange/act/assert)
- Isolamento por mocks para dependencias externas (`jest.mock(...)`)

## Dependências principais (conforme `package.json`)

- next — 16.1.6
- react — 19.2.3
- react-dom — 19.2.3

## Dependências de desenvolvimento relevantes

- typescript — ^5
- tailwindcss — ^4 (opcional / já presente no devDependencies)
- eslint — ^9
- eslint-config-next — 16.1.6

## Estrutura essencial do projeto

- [src/app](src/app) — App Router (rotas e layout)
- [components](components) — componentes UI
- [lib](lib) — utilitários e helpers do servidor/cliente
- [data](data) — conteúdo local de exemplo
- [docs](docs) — documentação do projeto

## Notas rápidas

- O `tsconfig.json` já foi ajustado para o alias `@/*` apontando para `./src/*`. Verifique [tsconfig.json](tsconfig.json) se quiser mudar o `baseUrl`.
- Se for usar Tailwind, atualize `src/app/globals.css` com as diretivas padrão:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Links úteis

- [docs/design.md] (docs/design.md)
- [docs/login.md](docs/login.md)
- [docs/infrastructure.md](docs/infrastructure.md)

## Próximos passos

- Adicionar `NextAuth` / Auth.js para autenticação
