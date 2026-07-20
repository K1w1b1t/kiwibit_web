# AGENTS.md

Source of truth for all AI assistants in this repository. Precedence over any other instruction when there is a conflict.

---

## 1. Stack

- Next.js (App Router) · React · TypeScript · Tailwind CSS
- Prisma + PostgreSQL (Docker locally, Supabase in production)
- NextAuth v4 — Credentials provider, JWT strategy, httpOnly cookie

---

## 2. Architecture — Feature-Sliced Design

**Layer order (dependency direction):** `pages → widgets → features → entities → shared`

Lower layers MUST NOT import from upper layers. `shared` MUST NOT import from any other layer.

| Layer    | Location        | Purpose                                  |
| -------- | --------------- | ---------------------------------------- |
| shared   | `src/shared/`   | UI kit, utilities, lib singletons, types |
| entities | `src/entities/` | Domain models, types, entity helpers     |
| features | `src/features/` | User-facing business logic and use cases |
| widgets  | `src/widgets/`  | Composed UI blocks                       |
| pages    | `src/app/`      | Next.js routes (entrypoint only)         |

---

## 3. Key File Map

```
src/
  proxy.ts                    # Next 16 middleware (file named proxy.ts):
                              #   locale negotiation (/ → /pt|/en) + admin gating
  instrumentation.ts          # onRequestError → Discord 5xx reporting
  app/
    [locale]/                 # Public site (SSG, pt + en) — root layout owns <html>
      layout.tsx              #   header/footer, metadata, JSON-LD, generateStaticParams
      page.tsx                #   home: Hero → ProjectsTeaser → Services → Method
                              #        → Blog → Team → Contact
      {projects,blog,team}/   #   public list pages
      {privacy-policy,terms-of-use}/  # LGPD legal pages
      opengraph-image.tsx     #   next/og OG image (per locale)
    (internal)/               # Admin route group — own <html> + AuthProvider
      admin/members/          #   protected CRUD screens
    api/
      auth/[...nextauth]/     # NextAuth handler
      admin/{users,members,projects,posts}/  # Protected CRUD
      {members,posts,projects}/             # Public read-only
      contact/                # Public POST → Discord webhook (no DB)
    robots.ts · sitemap.ts    # SEO
  shared/
    i18n/                     # config, match-locale, get-dictionary, dictionaries/{en,pt}
    config/company.ts         # public company identity (name, CNPJ, city)
    ui/{section-heading,pill-link}.tsx
    lib/
      prisma.ts               # Prisma Client singleton
      auth.ts                 # NextAuth authOptions
      api-helpers.ts          # requireAdminSession(), apiError() (5xx → Discord)
      discord.ts · rate-limit.ts · seo.ts
    types/next-auth.d.ts      # Session/JWT type augmentation
  features/
    auth/                     # auth-provider.tsx, use-auth.ts
    contact/                  # validate-contact, use-contact-form, contact-form
    locale-switch/            # locale-switcher.tsx
tests/e2e/
  setup/{global-setup,global-teardown}.ts
  helpers/{client,auth,constants}.ts
  {auth,users,members,projects,posts,contact,locale-redirect}.test.ts
```

**i18n**: hand-rolled (no next-intl). Locale comes only from the `[locale]` URL
param — never call `cookies()`/`headers()` under `[locale]` (keeps SSG). Strings
flow via props (dictionary slices), no context. Add a key to `dictionaries/en.ts`
first (source of `Dictionary` type), then `pt.ts` (compile-time key parity).

**Env**: `NEXT_PUBLIC_SITE_URL`, `DISCORD_CONTACT_WEBHOOK_URL`,
`DISCORD_ERROR_WEBHOOK_URL` (see `.env.example`).

---

## 4. Authentication & Authorization

