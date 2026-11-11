import assert from 'node:assert/strict';
import { test } from 'node:test';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { createAuthEndpoint } from 'better-auth/api';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { mcp, type McpOptions } from '@better-auth/mcp';
import { getOAuthProviderApi, type SchemaClient } from '@better-auth/oauth-provider';
import { z } from 'zod';

const resource = 'https://audit.invalid/api/mcp';
const clientId = 'synthetic-client';
const userId = 'synthetic-user';
const options: McpOptions = {
  resource,
  loginPage: '/login',
  consentPage: '/consent',
  scopes: ['posts:drafts:create', 'offline_access'],
  grantTypes: ['authorization_code', 'refresh_token'],
  disableJwtPlugin: true,
  refreshTokenReuseInterval: 0,
  accessTokenExpiresIn: 300,
  refreshTokenExpiresIn: 30 * 24 * 3600,
};

/** No network, panel users, secrets, storage, or PostgreSQL are used here. */
async function createHarness(database?: BetterAuthOptions['database']) {
  const now = new Date();
  const db: Record<string, Record<string, unknown>[]> = {
    user: [
      {
        id: userId,
        name: 'Synthetic user',
        email: 'synthetic@audit.invalid',
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    oauthClient: [
      {
        id: 'synthetic-client-row',
        clientId,
        name: 'Synthetic client',
        public: true,
        tokenEndpointAuthMethod: 'none',
        redirectUris: ['http://127.0.0.1/callback'],
        grantTypes: options.grantTypes,
        responseTypes: ['code'],
        scopes: options.scopes,
        createdAt: now,
        updatedAt: now,
      },
    ],
    oauthResource: [
      {
        id: 'synthetic-resource',
        identifier: resource,
        name: 'Synthetic resource',
        disabled: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
    oauthClientResource: [{ id: 'synthetic-link', clientId, resourceId: resource, createdAt: now }],
    oauthAccessToken: [],
    oauthRefreshToken: [],
    session: [],
    account: [],
    verification: [],
    oauthConsent: [],
    oauthClientAssertion: [],
  };
  const auth = betterAuth({
    baseURL: 'https://audit.invalid',
    basePath: '/api/mcp-auth',
    secret: 'synthetic-audit-fixture-secret-not-a-deployment-credential',
    database: database ?? memoryAdapter(db),
    logger: { disabled: true },
    onAPIError: { onError: () => undefined },
    plugins: [
      mcp(options),
      {
        id: 'synthetic-grant-fixture',
        endpoints: {
          mintFixtureGrant: createAuthEndpoint(
            '/fixture-mint',
            {
              method: 'POST',
              metadata: { SERVER_ONLY: true },
              body: z.object({ referenceId: z.string() }),
            },
            async (ctx) => {
              const client = await ctx.context.adapter.findOne<SchemaClient<string[]>>({
                model: 'oauthClient',
                where: [{ field: 'clientId', value: clientId }],
              });
              const user = await ctx.context.internalAdapter.findUserById(userId);
              assert(client && user);
              return getOAuthProviderApi(ctx, options, 'authorization_code').issueTokens({
                client,
                user,
                scopes: options.scopes ?? [],
                resources: [resource],
                referenceId: ctx.body.referenceId,
              });
            },
          ),
        },
      },
    ],
  });

  if (database) {
    await (await getMigrations(auth.options)).runMigrations();
    const { adapter } = await auth.$context;
    for (const [model, rows] of Object.entries(db)) {
      for (const data of rows) await adapter.create({ model, data, forceAllowId: true });
    }
  }

  async function mint(referenceId: string) {
    const tokens = await auth.api.mintFixtureGrant({ body: { referenceId } });
    assert(tokens.refresh_token, 'Fixture grant must issue a refresh token');
    return { ...tokens, refresh_token: tokens.refresh_token };
  }

  async function refresh(token: string) {
    const response = await auth.handler(
      new Request('https://audit.invalid/api/mcp-auth/oauth2/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          refresh_token: token,
          resource,
        }),
      }),
    );
    // Consume the response without printing credentials or provider payloads.
    await response.arrayBuffer();
    return response.status;
  }

  async function revoke(token: string) {
    const response = await auth.handler(
      new Request('https://audit.invalid/api/mcp-auth/oauth2/revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: clientId, token, token_type_hint: 'refresh_token' }),
      }),
    );
    await response.arrayBuffer();
    return response.status;
  }

  async function rows(model: string) {
    return (await auth.$context).adapter.findMany<Record<string, unknown>>({ model });
  }

  return { db, mint, refresh, revoke, rows };
}

