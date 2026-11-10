import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { Pool } from 'pg';
import { hash } from 'bcryptjs';
import { ApiClient } from './helpers/client';
import { makeAdminClient, signInAsAdmin } from './helpers/auth';
import { verifyMcpBrowserFlow } from './helpers/mcp-browser';
import { BASE_URL } from './helpers/constants';

const scopes = ['posts:drafts:create', 'posts:images:prepare', 'offline_access'];
const clientId = 'kiwibit-security-test';
const redirectUri = 'http://127.0.0.1/callback';
const resource = `${BASE_URL}/api/mcp`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hiddenFields(html: string): Record<string, string> {
  return Object.fromEntries(
    [...html.matchAll(/type="hidden" name="([^"]+)" value="([^"]*)"/g)].map((match) => [
      match[1],
      match[2].replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'"),
    ]),
  );
}

async function beginAuthorization(browser: ApiClient) {
  const verifier = randomBytes(32).toString('base64url');
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    resource,
    state: randomBytes(16).toString('hex'),
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  });
  let page = await browser.get(`/api/mcp-auth/oauth2/authorize?${query}`, { accept: 'text/html' });
  if (page.headers.get('content-type')?.includes('application/json')) {
    const continuation = (await page.json()) as { url: string };
    const destination = new URL(continuation.url, BASE_URL);
    expect(destination.origin).toBe(BASE_URL);
    expect(destination.pathname).toBe('/api/mcp-auth/browser');
    page = await browser.get(destination.pathname + destination.search);
  }
  expect(page.status).toBe(200);
  const html = await page.text();
  expect(html.includes('Autorizar conexão')).toBe(true); // NOSONAR: Avoid printing the full consent HTML and its CSRF credentials when this assertion fails.
  return { verifier, fields: hiddenFields(html) };
}

