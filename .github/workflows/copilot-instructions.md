# Copilot Instructions

Mandatory instruction for GitHub Copilot and AI coding assistants in this repository.

## Required First Step

Before generating or editing code, ALWAYS read and follow `/AGENTS.md`.

If there is any doubt or conflict, `/AGENTS.md` is the source of truth.

## Core Rules Summary

- Follow Feature-Sliced Design layers: `shared`, `entities`, `features`, `widgets`, `pages`.
- Respect dependency direction: `pages -> widgets -> features -> entities -> shared`.
- Keep routes in `src/app`, but organize domain code in FSD layers under `src/`.
- Do not mix business logic with presentational UI.
- Use TypeScript strong typing and avoid `any`.
- Reuse existing code and avoid unnecessary files.
- Follow naming conventions: components in PascalCase, functions in camelCase, hooks with `use` prefix.
- Apply security basics: no hardcoded secrets, no sensitive data exposure, validate inputs.

## Expected Behavior for Copilot

When asked to create a new feature, Copilot should:

1. Check existing modules to reuse code.
2. Propose the feature under `src/features/<feature-name>`.
3. Keep UI and logic separated.
4. Create explicit types/interfaces.
5. Keep imports compliant with FSD direction.
6. Return only necessary files/changes.

## Practical Validation Prompt

Use this prompt in Copilot Chat to validate instruction adherence:

```text
Create a new "newsletter-subscription" feature using this repository standards.
Requirements:
- Use FSD structure.
- Separate UI and business logic.
- Use strict TypeScript types (no any).
- Reuse existing entities when possible.
- Keep Next.js route composition in src/app.
```

Validation checklist:

- Output files are inside expected FSD layers.
- No business rules inside purely presentational component.
- No `any` types.
- Naming conventions are respected.
- No unnecessary files were created.