test('provider issues opaque short-lived access tokens and hashes stored refresh tokens', async () => {
  const { db, mint } = await createHarness();
  const tokens = await mint('connection-a');
  assert.equal(tokens.expires_in, 300);
  assert.equal(tokens.access_token.split('.').length, 1);
  assert.notEqual(db.oauthRefreshToken[0].token, tokens.refresh_token);
  assert.notEqual(db.oauthAccessToken[0].token, tokens.access_token);
});

test('rotation preserves the original absolute refresh-token expiry', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  const { db, mint, refresh } = await createHarness();
  const tokens = await mint('connection-a');
  const originalExpiry = db.oauthRefreshToken[0].expiresAt as Date;
  t.mock.timers.tick(1000);
  assert.equal(await refresh(tokens.refresh_token), 200);
  const rotated = db.oauthRefreshToken.find((row) => !row.revoked);
  assert(rotated);
  assert(
    (rotated.expiresAt as Date).getTime() <= originalExpiry.getTime(),
    'Rotation must not extend the family beyond its original absolute expiry',
  );
});

test('reuse retains consumed-token evidence until family expiry', async () => {
  const { db, mint, refresh } = await createHarness();
  const tokens = await mint('connection-a');
  assert.equal(await refresh(tokens.refresh_token), 200);
  assert.equal(await refresh(tokens.refresh_token), 400);
  assert(
    db.oauthRefreshToken.some((row) => row.referenceId === 'connection-a' && row.rotatedAt),
    'Consumed-token evidence must survive replay detection',
  );
});

test('reuse in one connection preserves a separate grant for the same user and client', async () => {
  const { mint, refresh } = await createHarness();
  const first = await mint('connection-a');
  const second = await mint('connection-b');
  assert.equal(await refresh(first.refresh_token), 200);
  assert.equal(await refresh(first.refresh_token), 400);
  assert.equal(
    await refresh(second.refresh_token),
    200,
    'Replay handling must be scoped to the affected connection',
  );
});

test('replay revokes the successor and keeps the family root', async () => {
  const { db, mint, refresh } = await createHarness();
  const tokens = await mint('connection-a');
  assert.equal(await refresh(tokens.refresh_token), 200);
  assert.equal(await refresh(tokens.refresh_token), 400);
  assert.equal(db.oauthRefreshToken.length, 2);
  assert(db.oauthRefreshToken.every((row) => row.revoked));
  assert(db.oauthAccessToken.every((row) => row.revoked));
  const root = db.oauthRefreshToken.find((row) => row.familyId === row.id);
  assert(root?.familyRevokedAt);
  assert.equal(await refresh(tokens.refresh_token), 400);
  assert.equal(db.oauthRefreshToken.length, 2);
});

test('expired and legacy refresh families fail closed', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  const { db, mint, refresh } = await createHarness();
  const legacy = await mint('legacy-connection');
  delete db.oauthRefreshToken[0].familyId;
  assert.equal(await refresh(legacy.refresh_token), 400);
  const current = await mint('current-connection');
  t.mock.timers.tick(30 * 24 * 3600 * 1000);
  assert.equal(await refresh(current.refresh_token), 400);
});

test('revocation blocks the whole grant without deleting replay evidence or another connection', async () => {
  const { db, mint, refresh, revoke } = await createHarness();
  const first = await mint('connection-a');
  const other = await mint('connection-b');
  assert.equal(await refresh(first.refresh_token), 200);
  assert.equal(await revoke(first.refresh_token), 200);
  assert.equal(await refresh(first.refresh_token), 400);
  assert.equal(db.oauthRefreshToken.filter((row) => row.referenceId === 'connection-a').length, 2);
  assert.equal(await refresh(other.refresh_token), 200);
});

