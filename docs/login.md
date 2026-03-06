# Autenticação & Autorização — Arquitetura proposta para Kiwibit

## 📌 Objetivo

Definir uma arquitetura de autenticação e autorização segura, escalável e compatível com o stack Next.js do projeto Kiwibit, protegendo a área administrativa e permitindo evolução para provedores externos no futuro.

---

## ✅ Requisitos Funcionais (resumo)
- Login de usuários (email/password + OAuth opcional)
- Logout seguro
- Sessões persistentes e revogáveis
- Controle de acesso por roles (ex.: `admin`, `member`)
- Proteção de rotas administrativas
- Associação de ações a usuários autenticados (audit fields)
- Extensibilidade para provedores externos (Google, GitHub, Firebase)

---

## ⚙️ Requisitos Não Funcionais (resumo)
- Alta segurança (práticas do mercado)
- Baixa complexidade inicial (pronto para MVP)
- Fácil manutenção e integração com Next.js
- Performance adequada e capacidade de evoluir

---

## 🧱 Decisão recomendada (direção)
- Estratégia de autenticação: Sessões HTTP-only (server-side sessions armazenadas em DB).
- Biblioteca recomendada: NextAuth.js (Auth.js) como implementação inicial, com adaptador para Postgres.
- Backend: Regras de negócio e autorização implementadas no Next.js (server actions / API routes) e reforçadas com RLS no banco quando usar Supabase/Postgres.
- Roles iniciais: `admin`, `editor`, `member_manager`, `member`.

Justificativa rápida: sessões HTTP-only permitem revogação simples, proteção contra XSS e integração direta com Next.js; NextAuth reduz trabalho inicial e é facilmente adaptável a outros providers.

---

## 1) Estratégia de Autenticação

- Sessão (cookies) vs JWT
  - Recomendado: cookies HTTP-only de sessão com ID referenciando sessão no banco (DB sessions).
  - Motivo: revogação simples (invalidar no DB), proteção contra XSS (cookie httpOnly) e facilidade de uso com SSR/Server Actions.
- Server-side vs client-side
  - Lógica sensível e checks de autorização devem rodar server-side (server actions / API routes). O cliente recebe apenas o mínimo (session existence, roles) via props ou fetch protegida.

---

## 2) Gerenciamento de Sessão

- Armazenamento: tabela `sessions` no Postgres (NextAuth já provê esse modelo) contendo: `id`, `userId`, `expires`, `sessionToken`, `createdAt`, `updatedAt`.
- Expiração e renovação:
  - Expiração padrão: 7 dias (configurável).
  - Renovação: sessão renovada em atividade (rolling session) com limite máximo (ex.: 30 dias de total life) para segurança.
  - Renovação segura: gerar novo sessionToken ao renovar (rotating token) para mitigar replay.
- Logout e revogação:
  - Logout remove/regenera a sessão no DB; admin pode revogar sessões de qualquer usuário (delete sessions).

---

## 3) Controle de Acesso (Authorization)

- Definição de roles:
  - Exemplo: `admin`, `editor`, `member_manager`, `member`.
  - Roles armazenadas na tabela `users.roles` (array/text) ou tabela `user_roles` relacionando users↔roles.
- Proteção de rotas:
  - Middleware (`middleware.ts`) para proteger rotas `/app`, `/admin` (verifica session + roles).
  - Server actions / API routes devem sempre chamar um helper `requireAuth(request, { roles?: [...] })` que lança/retorna 401/403.
- Proteção de ações (ex: CRUD admin):
  - Ex.: `canEditPost(user, post)` => `user.id === post.authorId || user.roles.includes('editor') || user.roles.includes('admin')`.
  - Validar esses checks server-side antes de executar qualquer alteração no DB.

---

## 4) Persistência de Usuário (modelo mínimo)

Tabela `users` (exemplo):
- `id` UUID (PK)
- `email` TEXT UNIQUE
- `name` TEXT
- `password_hash` TEXT (nullable se provedor OAuth)
- `provider` TEXT (e.g., `local`, `github`, `google`)
- `provider_id` TEXT (id do provedor)
- `roles` TEXT[] (ou tabela relacional)
- `created_at`, `updated_at`

Relações principais:
- `posts.authorId` → `users.id`
- `projects.ownerId` → `users.id`
- `sessions.userId` → `users.id`

Observação: sempre gravar `createdBy`/`updatedBy` em entidades que representem ações do usuário.

---

