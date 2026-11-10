# MCP operations and release checklist

## Configuration

Run the additive Prisma migration before enabling MCP. It creates isolated
`mcp_oauth` tables and public media, browser-transaction, idempotency and rate-limit
tables without changing existing passwords or NextAuth sessions.

Set `MCP_ENABLED=true`, `MCP_CANONICAL_ORIGIN` to the exact deployment origin,
and an independent `MCP_AUTH_SECRET` of at least 32 characters. HTTPS is required
except on loopback. Keep `NEXTAUTH_URL` aligned with that origin. Configure an
independent `CRON_SECRET` of at least 32 characters for the daily authenticated
`GET /api/internal/mcp-cleanup` job. Never expose these secrets to client code.
MCP PostgreSQL connections verify TLS certificates; configure `DATABASE_SSL_CA`
when the database uses a private CA. Never disable verification to fix connectivity.

Use separate databases, buckets, canonical origins and secrets per environment.
Enable staging first. Production remains disabled until every acceptance item in
[mcp-oauth-plan.md](mcp-oauth-plan.md) passes. Disabling new authorizations does not
prevent users from revoking existing grants in their NextAuth account.

## Member experience

Own-account pages and `/admin/connections` provide separate Codex, Claude Code
and Antigravity setup instructions generated from the current browser origin.
Users explicitly open each guide. The status means an unexpired authorization
exists, not that the external program is online. Unknown clients remain visible.
Users can revoke one connection or all their connections; browser logout leaves
explicitly authorized CLI grants intact until revocation or expiry.

Only the authorization browser bridge uses a short internal Better Auth session.
Every connection checks NextAuth and the current database user and displays
explicit consent, client metadata origin, full redirect and selectable scopes.
External HTTP routes never expose internal bridge, account or signup APIs.

## Token and media lifecycle

Access tokens are opaque, hashed at rest and expire in five minutes. Refresh
families rotate atomically, expire 30 days after initial issuance, retain consumed
hashes and revoke the whole affected family on replay. Separate authorizations
remain independent. Current database identity and connection state are checked
on calls and refresh. Account deletion cascades through provider identities.

Images are public objects. A URL is not an authorization boundary. Only uploads
and attachment are authorized. JPEG, PNG, WebP and AVIF are limited to 3 MiB;
preparations expire after 24 hours. Creating a draft atomically consumes its own
connection's selected references. The two tools cannot publish or invoke LinkedIn.

Daily cleanup claims deletion under the same database media lock used by post
writes, commits the claim, deletes storage, then removes tracking. Failed deletion
retains a retryable claim. Cleanup scans existing cover/body/translations before
removing an object and repairs missing media relations. Each invocation is bounded
to 240 seconds and 1,000 objects; monitor backlog and run the authenticated job
again if needed. Do not bypass shared media writes with direct database updates.
Retain cleanup capability after disabling MCP while tracked objects remain.

## Security and support

Rate limits are shared in PostgreSQL: authorization 30/minute per IP, token
20/minute per IP, tools 60/minute per connection, drafts 10/hour per user and
images 30/hour per user, plus an MCP IP limit. Security logs contain fixed outcome
codes and internal identifiers, never credentials, content or OAuth query strings.
Consent pages disable external resources, framing and referrer transmission.

CIMD uses the official Node transport with resolved-address pinning and redirect
rejection. Dynamic Client Registration is disabled. Declared client names are not
verified identities. Treat a new metadata origin as an untrusted third party;
users must review its redirect and scopes. Public image URLs, compromised client
credential stores and malicious authorized content remain residual risks.

The pinned provider requires `patches/@better-auth+oauth-provider+1.7.19.patch`.
Installation fails if it cannot apply. Review upstream upgrades against the audit
and run both provider suites before removing the patch. It changes transaction,
family and session persistence; cryptography remains in the provider.

## Verification record

OAuth integration passes 15 tests, including a real Chromium flow, against ephemeral PostgreSQL
on port 5434 and isolated LocalStack on port 4567. These cover discovery, consent
boundaries, tools/scopes, member draft ownership, idempotency, public API exclusion,
image ownership/retention, refresh replay, individual/global revocation and browser
session independence. Unit checks cover security logs, media retention/retry, connection boundaries and
existing panel behavior.
These results do not replace real-client and browser acceptance.

Real clients verified on Linux on 2026-11-10, against loopback port 3017:

| Client                  | Version | Discovery and redirect                                                                                                               | Verified result                                                                      |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Codex CLI               | 0.167.0 | CIMD `https://chatgpt.com/oauth/codex/client.json`, native `127.0.0.1` ephemeral-port callback                                       | Browser login/consent, token renewal, image preparation and bilingual draft creation |
| Claude Code             | 2.1.322 | CIMD `https://claude.ai/oauth/claude-code-client-metadata`, native `localhost` callback                                              | Browser consent, token renewal and draft creation                                    |
| Antigravity CLI (`agy`) | 1.5.5   | CIMD `https://antigravity.google/oauth/client-metadata.json`, `https://antigravity.google/oauth-callback`, pasted authorization code | Browser consent, both tools loaded and draft creation                                |

Tests used temporary configuration/server name `kiwibit-local-qa`, a synthetic
member and isolated E2E storage/database. Codex used a session configuration URL
override and `mcp login --no-browser`; Claude used local project registration and
`mcp login --no-browser`; Antigravity used `agy mcp add --type http`, `/mcp`, then
Authenticate. Only the exact test tools were authorized in the headless sessions.
No permanent broad approval settings were changed.

Chromium confirmed explicit consent, the native/cloud callbacks, the created
Codex draft in the authenticated editor and HTTP 404 from its public post API.
The connection screen showed all three actual authorizations, no automatically
opened guides, current-origin commands and no horizontal overflow at mobile size.

Real browser testing caught two issues that synthetic HTTP requests missed:
`no-referrer` makes browser form Origin null, and a self-only form CSP blocks the
validated external callback after POST. Consent now sends only origin as referrer
and permits that provider-validated redirect origin in its form CSP. Server-side
Origin, single-use transaction and CSRF checks remain mandatory. Real CIMD testing
also caught server-side validation using the pre-extension options: it now uses
the final provider options containing CIMD resolution.

Local gates: `npx tsc --noEmit`, `npm run format`, `npm run lint`, `npm run build`,
`npm run test` and `MCP_BROWSER_TESTS=true E2E_PORT=3017 npm run test:e2e`.
The complete E2E suite passes 120 tests. `npm run test:mcp-provider:postgres`
passes all 10 checks, including PostgreSQL concurrency/rollback and private-address
CIMD rejection. A clean `npm ci` reapplies the pinned provider patch successfully.
Build requires `DATABASE_URL`; the CI placeholder URL suffices for build-only use.

Browser checks require Chrome/Chromium and ChromeDriver on PATH (or set
`CHROMEDRIVER_PATH`). CI enables `MCP_BROWSER_TESTS=true` on Ubuntu 24.04 and runs
provider PostgreSQL checks before the E2E suite. Both database suites use port
5434 and must run sequentially. LocalStack uses only the test bucket on port 4567.
Non-Vercel ingress headers are untrusted; local requests share an IP rate bucket.

These local results do not verify production HTTPS cookies, database TLS chains,
Discord destinations, replay consent/masking, source maps or external deployment
network policy. Verify those on staging before enabling production. Remote/headless
users must forward native callback ports or use the client's manual callback flow.
Antigravity's cloud callback and pasted code were verified; automatic refresh on
that client has not yet been observed. Codex and Claude renewal were observed.