test('access tokens issued near absolute family expiry cannot outlive the family', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  const { db, mint, refresh } = await createHarness();
  const tokens = await mint('near-expiry');
  const expiry = db.oauthRefreshToken[0].expiresAt as Date;
  t.mock.timers.tick(30 * 24 * 3600 * 1000 - 1000);
  assert.equal(await refresh(tokens.refresh_token), 200);
  assert(db.oauthAccessToken.every((row) => (row.expiresAt as Date).getTime() <= expiry.getTime()));
});

const postgresUrl = process.env.MCP_PROVIDER_POSTGRES_URL;

test(
  'PostgreSQL serializes concurrent refresh and rolls back failed issuance',
  {
    skip: !postgresUrl,
  },
  async (t) => {
    assert(postgresUrl);
    const target = new URL(postgresUrl);
    assert.equal(target.port, '5434', 'Only the ephemeral E2E port is permitted');
    assert(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname));
    const pool = new Pool({ connectionString: postgresUrl });
    const schemaName = `mcp_audit_${randomUUID().replaceAll('-', '')}`;
    t.after(async () => {
      await pool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      await pool.end();
    });
    const { mint, refresh, revoke, rows } = await createHarness({
      dialect: new PostgresDialect({ pool }),
      type: 'postgres',
      transaction: true,
      schemaName,
    });
    const first = await mint('concurrent-connection');
    const independent = await mint('independent-connection');
    const statuses = await Promise.all([
      refresh(first.refresh_token),
      refresh(first.refresh_token),
    ]);
    assert.deepEqual(statuses.sort(), [200, 400]);
    const family = (await rows('oauthRefreshToken')).filter(
      (row) => row.referenceId === 'concurrent-connection',
    );
    assert.equal(family.length, 2);
    assert(family.every((row) => row.revoked));
    assert.equal(await refresh(independent.refresh_token), 200);

    const revocationRace = await mint('revocation-race');
    const [rotationStatus, revocationStatus] = await Promise.all([
      refresh(revocationRace.refresh_token),
      revoke(revocationRace.refresh_token),
    ]);
    assert([200, 400].includes(rotationStatus));
    assert.equal(revocationStatus, 200);
    const revokedFamily = (await rows('oauthRefreshToken')).filter(
      (row) => row.referenceId === 'revocation-race',
    );
    assert(revokedFamily.every((row) => row.revoked));

    const rollback = await mint('rollback-connection');
    // Fail after refresh consumption, at access-token insertion in the same transaction.
    await pool.query(
      `CREATE FUNCTION "${schemaName}".reject_access() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic issuance failure'; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER reject_access BEFORE INSERT ON "${schemaName}"."oauthAccessToken" FOR EACH ROW EXECUTE FUNCTION "${schemaName}".reject_access()`,
    );
    assert.equal(await refresh(rollback.refresh_token), 500);
    const unchanged = (await rows('oauthRefreshToken')).filter(
      (row) => row.referenceId === 'rollback-connection',
    );
    assert.equal(unchanged.length, 1);
    assert(!unchanged[0].revoked);
    await pool.query(`DROP TRIGGER reject_access ON "${schemaName}"."oauthAccessToken"`);
    assert.equal(await refresh(rollback.refresh_token), 200);
  },
);

test('official CIMD Node transport rejects loopback, private IPs and plaintext metadata', async () => {
  const { fetchClientMetadataResource } = await import('@better-auth/cimd/node');
  for (const destination of [
    'https://127.0.0.1/client.json',
    'https://[::1]/client.json',
    'https://10.0.0.1/client.json',
    'https://169.254.169.254/latest/meta-data/',
    'http://example.com/client.json',
  ]) {
    await assert.rejects(async () =>
      fetchClientMetadataResource(destination, { signal: AbortSignal.timeout(2000) }),
    );
  }
});
