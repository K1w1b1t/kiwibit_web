# Kiwibit — Base Inicial (Next.js + TypeScript)

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-43853d?style=for-the-badge&logo=node.js&logoColor=white) ![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white) ![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=white) ![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

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

- Adicionar `Prisma` e configurar migrations
- Adicionar `NextAuth` / Auth.js para autenticação
- Configurar CI/CD (GitHub Actions / Vercel)
