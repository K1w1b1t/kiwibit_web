---
name: code-review
description: Review GitHub pull requests with a senior-engineer lens, draft concise Brazilian Portuguese feedback, and require explicit approval before posting anything to GitHub.
---

# GitHub Pull Request Review

Use this skill when the user asks to review a GitHub pull request, especially by PR number, URL, or the current branch. The goal is to produce a focused review in the style of GitHub inline feedback: concrete, actionable, and tied to changed lines.

## Safety Boundary

Never submit a review, post a comment, approve, or request changes on GitHub until the user has seen the full draft and explicitly confirms the exact action. A request to "review" means draft first, not publish.

Use `gh` for GitHub operations when available. If the GitHub CLI is unavailable, unauthenticated, or cannot access the repository, explain the blocker and continue from any diff or PR context the user provided.

## Review Workflow

1. Identify the PR from the user's argument, PR URL, or current branch via `gh pr view`.
2. Gather the PR title, body, base branch, head SHA, changed files, and full diff.
3. Read repository guidance that applies to changed files, such as root `AGENTS.md`, `.github/copilot-instructions.md`, and any local instruction files in relevant directories.
4. Inspect recent file history when it clarifies intent or patterns, using `git log --oneline -- <file>` for a small representative set of changed files.
5. Review only issues introduced by this PR. Ignore pre-existing problems unless the PR makes them worse.
6. Keep only findings that have practical impact: correctness bugs, security issues, broken edge cases, authorization/data-leak risks, race conditions, API contract regressions, or clear violations of repository instructions.
7. Filter out pure style nits, formatting comments, and anything a linter/typechecker would catch automatically.
8. Every inline finding must point to an added or modified line on the PR's new-file side.

## Draft Format

Write the draft review in Brazilian Portuguese:

```markdown
### Draft Review — PR #<number>: <title>

**Minha recomendação: `<APPROVE|REQUEST_CHANGES|COMMENT>`**

> Justificativa: <one sentence explaining the chosen action>

**Resumo geral:**
<2-4 concise sentences summarizing the PR and the review result>

**Comentários inline (<N> no total):**

1. **`<path>:<line>`** — <brief actionable comment>
2. **`<path>:<line>`** — <brief actionable comment>

**Para enviar este review, responda com:**
`approve`, `request-changes`, `comment`, ou `cancel`.
```

Choose the recommendation as follows:

- `APPROVE`: no meaningful issues found.
- `REQUEST_CHANGES`: at least one issue should block merge.
- `COMMENT`: non-blocking feedback worth sharing.

If there are no inline comments, say that clearly and still include the recommendation and summary.

## Comment Style

Inline comments should be short and direct:

- Lead with the concrete problem and its impact.
- Suggest a fix when there is a clear one.
- Avoid compliments, hedging, and broad rewrites.
- Do not mention internal analysis steps or reviewer personas.

## Submission

Only after the user explicitly confirms:

- Map `approve` to `APPROVE`, `request-changes` to `REQUEST_CHANGES`, and `comment` to `COMMENT`.
- If there are inline comments, submit one review through the GitHub Pull Request Reviews API so comments attach to exact lines.
- Use a JSON payload file with `gh api --input`; do not pass the comments array via `-f` or `-F`, because those flags stringify arrays.
- If there are zero inline comments, `gh pr review` is acceptable.
- After submission, report the submitted review URL.

If the user edits the draft before approval, submit the edited content rather than the original draft.
