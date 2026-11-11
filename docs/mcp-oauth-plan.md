# Issue #138 — MCP OAuth for draft creation

## Summary and agreed scope

Implementation status: application implementation and local acceptance are complete.
The isolated OAuth bridge, explicit consent, connection UI, two MCP tools, media
lifecycle, migrations and versioned provider correction are delivered. Codex,
Claude Code and Antigravity were connected through real browser consent and
created drafts. See [provider audit](mcp-oauth-provider-audit.md) and
[operations and verification](mcp-operations.md) for versions, checks and limits.
Production remains disabled by default; staging configuration and deployment
checks are required before production rollout. The approved requirements below
remain unchanged.

Implement a remote MCP server inside the existing Next.js deployment. Preserve NextAuth v4 as the authentication and authorization system for the panel. Better Auth serves only the MCP OAuth flow.

- MCP can prepare images and create complete drafts in a single creation call.
- Do not expose tools or scopes for listing, reading, editing, deleting, or publishing posts.
- A connection can create multiple drafts. Subsequent edits happen in the panel.
- Support cover and body images. Storage URLs remain public; authorization protects upload operations and attachment, not possession of a public URL.
- These decisions supersede the broader operations requested in the original issue.

## Existing authentication compatibility

- Preserve `/api/auth/*`, Credentials login, NextAuth cookies, sessions, logout, `AuthProvider`, `useAuth()`, and existing guards.
- Mount Better Auth under `/api/mcp-auth/*`, with separate cookie names, cookie paths, secret, and OAuth tables.
- Do not migrate passwords or enable signup, password recovery, or an alternative login through Better Auth.
- Better Auth cookies and MCP bearer tokens must never authenticate panel pages or APIs. NextAuth cookies must never authenticate MCP tool requests.
- Permit member draft creation only through explicitly authorized MCP access. Preserve the existing administrative restriction on `POST /api/admin/posts`.

## OAuth and connection lifecycle

- Use Better Auth with its MCP and CIMD packages and the official TypeScript MCP SDK. Pin compatible dependency versions and use the repository-required Node.js version.
- Follow the MCP 2026-07-28 authorization profile, confirming the applicable specification and library APIs during implementation.
- Serve `/api/mcp` through Streamable HTTP in the Node runtime, without sharing authenticated transport context between requests.
- Publish RFC 9728 Protected Resource Metadata at root and resource-specific paths, authorization server discovery, and appropriate `WWW-Authenticate` challenges.
- Use a configured canonical origin. Exclude protocol endpoints from locale negotiation.
- Enable Authorization Code with PKCE S256 for public clients. Use CIMD with the library's secure metadata transport; leave Dynamic Client Registration disabled.
- Validate client metadata against SSRF, DNS rebinding, oversized responses, redirects, and unexpected destinations. Never implement OAuth cryptography manually.
- Create the internal OAuth browser session only after validating NextAuth and the current database user. Protect the bridge with POST, CSRF, origin verification, and a valid OAuth transaction. Never accept browser-supplied identity or role.
- Keep the internal session short-lived and restricted to authorization. A subsequent authorization requires a fresh NextAuth check.
- Show explicit consent for each connection, including client identity, metadata origin, full redirect destination, and selectable scopes. Distinguish client-declared names from verified provenance.
- Validate redirects and transaction integrity through the provider. Permit only the native loopback port exception required by the applicable standard.
- Create a separate connection for each explicit authorization, including repeated authorizations of the same user and client. Bind consent, code, tokens, and prepared images to that connection.
- Use opaque access tokens lasting five minutes and provider-supported local validation/introspection. Validate issuer, audience/resource, expiry, scopes, current user access, and connection state on every call and refresh.
- Refresh tokens have a 30-day absolute lifetime, hashed storage, atomic rotation, and family revocation on reuse. Retain consumed-token evidence until family expiry. Disable refresh reuse grace periods.
- Add `/admin/connections`, protected by NextAuth, to list and revoke only the signed-in user's connections individually or collectively.
- Revocation immediately blocks calls and refresh. Account deletion invalidates internal sessions and connections. Panel logout clears the internal OAuth browser session; CLI grants persist until revocation or expiry.

## Tools and domain rules

| Tool                 | Scope                  | Interface                                                                                                                    |
| -------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `prepare_post_image` | `posts:images:prepare` | Accept MIME type and base64 bytes; return a temporary reference and URL.                                                     |
| `create_post_draft`  | `posts:drafts:create`  | Accept bilingual content, content format, image references, and an idempotency key; return ID, draft status, and panel link. |

- Use strict input schemas. Reject client-supplied author, role, publication status, publication timestamps, and arbitrary storage paths.
- Resolve authorship from authenticated server identity. Always set `status=draft` and `publishedAt=null`, including for administrative users.
- Never trigger publication or LinkedIn side effects from MCP creation.
- Extract reusable creation and validation services while respecting FSD. Keep entrypoint-specific guards and reuse current normalization, translations, and Markdown/HTML sanitization.
- Scope idempotency keys to a connection. Retries must not duplicate drafts; the same key with different input returns a conflict without disclosing stored content.

## Image preparation and persistence