async function authorize(browser: ApiClient, granted = scopes) {
  const { verifier, fields } = await beginAuthorization(browser);
  const consent = await browser.postForm(
    '/api/mcp-auth/browser',
    { ...fields, scope: granted, accept: 'yes' },
    { origin: BASE_URL },
  );
  expect(consent.status).toBe(303);
  const code = new URL(consent.headers.get('location')!).searchParams.get('code');
  expect(typeof code).toBe('string');
  const response = await fetch(`${BASE_URL}/api/mcp-auth/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code: code!,
      code_verifier: verifier,
      resource,
    }),
  });
  expect(response.status).toBe(200);
  const tokens = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  expect(tokens.expires_in).toBe(300);
  return { ...tokens, code: code!, verifier };
}

async function rpc(token: string, method: string, params: unknown) {
  return fetch(resource, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': '2025-11-25',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: randomUUID(), method, params }),
  });
}

async function readRpc(response: Response) {
  const text = await response.text();
  const data = response.headers.get('content-type')?.includes('text/event-stream')
    ? text
        .split('\n')
        .find((line) => line.startsWith('data:'))
        ?.slice(5)
        .trim()
    : text;
  expect(typeof data).toBe('string');
  return JSON.parse(data!) as {
    result: {
      isError?: boolean;
      content: Array<{ text: string }>;
      tools?: Array<{ name: string }>;
    };
  };
}

describe('MCP OAuth isolation and draft creation', () => {
  let admin: ApiClient;
  let member: ApiClient;
  let memberId: string;

  beforeAll(async () => {
    expect(new URL(process.env.DATABASE_URL!).port).toBe('5434');
    admin = makeAdminClient();
    await signInAsAdmin(admin);
    member = new ApiClient(BASE_URL);
    memberId = randomUUID();
    const password = randomBytes(24).toString('base64url');
    const email = `${memberId}@kiwibit.test`;
    await pool.query(
      'INSERT INTO public.users(id,name,email,password,role,created_at,updated_at) VALUES($1,$2,$3,$4,$5,NOW(),NOW())',
      [memberId, 'Synthetic MCP member', email, await hash(password, 4), 'member'],
    );
    const csrf = (await (await member.get('/api/auth/csrf')).json()) as { csrfToken: string };
    await member.postForm('/api/auth/callback/credentials', {
      csrfToken: csrf.csrfToken,
      email,
      password,
      json: 'true',
      callbackUrl: BASE_URL,
    });
    await pool.query(
      `INSERT INTO mcp_oauth."oauthClient" (id,"clientId",name,"redirectUris","grantTypes","responseTypes",scopes,"tokenEndpointAuthMethod","applicationType","requirePKCE","createdAt","updatedAt") VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,'none','native',true,NOW(),NOW())`,
      [
        randomUUID(),
        clientId,
        'Synthetic MCP test client',
        JSON.stringify([redirectUri]),
        JSON.stringify(['authorization_code', 'refresh_token']),
        JSON.stringify(['code']),
        JSON.stringify(scopes),
      ],
    );
    await pool.query(
      `INSERT INTO mcp_oauth."oauthResource"(id,identifier,name,"createdAt","updatedAt") VALUES($1,$2,$3,NOW(),NOW()) ON CONFLICT (identifier) DO NOTHING`,
      [randomUUID(), resource, 'Kiwibit test resource'],
    );
    await pool.query(
      `INSERT INTO mcp_oauth."oauthClientResource"(id,"clientId","resourceId") VALUES($1,$2,$3)`,
      [randomUUID(), clientId, resource],
    );
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM public.mcp_rate_limits');
    await pool.query('DELETE FROM mcp_oauth."rateLimit"');
  });
  afterAll(async () => {
    await pool.query('DELETE FROM public.posts WHERE author_id=$1', [memberId]);
    await pool.query('DELETE FROM public.users WHERE id=$1', [memberId]);
    await pool.query('DELETE FROM mcp_oauth."oauthClient" WHERE "clientId"=$1', [clientId]);
    await pool.end();
  });

  it('publishes resource-specific discovery without locale negotiation', async () => {
    const response = await fetch(`${BASE_URL}/.well-known/oauth-protected-resource/api/mcp`, {
      redirect: 'manual',
    });
    expect(response.status).toBe(200);
    expect((await response.json()).resource).toBe(resource);
    const metadata = await fetch(`${BASE_URL}/.well-known/oauth-authorization-server/api/mcp-auth`);
    expect(metadata.status).toBe(200);
    const document = await metadata.json();
    expect(document.client_id_metadata_document_supported).toBe(true);
    expect(document.registration_endpoint).toBeUndefined();
    expect(document.code_challenge_methods_supported).toEqual(['S256']);
  });

  it('does not accept a NextAuth session or foreign cookie as MCP authentication', async () => {
    const denied = await admin.get('/api/mcp');
    expect(denied.status).toBe(401);
    expect(denied.headers.get('www-authenticate')).toContain('oauth-protected-resource/api/mcp');
    const foreign = await fetch(resource, {
      headers: { cookie: 'kiwibit-mcp.session_token=synthetic' },
    });
    expect(foreign.status).toBe(401);
  });

  it('rejects forged browser consent and denied consent preserves the panel session', async () => {
    const first = await beginAuthorization(admin);
    const forged = await admin.postForm(
      '/api/mcp-auth/browser',
      { ...first.fields, accept: 'yes', scope: scopes, userId: memberId },
      { origin: BASE_URL },
    );
    expect(forged.status).toBe(400);
    const wrongOrigin = await admin.postForm(
      '/api/mcp-auth/browser',
      { ...first.fields, accept: 'yes', scope: scopes },
      { origin: 'https://attacker.invalid' },
    );
    expect(wrongOrigin.status).toBe(403);
    const denied = await admin.postForm(
      '/api/mcp-auth/browser',
      { ...first.fields, accept: 'no', scope: scopes },
      { origin: BASE_URL },
    );
    expect(denied.status).toBe(303);
    expect(new URL(denied.headers.get('location')!).searchParams.get('error')).toBe(
      'access_denied',
    );
    expect((await admin.get('/api/auth/session')).status).toBe(200);
  });

  it('creates one sanitized bilingual member draft, isolates panel auth, and revokes access', async () => {
    const tokens = await authorize(member);
    const panel = await fetch(`${BASE_URL}/api/admin/posts`, {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });
    expect(panel.status).toBe(401);
    expect(
      (await member.post('/api/admin/posts', { title: 'Forbidden', content: 'Cannot create here' }))
        .status,
    ).toBe(403);
    const input = {
      titlePt: 'Rascunho de integração',
      titleEn: 'Integration draft',
      contentPt: '<p>Conteúdo completo em português.</p><script>private_marker</script>',
      contentEn: '<p>Complete English draft content.</p>',
      contentFormat: 'html',
      idempotencyKey: randomUUID(),
    };
    const call = () =>
      rpc(tokens.access_token, 'tools/call', { name: 'create_post_draft', arguments: input });
    const first = await admin.post(
      '/api/mcp',
      {
        jsonrpc: '2.0',
        id: randomUUID(),
        method: 'tools/call',
        params: { name: 'create_post_draft', arguments: input },
      },
      {
        authorization: `Bearer ${tokens.access_token}`,
        accept: 'application/json, text/event-stream',
        'mcp-protocol-version': '2025-11-25',
      },
    );
    expect(first.status).toBe(200);
    const result = await readRpc(first);
    expect(result.result.isError).not.toBe(true);
    const draft = JSON.parse(result.result.content[0].text) as { id: string; status: string };
    expect(draft.status).toBe('draft');
    const retry = await readRpc(await call());
    expect(JSON.parse(retry.result.content[0].text).id).toBe(draft.id);
    const saved = await pool.query(
      'SELECT author_id,status,published_at,content_pt FROM public.posts WHERE id=$1',
      [draft.id],
    );
    expect(saved.rows[0].author_id).toBe(memberId);
    expect(saved.rows[0].published_at).toBeNull();
    expect(saved.rows[0].content_pt).not.toContain('script');
    const conflict = await readRpc(
      await rpc(tokens.access_token, 'tools/call', {
        name: 'create_post_draft',
        arguments: { ...input, titlePt: 'Another draft title' },
      }),
    );
    expect(conflict.result.isError).toBe(true);
    expect(JSON.parse(conflict.result.content[0].text).error.code).toBe('IDEMPOTENCY_CONFLICT');
    expect((await fetch(`${BASE_URL}/api/posts/${draft.id}`)).status).toBe(404);
    const connections = await (await member.get('/api/admin/connections')).json();
    expect(connections.connections.length).toBeGreaterThan(0);
    const revoke = await member.delete(`/api/admin/connections/${connections.connections[0].id}`, {
      origin: BASE_URL,
    });
    expect(revoke.status).toBe(200);
    expect((await rpc(tokens.access_token, 'tools/list', {})).status).toBe(401);
    await pool.query('DELETE FROM public.posts WHERE id=$1', [draft.id]);
  });

  it('rejects refresh reuse without affecting another authorization for the same client', async () => {
    const first = await authorize(admin);
    const second = await authorize(admin);
    const refresh = (token: string) =>
      fetch(`${BASE_URL}/api/mcp-auth/oauth2/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          refresh_token: token,
          resource,
        }),
      });
    expect((await refresh(first.refresh_token)).status).toBe(200);
    expect((await rpc(first.access_token, 'tools/list', {})).status).toBe(200);
    expect((await refresh(first.refresh_token)).status).toBe(400);
    expect((await rpc(first.access_token, 'tools/list', {})).status).toBe(401);
    expect((await refresh(second.refresh_token)).status).toBe(200);
    expect((await admin.get('/api/auth/session')).status).toBe(200);
  });

  it('exposes only creation tools, rejects ungranted scopes, and blocks alternative login endpoints', async () => {
    const tokens = await authorize(admin, ['posts:images:prepare', 'offline_access']);
    const listing = await readRpc(await rpc(tokens.access_token, 'tools/list', {}));
    expect(listing.result.tools?.map((tool) => tool.name).sort()).toEqual([
      'create_post_draft',
      'prepare_post_image',
    ]);
    const forbidden = await rpc(tokens.access_token, 'tools/call', {
      name: 'create_post_draft',
      arguments: {
        titlePt: 'Forbidden draft',
        contentPt: 'This permission was not granted.',
        contentFormat: 'text',
        idempotencyKey: randomUUID(),
      },
    });
    expect([200, 403]).toContain(forbidden.status);
    const body = await forbidden.text();
    expect(
      body.includes('insufficient_scope') ||
        body.includes('INSUFFICIENT_SCOPE') ||
        forbidden.status === 403,
    ).toBe(true);
    for (const path of [
      'sign-up/email',
      'sign-in/email',
      'panel-bridge',
      'validate-access',
      'oauth2/register',
    ]) {
      expect((await admin.post(`/api/mcp-auth/${path}`, {})).status).toBe(404);
    }
  });

  it('prepares public images and rejects foreign, forged and consumed references', async () => {
    const first = await authorize(member);
    const other = await authorize(member);
    const png =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6k0kAAAAASUVORK5CYII=';
    const prepared = await readRpc(
      await rpc(first.access_token, 'tools/call', {
        name: 'prepare_post_image',
        arguments: { mimeType: 'image/png', bytesBase64: png },
      }),
    );
    expect(prepared.result.isError).not.toBe(true);
    const image = JSON.parse(prepared.result.content[0].text) as {
      reference: string;
      placeholder: string;
      url: string;
    };
    expect((await fetch(image.url)).status).toBe(200);
    const input = {
      titlePt: 'Draft with a prepared image',
      contentPt: `<p>Complete body with a prepared image.</p><img src="${image.placeholder}">`,
      contentFormat: 'html',
      coverImageRef: image.reference,
      imageRefs: [image.reference],
      idempotencyKey: randomUUID(),
    };
    const foreign = await readRpc(
      await rpc(other.access_token, 'tools/call', { name: 'create_post_draft', arguments: input }),
    );
    expect(JSON.parse(foreign.result.content[0].text).error.code).toBe('INVALID_IMAGE_REFERENCE');
    const forged = await readRpc(
      await rpc(other.access_token, 'tools/call', {
        name: 'create_post_draft',
        arguments: {
          ...input,
          coverImageRef: undefined,
          imageRefs: [],
          contentPt: `<p>Complete forged body image reference.</p><img src="${image.url}">`,
        },
      }),
    );
    expect(JSON.parse(forged.result.content[0].text).error.code).toBe('FOREIGN_IMAGE_REFERENCE');
    const created = await readRpc(
      await rpc(first.access_token, 'tools/call', { name: 'create_post_draft', arguments: input }),
    );
    const draft = JSON.parse(created.result.content[0].text) as { id: string };
    expect(typeof draft.id).toBe('string');
    const consumed = await readRpc(
      await rpc(first.access_token, 'tools/call', {
        name: 'create_post_draft',
        arguments: { ...input, idempotencyKey: randomUUID() },
      }),
    );
    expect(JSON.parse(consumed.result.content[0].text).error.code).toBe('INVALID_IMAGE_REFERENCE');
    expect(
      (
        await member.put(`/api/admin/posts/${draft.id}`, {
          coverImageUrl: null,
          coverImagePath: null,
        })
      ).status,
    ).toBe(200);
    expect((await fetch(image.url)).status).toBe(200);
    const relation = await pool.query(
      'SELECT COUNT(*)::int AS count FROM public.post_media WHERE post_id=$1',
      [draft.id],
    );
    expect(relation.rows[0].count).toBe(1);
    await pool.query('DELETE FROM public.posts WHERE id=$1', [draft.id]);
  });

  it('keeps CLI tokens independent of the short authorization browser session', async () => {
    const tokens = await authorize(member);
    await pool.query(
      'UPDATE mcp_oauth.session SET "expiresAt" = NOW() - INTERVAL \'1 hour\' WHERE "userId"=$1',
      [memberId],
    );
    expect((await rpc(tokens.access_token, 'tools/list', {})).status).toBe(200);
  });
  it('revokes all of the current account connections without revoking another account', async () => {
    const first = await authorize(member);
    const second = await authorize(member);
    const independent = await authorize(admin);
    expect((await member.delete('/api/admin/connections', { origin: BASE_URL })).status).toBe(200);
    expect((await rpc(first.access_token, 'tools/list', {})).status).toBe(401);
    expect((await rpc(second.access_token, 'tools/list', {})).status).toBe(401);
    expect((await rpc(independent.access_token, 'tools/list', {})).status).toBe(200);
    expect((await authorize(member)).access_token.length).toBeGreaterThan(0);
  });

  it('rejects reused authorization codes and revokes their issued connection', async () => {
    const tokens = await authorize(member);
    const replay = await fetch(`${BASE_URL}/api/mcp-auth/oauth2/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code: tokens.code,
        code_verifier: tokens.verifier,
        resource,
      }),
    });
    expect(replay.status).toBe(400);
    expect((await rpc(tokens.access_token, 'tools/list', {})).status).toBe(401);
  });

  it('rejects wrong PKCE and wrong audience, and rejects expired access tokens', async () => {
    const { verifier, fields } = await beginAuthorization(member);
    const consent = await member.postForm(
      '/api/mcp-auth/browser',
      { ...fields, scope: scopes, accept: 'yes' },
      { origin: BASE_URL },
    );
    const code = new URL(consent.headers.get('location')!).searchParams.get('code')!;
    const exchange = await fetch(`${BASE_URL}/api/mcp-auth/oauth2/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code,
        code_verifier: verifier.split('').reverse().join(''),
        resource,
      }),
    });
    expect(exchange.status).toBe(400);
    const tokens = await authorize(member);
    await pool.query(
      'UPDATE mcp_oauth."oauthAccessToken" SET resources=$1::jsonb WHERE "userId"=$2',
      [JSON.stringify(['https://foreign.invalid/api/mcp']), memberId],
    );
    expect((await rpc(tokens.access_token, 'tools/list', {})).status).toBe(401);
    const fresh = await authorize(member);
    await pool.query(
      'UPDATE mcp_oauth."oauthAccessToken" SET "expiresAt"=NOW()-INTERVAL \'1 minute\' WHERE "userId"=$1',
      [memberId],
    );
    expect((await rpc(fresh.access_token, 'tools/list', {})).status).toBe(401);
  });

  it('enforces shared token endpoint limits with Retry-After', async () => {
    let last: Response | undefined;
    for (let index = 0; index < 21; index += 1)
      last = await fetch(`${BASE_URL}/api/mcp-auth/oauth2/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=unsupported',
      });
    expect(last?.status).toBe(429);
    expect(Number(last?.headers.get('retry-after'))).toBeGreaterThan(0);
  });
  (process.env.CRON_SECRET ? it : it.skip)(
    'cleans expired unused objects and retains images referenced by translations',
    async () => {
      expect((await fetch(`${BASE_URL}/api/internal/mcp-cleanup`)).status).toBe(401);
      const tokens = await authorize(member);
      const prepare = async () => {
        const result = await readRpc(
          await rpc(tokens.access_token, 'tools/call', {
            name: 'prepare_post_image',
            arguments: {
              mimeType: 'image/png',
              bytesBase64:
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6k0kAAAAASUVORK5CYII=',
            },
          }),
        );
        expect(result.result.isError).not.toBe(true);
        return JSON.parse(result.result.content[0].text) as {
          reference: string;
          placeholder: string;
          url: string;
        };
      };
      const unused = await prepare();
      const attached = await prepare();
      const result = await readRpc(
        await rpc(tokens.access_token, 'tools/call', {
          name: 'create_post_draft',
          arguments: {
            titlePt: 'Rascunho para validar limpeza',
            contentPt: '<p>Conteúdo completo sem imagem nesta tradução.</p>',
            titleEn: 'Draft to verify cleanup',
            contentEn: `<p>Complete English translation.</p><img src="${attached.placeholder}">`,
            contentFormat: 'html',
            imageRefs: [attached.reference],
            idempotencyKey: randomUUID(),
          },
        }),
      );
      expect(result.result.isError).not.toBe(true);
      const draft = JSON.parse(result.result.content[0].text) as { id: string };
      await pool.query(
        "UPDATE public.mcp_image_preparations SET expires_at=NOW()-INTERVAL '1 day' WHERE id=ANY($1::uuid[])",
        [[unused.reference, attached.reference]],
      );
      // Simulate a legacy reference without its relation, which cleanup must repair.
      await pool.query('DELETE FROM public.post_media WHERE post_id=$1', [draft.id]);
      const cleanup = await fetch(`${BASE_URL}/api/internal/mcp-cleanup`, {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      expect(cleanup.status).toBe(200);
      expect((await fetch(unused.url)).status).toBe(404);
      expect((await fetch(attached.url)).status).toBe(200);
      expect(
        (
          await pool.query(
            'SELECT COUNT(*)::int AS count FROM public.post_media WHERE post_id=$1',
            [draft.id],
          )
        ).rows[0].count,
      ).toBe(1);
      await pool.query('DELETE FROM public.posts WHERE id=$1', [draft.id]);
    },
  );

  (process.env.MCP_BROWSER_TESTS === 'true' ? it : it.skip)(
    'completes real browser consent and account revocation on desktop and mobile',
    async () => {
      await verifyMcpBrowserFlow(pool, clientId);
    },
    60000,
  );

  it('invalidates grants and internal sessions when the panel account is deleted', async () => {
    const tokens = await authorize(member);
    await pool.query('DELETE FROM public.users WHERE id=$1', [memberId]);
    expect((await rpc(tokens.access_token, 'tools/list', {})).status).toBe(401);
    const refresh = await fetch(`${BASE_URL}/api/mcp-auth/oauth2/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: tokens.refresh_token,
        resource,
      }),
    });
    expect(refresh.status).toBe(400);
    expect(
      (
        await pool.query('SELECT COUNT(*)::int AS count FROM mcp_oauth.session WHERE "userId"=$1', [
          memberId,
        ])
      ).rows[0].count,
    ).toBe(0);
  });
});