## 5) Segurança (práticas e mitigations)

- Hash de senha: usar `argon2` ou `bcrypt` com parâmetros fortes (argon2id preferido).
- Cookies: setar `HttpOnly`, `Secure`, `SameSite=Lax` (ou `Strict` para áreas muito sensíveis).
- Cookies: setar `HttpOnly`, `Secure`, `SameSite=Lax` (ou `Strict` para áreas muito sensíveis).
  - Importante: em produção os cookies devem sempre usar `Secure` (apenas enviados por HTTPS). No ambiente de desenvolvimento local o servidor Next pode não rodar sobre HTTPS — por isso a aplicação deve condicionar a flag `secure` ao ambiente.
  - Estratégias para desenvolvimento local:
    - Definir a opção `secure: process.env.NODE_ENV === 'production'` nas configurações de cookie (NextAuth/implementação própria).
    - Alternativa mais segura: rodar o servidor local sobre HTTPS (mkcert, dev certs) para testar com as mesmas flags de produção.
  - Exemplo rápido (NextAuth cookie option):
  ```js
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' }
    }
  }
  ```
- CSRF: habilitar proteção CSRF para formulários/state-changing requests; NextAuth já cuida de CSRF para callbacks, mas valide em APIs custom.
- XSS: nunca injetar conteúdo sem sanitização; sanitizar `publishedContent` (ex.: DOMPurify) quando for renderizar HTML vindo de usuários.
- Brute-force: rate-limiting em endpoint de login (ex.: limiter por IP e por conta), bloquear temporariamente após N tentativas.
- Armazenamento de tokens: não expor access tokens no client; use cookies httpOnly para sessão.
- RLS (Row Level Security): quando usar Supabase/Postgres, definir policies para garantir coercive DB-level enforcement (ex.: only owner can update row).
- Logs / auditoria: gravar ações críticas (criar/editar/deletar) com `actorId`, timestamp e mudança resumida.

---

## 6) Fluxos principais (resumidos)

- Login (local):
  1. Usuário envia `email` + `password` para `/api/auth/login`.
  2. Server valida (zod), busca `user` e verifica hash (argon2.verify).
  3. Se ok, cria sessão no DB e seta cookie httpOnly.
  4. Responder com 200 + redirect para `/app`.

- Login (OAuth via NextAuth):
  1. Usuário inicia fluxo OAuth, callback obtém profile.
  2. Adapter sincroniza/insere `users` (provider, provider_id) e cria sessão.

- Logout:
  1. Endpoint `/api/auth/logout` invalida sessão no DB e remove cookie.

---

## 7) Extensibilidade para provedores externos

- Padrão adapter/strategy: isolar lógica de autenticação por adaptadores em `/lib/auth/adapters`.
- Ao integrar Firebase/OAuth custom, implementar adapter que valida tokens no provider e sincroniza dados em `users` table.
- Manter `provider` + `provider_id` por usuário para permitir concatenação/migração de contas.

---

## 8) Implementação recomendada (prática com Next.js)

- Biblioteca: NextAuth.js com Postgres adapter (ou Supabase adapter quando for o caso).
- Variáveis de ambiente (exemplo):
  - `DATABASE_URL`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  - `GITHUB_ID`, `GITHUB_SECRET` (se habilitar OAuth)
  - `SMTP_URL` (para reset/verify emails)
- Helpers e middleware:
  - `/lib/auth/index.ts` → `getSession`, `requireAuth`, `hasRole`, `signInLocal`.
  - `/lib/server/permissions.ts` → `canEditPost`, `isAdmin`.
  - `middleware.ts` → protege rotas públicas/privadas.
- Migrations: criar tabelas `users`, `sessions`, `posts`, `projects`, `comments`, `roles` (prisma ou SQL direto).

---

## 9) Critérios de Aceitação

- Documento descreve claramente a arquitetura (este arquivo).
- Roles e políticas de acesso documentadas.
- Fluxos de login/logout/sessão descritos.
- Equipe pode implementar login com NextAuth com as variáveis listadas e os helpers indicados sem dúvidas.

---

## 10) Próximos passos (opções que posso gerar agora)
- Gerar `docs/auth-module.md` detalhando a API do módulo `/lib/auth`.
- Gerar esqueleto de `/lib/auth` com a interface e um adapter mínimo (NextAuth/Supabase).
- Gerar `env.example` com variáveis necessárias.

Indique qual destes eu devo criar agora.
