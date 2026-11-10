# MCP OAuth provider compatibility audit

## Implementation status

The OAuth bridge, discovery, MCP tools, connection UI, migrations and image
lifecycle are implemented. NextAuth remains the sole panel authentication system.
Synthetic browser-protocol integration tests exercise real PostgreSQL and S3.
Real Codex, Claude Code and Antigravity authorizations and draft creation were
verified locally, together with Chromium consent and revocation. Production
remains disabled by default until staging rollout verification.

## Reproduction

The compatibility suite is `tests/security/mcp-oauth-provider.test.mts`:

```bash
npm run test:mcp-provider
```

Use Node.js 24.22.2, as required by this repository. The suite pins Better Auth,
its MCP plugin, and its OAuth provider to 1.7.19. The provider is mounted only under `/api/mcp-auth` in Next.js. The repository applies a local dependency patch at install time using
`patch-package --error-on-fail`; a failed patch must fail installation.

The fixture uses the provider's public server-side issuance API to create two
grants with distinct `referenceId` values for the same synthetic user and client.
Refresh and replay requests then use the real provider HTTP token endpoint.
Opaque tokens, a 300-second access-token lifetime, hashed storage, and
`refreshTokenReuseInterval: 0` are configured explicitly.

The fixture uses the official in-memory adapter, synthetic identities, and an
`.invalid` origin. Its base mode does not contact external clients. The optional PostgreSQL mode
tests database concurrency and rollback. Application E2E tests separately cover
authorization-code exchange, consent, revocation and storage. Real CIMD client
compatibility requires the release checks in the plan. The fixture issuance endpoint
is server-only and exists only inside the test process.

## Original observed failures

Without the local patch, three acceptance assertions fail with these versions:

| Requirement                                           | Observed result                                                                                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Refresh families have a 30-day absolute lifetime      | Advancing the clock before rotation moves the successor's expiry past the original expiry.                                              |
| Retain consumed-token evidence until family expiry    | Replaying a consumed refresh token removes the stored refresh rows, including consumed-token evidence.                                  |
| Keep separate connections for repeated authorizations | Replaying connection A's consumed token invalidates connection B for the same user and client. B's subsequent refresh returns HTTP 400. |

The control assertion passes: access tokens are opaque with a 300-second lifetime,
and stored access and refresh token values differ from the returned credentials.
That assertion checks storage representation, not cryptographic strength.

The unpatched provider implementation corroborated these observations:

- `resolveResourceGrantIssuance` computes refresh expiry from the current issuance
  time plus the configured TTL.
- `invalidateRefreshFamily` selects and deletes rows using `clientId` and
  `userId`, without constraining the authorization reference or code family.
- `createRefreshToken` consumes the old row and creates its successor as separate
  adapter operations. The package also records a possible race between family
  invalidation and concurrent issuance. The patched behavior is tested with competing PostgreSQL transactions.

These are compatibility failures for the approved application requirements.
They are not a claim that all provider configurations or deployments are
vulnerable, or that the tests establish the absence of other issues.

## Delivered correction

`patches/@better-auth+oauth-provider+1.7.19.patch` changes persistence, not token
cryptography. Each authorization receives a separate root refresh row. The new
`familyId` column points to that immutable root; `familyRevokedAt` records family
revocation on it. PostgreSQL row updates serialize rotation, replay handling,
and revocation on that root inside real database transactions. An adapter without
transactions is rejected rather than silently losing rollback guarantees.

Rotation keeps the previous absolute expiry. Replay revocation commits before
the error is returned, updates only that family, and preserves hashes and
`rotatedAt` evidence. Token issuance rolls back consumption if successor or access
token persistence fails. Authorization-code replay cleanup and the revocation
endpoint also retain evidence. Legacy refresh rows without a family root fail
closed and require fresh authorization. Regenerate the provider schema with the
patched version before mounting it; existing installations need additive
`familyId` and `familyRevokedAt` columns and an index on `familyId`.

Run the PostgreSQL checks separately from the normal E2E suite because both use
the same ephemeral database on port 5434:

```bash
npm run test:mcp-provider:postgres
```

The PostgreSQL suite validates competing rotations, a rotation/revocation race,
independent grants, and rollback after a synthetic access-token insertion failure.
It creates an isolated schema in the ephemeral database and removes it afterwards.
It never accesses the development database on port 5433.

The member panel appears on the signed-in member's own edit page, after the
LinkedIn area when that area is present, and on the unlinked account page. It is
also reachable at `/admin/connections`. Separate Codex, Claude Code, and
Antigravity guides use the browser's current origin and different server names
per environment. The guides are based on the official documentation; real CLI
validation is recorded separately in `mcp-operations.md`; unit tests alone do not
establish client compatibility.

`/api/admin/connections` uses NextAuth and a fresh database user check. It projects
only public connection metadata from provider family roots belonging to that user.
Revocation checks origin and takes the same PostgreSQL root lock as refresh. It
works even when new authorizations are disabled. Provider outages produce an
unavailable status, not a false disconnected status. Missing provider tables mean
there are no stored grants; the API does not create or migrate tables on demand.

Client cards are classified by stored metadata origins, not client-declared names.
Unknown clients remain visible with their own revoke action. “Connected” means an
unexpired authorization exists; it does not claim the external application is online.

## Required next work

Keep the compatibility suite passing when upgrading the provider. Review and
remove the local patch only when the upstream version provides the same guarantees.
Application-level connection validation
must still enforce current user access and revocation on every call and refresh.
Do not weaken the approved requirements or rely on a process-local lock.

Browser E2E and real CLI validation are recorded in `mcp-operations.md`. Re-run all five
repository gates and the PostgreSQL provider suite after any provider upgrade.
The application disables browser-session binding for CLI grants: short bridge
sessions expire independently, while current panel-user and grant checks continue
on calls and refresh. Global revocation locks the provider user row; new grants
acquire that same lock before issuance to serialize concurrent authorization.

## References checked

- [MCP 2026-07-28 authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [Better Auth MCP](https://better-auth.com/docs/plugins/mcp)
- [Better Auth CIMD](https://better-auth.com/docs/plugins/cimd)
- [Better Auth OAuth provider](https://better-auth.com/docs/plugins/oauth-provider)

The published MCP and CIMD documentation describes the July 2026 profile and the
Node transport that pins resolved addresses and rejects redirects. Those features
alone did not resolve the original refresh lifecycle failures.
