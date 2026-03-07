# AGENTS.md

This document is the source of truth for AI assistants (including GitHub Copilot) in this repository.
All generated code MUST follow these rules.

## 1. Scope and Priority

- Scope: entire repository.
- Priority: when there is any conflict, this file has precedence for architecture and coding decisions.
- Copilot integration: `.github/workflows/copilot-instructions.md` MUST reference and enforce this file.

## 2. Project Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS

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

## 10. Governance

- This file MUST evolve with project architecture.
- Keep rules practical and high-impact.
- When rules become outdated, update this file first, then align generated code.