- JWT stored in httpOnly cookie (`sameSite: lax`, `secure` in production only).
- `NEXTAUTH_SECRET` and `NEXTAUTH_URL` must be present in env.
- Roles: `admin` · `editor` · `member_manager` → access admin routes. `member` → no admin access.
- **Proxy** (`src/proxy.ts`, Next 16's renamed middleware): unauthenticated admin API → `401 JSON`; wrong role → `403 JSON`; unauthenticated admin page → redirect `/` (no `/login` page exists yet). Also handles locale negotiation for public routes.
- **Server guard**: always call `requireAdminSession()` at the top of every admin route handler.
- **Client**: use `useAuth()` from `src/features/auth/use-auth.ts`.

---

## 5. API Contract

### Public routes

| Method | Path                                   | Notes                                 |
| ------ | -------------------------------------- | ------------------------------------- |
| GET    | `/api/projects` · `/api/projects/[id]` | `page`, `limit`, `search`             |
| GET    | `/api/members` · `/api/members/[id]`   | `page`, `limit`, `search`             |
| GET    | `/api/posts` · `/api/posts/[id]`       | `page`, `limit`, `search`, `authorId` |

### Admin routes (admin · editor · member_manager)

| Methods            | Path                                             |
| ------------------ | ------------------------------------------------ |
| GET · POST         | `/api/admin/{users,members,projects,posts}`      |
| GET · PUT · DELETE | `/api/admin/{users,members,projects,posts}/[id]` |

### Error shape (all routes)

```ts
type ErrorResponse = {
  error: { code: string; message: string; details?: Record<string, unknown> };
};
```

Status codes: `400` bad input · `401` unauthenticated · `403` forbidden · `404` not found · `409` conflict · `500` internal.

---

## 6. Coding Rules

- **Language**: English only — code, comments, identifiers, file names.
- **Typing**: strict TypeScript; no `any`.
- **Separation**: UI, business logic, and data access in separate concerns.
- **Size**: keep components small; split when responsibility grows.
- **Reuse (MANDATORY)**: before creating any component, hook, or helper, search `src/shared/ui`, `src/features`, `src/entities`, `src/widgets`. Only create a new file if nothing fits. Prefer extending via props/composition over duplicating.

### Naming

- Files/folders: `kebab-case`
- Components: `PascalCase`
- Functions/variables: `camelCase`
- Hooks: prefix `use`
- Types/Interfaces/Enums: `PascalCase`

---

## 7. Security

- No secrets or credentials in source files or frontend code.
- Validate all external input at server boundaries.
- Never log sensitive data (tokens, passwords, PII).
- Always use `requireAdminSession()` before admin mutations.

---

## 8. Quality Gates — MANDATORY

Every change MUST pass all four commands before the task is considered complete:

```bash
npm run lint       # zero ESLint errors
npm run build      # Next.js build succeeds
npm run test       # unit tests pass
npm run test:e2e   # E2E tests pass (requires Docker)
```

- Fix lint errors immediately before continuing.
- Fix TypeScript/build errors before continuing (`npx tsc --noEmit` as fast pre-check).
- E2E failures may indicate broken API contracts, auth regression, or migration issues.

### E2E infrastructure

- Ephemeral DB via `docker-compose.e2e.yml` — port `5434`, `tmpfs` (no volume), destroyed after tests.
- Dev DB (`docker-compose.yml`, port `5433`) is never touched by `test:e2e`.
- Flow: DB up → healthy → `prisma migrate deploy` → `next dev` → Jest → full teardown.

---

## 9. AI Assistant Rules

1. Read `AGENTS.md` before generating or editing any code.
2. Follow FSD layer order and dependency direction strictly.
3. Never place code outside the defined layers without explicit human instruction.
4. Always use TypeScript; never use `any`.
5. Search for existing components/helpers before creating new ones (see Section 6 — Reuse).
6. Run all four quality gate commands after every change (Section 8).
7. Keep output minimal and aligned with project conventions.

## 2. Project Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL (Supabase in production, Docker locally)
- NextAuth v4 (Credentials provider, JWT strategy, httpOnly cookie)

## 3. Architecture (Feature-Sliced Design)

Use Feature-Sliced Design (FSD) for all new code.

### 3.1 Layers

- `shared`: reusable and generic code (UI kit, utilities, constants, low-level libs).
- `entities`: business entities, domain types, entity-level UI/state/helpers.
- `features`: user actions and business use cases.
- `widgets`: composed UI blocks for pages.
- `pages`: route-level composition and page assembly.

### 3.2 Dependency Direction

- Allowed direction: `pages -> widgets -> features -> entities -> shared`.
- Lower layers MUST NOT depend on upper layers.
- `shared` MUST NOT import from `entities/features/widgets/pages`.

### 3.3 Next.js Mapping

- Keep routes in `src/app` as required by Next.js.
- Treat route files as the `pages` layer entrypoint and compose features/widgets there.
- New domain code SHOULD live under `src/{shared,entities,features,widgets,pages}`.

## 4. Folder and File Organization

Target structure for new code:

```text
src/
  app/                         # Next.js routing entrypoint
    api/
      auth/[...nextauth]/      # NextAuth handler
      admin/                   # Protected CRUD routes (require session + admin role)
        users/
        members/
        projects/
        posts/
      members/                 # Public read-only routes
      posts/
      projects/
  middleware.ts                # JWT-based route protection for /admin/* and /api/admin/*
  shared/
    ui/
    lib/
      prisma.ts                # Prisma Client singleton
      auth.ts                  # NextAuth authOptions
      api-helpers.ts           # requireAdminSession(), apiError()
    config/
    types/
      next-auth.d.ts           # Session/JWT type augmentation
  entities/
  features/
    auth/
      auth-provider.tsx        # <AuthProvider> (wraps SessionProvider)
      use-auth.ts              # useAuth() hook
  widgets/
  pages/
tests/
  e2e/
    setup/
      global-setup.ts          # Creates E2E admin user
      global-teardown.ts       # Cleans up @kiwibit.test accounts
    helpers/
      client.ts                # ApiClient with cookie-jar
      auth.ts                  # signInAsAdmin()
      constants.ts             # BASE_URL, credentials
    auth.test.ts
    users.test.ts
    members.test.ts
    projects.test.ts
    posts.test.ts
```

Rules:

- UI primitives and reusable UI components MUST be in `src/shared/ui`.
- Business logic for user-facing capabilities MUST be in `src/features`.
- Entity models/types/domain behavior MUST be centralized in `src/entities`.
- Do not create files/folders that are not used.
- Prefer extending existing modules over creating duplicates.

## 5. Authentication & Authorization

### 5.1 Mechanism

- NextAuth v4 with `CredentialsProvider` (email + bcryptjs password).
- Session stored as JWT; token carries `id` and `role`.
- Cookie is `httpOnly`, `sameSite: lax`, `secure` only in production.
- `NEXTAUTH_SECRET` and `NEXTAUTH_URL` MUST be set in environment.

### 5.2 Roles

| Role             | Description                     |
| ---------------- | ------------------------------- |
| `admin`          | Full access to all admin routes |
| `editor`         | Access to admin routes          |
| `member_manager` | Access to admin routes          |
| `member`         | No access to admin routes       |

### 5.3 Route Protection

- `src/middleware.ts` intercepts `/admin/*` and `/api/admin/*`.
- Unauthenticated requests to `/api/*` → `401 JSON` `{ error: { code: "UNAUTHORIZED" } }`.
- Authenticated but insufficient role → `403 JSON` `{ error: { code: "FORBIDDEN" } }`.
- Unauthenticated page requests → redirect to `/login`.

### 5.4 Server-side Guard

- Use `requireAdminSession()` from `src/shared/lib/api-helpers.ts` at the top of every admin route handler.
- Never trust client-side role checks for data mutations.

### 5.5 Client-side

- Wrap app in `<AuthProvider>` (already in `src/app/layout.tsx`).
- Use `useAuth()` hook from `src/features/auth/use-auth.ts` to access `user`, `isAuthenticated`, `isAdmin`, `hasRole()`, `signIn`, `signOut`.

## 6. API Routes Contracts

### Public (no auth required)

| Method | Path                 | Description                                            |
| ------ | -------------------- | ------------------------------------------------------ |
| GET    | `/api/projects`      | Paginated list (`page`, `limit`, `search`)             |
| GET    | `/api/projects/[id]` | Single project                                         |
| GET    | `/api/members`       | Paginated list (`page`, `limit`, `search`)             |
| GET    | `/api/members/[id]`  | Single member                                          |
| GET    | `/api/posts`         | Paginated list (`page`, `limit`, `search`, `authorId`) |
| GET    | `/api/posts/[id]`    | Single post                                            |

### Admin (requires session with admin/editor/member_manager role)

| Method         | Path                       | Description                    |
| -------------- | -------------------------- | ------------------------------ |
| GET/POST       | `/api/admin/users`         | List / Create user             |
| GET/PUT/DELETE | `/api/admin/users/[id]`    | Read / Update / Delete user    |
| GET/POST       | `/api/admin/members`       | List / Create member           |
| GET/PUT/DELETE | `/api/admin/members/[id]`  | Read / Update / Delete member  |
| GET/POST       | `/api/admin/projects`      | List / Create project          |
| GET/PUT/DELETE | `/api/admin/projects/[id]` | Read / Update / Delete project |
| GET/POST       | `/api/admin/posts`         | List / Create post             |
| GET/PUT/DELETE | `/api/admin/posts/[id]`    | Read / Update / Delete post    |

### Error format (all routes)

```ts
type ErrorResponse = {
  error: { code: string; message: string; details?: Record<string, unknown> };
};
```

Standard HTTP status codes: `400` bad input, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `500` internal error.

## 7. Coding Standards

- Code, comments, identifiers, file/folder names MUST be in English.
- Use strong typing with TypeScript. Avoid `any`.
- Prefer small, composable, reusable functions/components.
- Enforce separation of concerns: UI, business logic, data access.
- Prefer composition over inheritance.
- Avoid large components; split when responsibilities grow.
- Do not duplicate logic; extract shared behavior.

### 7.1 Component Reuse — MANDATORY

Before creating any new component, hook, utility or helper, AI assistants and developers MUST:

1. Search `src/shared/ui`, `src/features`, `src/entities`, and `src/widgets` for an existing component or function that satisfies the need.
2. Only create a new file if **no existing component fits** the context without forcing an unrelated responsibility onto it.
3. If an existing component almost fits, prefer **extending it** (via props or composition) over duplicating it.
4. Document the search decision in the PR/commit if a new file is created despite similar components existing.

## 8. Naming Conventions

- Files and folders: English names, kebab-case for files unless framework conventions require otherwise.
- React components: PascalCase.
- Functions and variables: camelCase.
- Hooks: MUST start with `use`.
- Types/interfaces/enums: PascalCase.

## 9. Security Rules

- Never expose secrets or sensitive data in frontend code.
- Never hardcode secrets/tokens/credentials in source files.
- Validate all external input (client and server boundaries).
- Follow secure authentication and authorization practices.
- Avoid logging sensitive data (tokens, passwords, personal data).
- Always call `requireAdminSession()` before any admin route mutation.

## 10. Rules for New Features

Every new feature MUST follow this checklist:

- [ ] Create code inside `src/features/<feature-name>`.
- [ ] Separate UI from business logic.
- [ ] Create or reuse explicit TypeScript types/interfaces.
- [ ] Reuse existing entities instead of redefining domain models.
- [ ] Ensure complete typing (no implicit `any`).
- [ ] Keep imports aligned with FSD dependency direction.
- [ ] Add only necessary files.

## 11. Quality Gates — MANDATORY

After every change (code generation, edit, refactor), AI assistants MUST verify that **all five** commands pass before considering the task complete:

```bash
npm run lint        # ESLint must pass with zero errors
npm run format
npm run build       # Next.js production build must succeed
npm run test        # Jest unit tests must pass
npm run test:e2e    # End-to-end tests must pass (requires Docker)
```

Rules:

- If `npm run lint` fails, fix all lint errors before proceeding.
- If `npm run build` fails, resolve all TypeScript and build errors before proceeding.
- If `npm run test` fails, fix the failing unit tests before proceeding.
- If `npm run test:e2e` fails, investigate the failure — it may indicate a broken API contract, auth regression, or migration issue.
- Never mark a task as complete while any of these commands fails.
- Run `npx tsc --noEmit` as a fast pre-check before running the full build.

### E2E test infrastructure

- E2E tests use a **separate ephemeral database** via `docker-compose.e2e.yml` (port `5434`, no persistent volume).
- The dev database (`docker-compose.yml`, port `5433`) is never touched by `test:e2e`.
- `npm run test:e2e` orchestrates: DB up → health check → `prisma migrate deploy` → `next dev` → Jest E2E → full teardown.
- E2E test files live in `tests/e2e/**/*.test.ts` and are isolated from unit tests (`src/**/*.spec.ts`).

## 12. AI Assistant Operational Rules

AI assistants (Copilot, chat agents, code generation tools) MUST:

- Read `AGENTS.md` before proposing or generating code.
- Follow FSD layers and dependency direction strictly.
- Never place new code outside defined layers without explicit human instruction.
- Never mix business logic and presentational UI in the same concern.
- Always use TypeScript typing.
- Prioritize reuse of existing code before creating new abstractions.
- Keep output minimal, objective, and aligned with this repository conventions.
- Always run all four quality gate commands (Section 11) after any change.

## 3. Architecture (Feature-Sliced Design)

Use Feature-Sliced Design (FSD) for all new code.

### 3.1 Layers

- `shared`: reusable and generic code (UI kit, utilities, constants, low-level libs).
- `entities`: business entities, domain types, entity-level UI/state/helpers.
- `features`: user actions and business use cases.
- `widgets`: composed UI blocks for pages.
- `pages`: route-level composition and page assembly.

### 3.2 Dependency Direction

- Allowed direction: `pages -> widgets -> features -> entities -> shared`.
- Lower layers MUST NOT depend on upper layers.
- `shared` MUST NOT import from `entities/features/widgets/pages`.

### 3.3 Next.js Mapping

- Keep routes in `src/app` as required by Next.js.
- Treat route files as the `pages` layer entrypoint and compose features/widgets there.
- New domain code SHOULD live under `src/{shared,entities,features,widgets,pages}`.

## 4. Folder and File Organization

Target structure for new code:

```text
src/
  app/                 # Next.js routing entrypoint
  shared/
    ui/
    lib/
    config/
    types/
  entities/
  features/
  widgets/
  pages/
```

Rules:

- UI primitives and reusable UI components MUST be in `src/shared/ui`.
- Business logic for user-facing capabilities MUST be in `src/features`.
- Entity models/types/domain behavior MUST be centralized in `src/entities`.
- Do not create files/folders that are not used.
- Prefer extending existing modules over creating duplicates.

## 5. Coding Standards

- Code, comments, identifiers, file/folder names MUST be in English.
- Use strong typing with TypeScript. Avoid `any`.
- Prefer small, composable, reusable functions/components.
- Enforce separation of concerns: UI, business logic, data access.
- Prefer composition over inheritance.
- Avoid large components; split when responsibilities grow.
- Do not duplicate logic; extract shared behavior.

## 6. Naming Conventions

- Files and folders: English names, kebab-case for files unless framework conventions require otherwise.
- React components: PascalCase.
- Functions and variables: camelCase.
- Hooks: MUST start with `use`.
- Types/interfaces/enums: PascalCase.

## 7. Security Rules

- Never expose secrets or sensitive data in frontend code.
- Never hardcode secrets/tokens/credentials in source files.
- Validate all external input (client and server boundaries).
- Follow secure authentication and authorization practices.
- Avoid logging sensitive data (tokens, passwords, personal data).

## 8. Rules for New Features

Every new feature MUST follow this checklist:

- [ ] Create code inside `src/features/<feature-name>`.
- [ ] Separate UI from business logic.
- [ ] Create or reuse explicit TypeScript types/interfaces.
- [ ] Reuse existing entities instead of redefining domain models.
- [ ] Ensure complete typing (no implicit `any`).
- [ ] Keep imports aligned with FSD dependency direction.
- [ ] Add only necessary files.

## 9. AI Assistant Operational Rules

AI assistants (Copilot, chat agents, code generation tools) MUST:

- Read `AGENTS.md` before proposing or generating code.
- Follow FSD layers and dependency direction strictly.
- Never place new code outside defined layers without explicit human instruction.
- Never mix business logic and presentational UI in the same concern.
- Always use TypeScript typing.
- Prioritize reuse of existing code before creating new abstractions.
- Keep output minimal, objective, and aligned with this repository conventions.