- Prepare images before draft creation, explicitly replacing the original requirement for an existing post.
- Accept JPEG, PNG, WebP, and AVIF up to 3 MiB per image, accommodating base64 within the deployment request limit. Verify bytes and declared MIME using existing validators.
- Store preparations with user, connection, random object key, lifecycle state, and a 24-hour expiry. Reject foreign, expired, or consumed references.
- Atomically consume referenced preparations and attach them to the new draft. Resolve references used in cover and body content.
- Prevent association of another connection's managed objects through forged paths or URLs, including managed URLs embedded in content.
- Add a post media relationship for body images. Integrate panel cover replacement and deletion so an image still referenced by body content or either translation is retained.
- Run authenticated daily cleanup within the deployment. Handle concurrent creation and cleanup, retry storage failures, and delete only expired preparations or objects confirmed to be unreferenced. Do not delete attached images merely because they are old.
- Use additive PostgreSQL migrations for provider data, connections, preparations, media references, and idempotency. Preserve existing credentials and NextAuth session compatibility.

## Operational security

- Persist rate limits in PostgreSQL rather than relying on per-instance memory.
- Defaults: authorization 30/minute, token endpoint 20/minute, MCP 60/minute per connection, creation 10/hour per user, and image preparation 30/hour per user. Add IP limits and `Retry-After` responses.
- Record security outcomes using internal identifiers and safe codes. Exclude credentials, codes, cookies, URL queries, post content, base64, and personal data from logs, Discord, and PostHog.
- Isolate database, secrets, issuer, resource, and storage between environments. Enable in staging first; production remains disabled until validation completes.
- Document configuration, operations, cleanup, public-image behavior, supported clients, SSRF/confused-deputy threats, and residual risks.
- Update `AGENTS.md` to document the MCP-only member creation exception and integration boundaries.

## Required verification

### Existing NextAuth regression

- Correct and incorrect credentials, nonexistent user, invalid CSRF, session retrieval, and real NextAuth logout.
- Cookie security attributes in development and production HTTPS.
- Existing NextAuth sessions survive OAuth connection, rejected consent, and MCP revocation.
- Allowed and denied panel/API access for `admin`, `editor`, `member_manager`, and `member`.
- Members still cannot create through the admin API, publish, delete, or access another user's restricted data.
- Account deletion, role changes, self-deletion protection, and last-administrator protection.
- OAuth outage or invalid configuration does not break panel login or unrelated operations.

### Authentication boundary matrix

Test no credentials, NextAuth cookie, Better Auth cookie, MCP token, external token, and conflicting combinations:

- NextAuth cookie alone cannot execute MCP tools.
- Better Auth cookie and MCP token cannot authenticate panel routes.
- Token for user A with cookie for user B never executes as B.
- The bridge rejects forged identity, role, connection, transaction, or origin.
- Switching browser users cannot reuse the previous OAuth identity.
- No extra Better Auth endpoint permits account creation, direct login, or privilege expansion.

### OAuth, tools, and storage

- Accepted/denied/tampered consent, invalid redirects, wrong PKCE, reused authorization codes, expired tokens, wrong audience, missing scopes, removed user, and revoked connections.
- Two users, two clients per user, repeated connections for the same client, and concurrent requests without identity leakage.
- Concurrent refresh, refresh reuse detection, individual/global revocation, reconnection, and account deletion.
- Forged requests for listing, reading, editing, publishing, deleting, or selecting another author.
- Bilingual content, sanitization, member draft creation, idempotency, and no publication/LinkedIn effects.
- Invalid, oversized, forged, expired, and foreign images; storage outages; rate limits; cleanup races; retention of images still in use.
- Automated assertions that logs and telemetry contain no credentials or content.
- Unit tests, PostgreSQL/storage integration tests, and browser E2E for consent and connection management. Use the ephemeral E2E database on port 5434, never the development database.

### Real clients and release acceptance

- Connect local Codex to the running server before release and complete browser login, consent, image preparation, and draft creation. Confirm the resulting draft in the panel and absence from public post APIs.
- Validate Codex, Claude Code, and Antigravity CLI using real versions; record OS, versions, commands, redirects, discovery behavior, renewal, and verified limitations. Documentation support alone is insufficient.
- Run `npx tsc --noEmit` and all five repository gates: `npm run lint`, `npm run format`, `npm run build`, `npm run test`, and `npm run test:e2e`.
- Resolve failing checks before marking implementation complete. Record security findings and residual risks without claiming tests prove the absence of all vulnerabilities.
- Commit and open a PR describing the delivered behavior, isolation guarantees, validation evidence, and deployment configuration. Do not describe an incomplete integration as implemented.

## References

- [MCP authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [MCP security best practices](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)
- [Better Auth MCP](https://better-auth.com/docs/plugins/mcp)
- [Better Auth CIMD](https://better-auth.com/docs/plugins/cimd)
- [Better Auth OAuth provider](https://better-auth.com/docs/plugins/oauth-provider)
- [Codex MCP documentation](https://learn.chatgpt.com/docs/extend/mcp)
- [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp)
- [Antigravity MCP documentation](https://antigravity.google/docs/mcp?tab=cli)
