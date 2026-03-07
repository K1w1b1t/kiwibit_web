# Copilot Workspace Instructions

Read `/AGENTS.md` before generating or editing code.

## Source of truth

- Primary architecture and coding rules: `/AGENTS.md`
- Team workflow copy of Copilot instructions: `/.github/workflows/copilot-instructions.md`

## Mandatory rules

- Follow Feature-Sliced Design layers and dependency direction.
- Use TypeScript strong typing (avoid `any`).
- Keep business logic out of purely presentational UI.
- Reuse existing modules and avoid unnecessary files.
- Follow project naming and security conventions from `/AGENTS.md`.
