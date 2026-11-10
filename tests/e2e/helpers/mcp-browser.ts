import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { once } from 'node:events';
import type { Pool } from 'pg';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } from './constants';

/** Real browser navigation catches Origin, cookie and redirect-CSP regressions. */
export async function verifyMcpBrowserFlow(pool: Pool, clientId: string) {
  const prior = await pool.query<{ redirectUris: string[] }>(
    'SELECT "redirectUris" FROM mcp_oauth."oauthClient" WHERE "clientId"=$1',
    [clientId],
  );
  const callback = createServer((request, response) => {
    const received = new URL(request.url!, 'http://localhost').searchParams.get('code');
    if (received) code = received;
    response.end('Authorization complete');
  });
  let code: string | null = null;
  callback.listen(0, '127.0.0.1');
  await once(callback, 'listening');
  const address = callback.address();
  if (!address || typeof address === 'string') throw new Error('Callback unavailable');
  const redirect = `http://127.0.0.1:${address.port}/callback`;
  const driver = spawn(
    process.env.CHROMEDRIVER_PATH ?? 'chromedriver',
    ['--port=9521', '--allowed-ips=127.0.0.1'],
    { stdio: 'ignore' },
  );
  let driverError = false;
  driver.on('error', () => {
    driverError = true;
  });
  let sessionId: string | undefined;
  const delay = () => new Promise((resolve) => setTimeout(resolve, 100));
  async function waitFor(operation: () => Promise<boolean>) {
    for (let attempt = 0; attempt < 150; attempt += 1) {
      if (await operation()) return;
      if (driverError) throw new Error('ChromeDriver unavailable');
      await delay();
    }
    throw new Error('Browser condition timed out');
  }
  async function webdriver<T>(path: string, body?: object): Promise<T> {
    const response = await fetch(`http://127.0.0.1:9521${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error('WebDriver command failed');
    return ((await response.json()) as { value: T }).value;
  }
  const execute = <T>(script: string, args: unknown[] = []) =>
    webdriver<T>(`/session/${sessionId}/execute/sync`, { script, args });
  const navigate = (url: string) => webdriver(`/session/${sessionId}/url`, { url });
  try {
    await waitFor(async () => {
      try {
        return (await fetch('http://127.0.0.1:9521/status')).ok;
      } catch {
        return false;
      }
    });
    const browser = await webdriver<{ sessionId: string }>('/session', {
      capabilities: {
        alwaysMatch: {
          browserName: 'chrome',
          'goog:chromeOptions': {
            args: [
              '--headless=new',
              '--no-sandbox',
              '--disable-dev-shm-usage',
              '--window-size=1440,1000',
            ],
          },
        },
      },
    });
    sessionId = browser.sessionId;
    await navigate(`${BASE_URL}/login`);
    await waitFor(() => execute<boolean>('return !!document.querySelector("input[type=email]")'));
    for (const [type, text] of [
      ['email', ADMIN_EMAIL],
      ['password', ADMIN_PASSWORD],
    ]) {
      const element = await webdriver<Record<string, string>>(`/session/${sessionId}/element`, {
        using: 'css selector',
        value: `input[type=${type}]`,
      });
      await webdriver(
        `/session/${sessionId}/element/${element['element-6066-11e4-a52e-4f735466cecf']}/value`,
        { text },
      );
    }
    await execute('document.querySelector("button[type=submit]").click()');
    await waitFor(() => execute<boolean>('return location.pathname==="/admin"'));
    await pool.query(
      'UPDATE mcp_oauth."oauthClient" SET "redirectUris"=$1::jsonb WHERE "clientId"=$2',
      [JSON.stringify([redirect]), clientId],
    );
    const verifier = randomBytes(32).toString('base64url');
    const query = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirect,
      scope: 'posts:drafts:create offline_access',
      resource: `${BASE_URL}/api/mcp`,
      state: randomBytes(16).toString('hex'),
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    });
    await navigate(`${BASE_URL}/api/mcp-auth/oauth2/authorize?${query}`);
    await waitFor(() => execute<boolean>('return !!document.querySelector("button[value=yes]")'));
    expect(
      await execute<boolean>('return document.body.innerText.includes(arguments[0])', [redirect]),
    ).toBe(true);
    await execute('document.querySelector("button[value=yes]").click()');
    try {
      await waitFor(async () => code !== null);
    } catch {
      const failure = await execute<{
        path: string;
        forbidden: boolean;
        unavailable: boolean;
        expired: boolean;
      }>(
        'return {path:location.pathname,forbidden:document.body.innerText.includes("Forbidden"),unavailable:document.body.innerText.includes("unavailable"),expired:document.body.innerText.includes("Expired")}',
      );
      throw new Error(`Browser callback failed: ${JSON.stringify(failure)}`);
    }
    const tokenResponse = await fetch(`${BASE_URL}/api/mcp-auth/oauth2/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirect,
        code: code!,
        code_verifier: verifier,
        resource: `${BASE_URL}/api/mcp`,
      }),
    });
    expect(tokenResponse.status).toBe(200);
    const tokens = (await tokenResponse.json()) as { access_token: string };
    await navigate(`${BASE_URL}/admin/connections`);
    await waitFor(() =>
      execute<boolean>('return document.body.innerText.includes("Synthetic MCP test client")'),
    );
    await execute(
      'const button=Array.from(document.querySelectorAll("button")).find(x=>x.textContent.includes("No, thanks"));if(button)button.click()',
    );
    expect(
      await execute<number>('return document.querySelectorAll("[id^=mcp-guide]").length'),
    ).toBe(0);
    await webdriver(`/session/${sessionId}/window/rect`, { width: 390, height: 844 });
    expect(await execute<boolean>('return document.documentElement.scrollWidth<=innerWidth')).toBe(
      true,
    );
    await execute(
      'Array.from(document.querySelectorAll("button")).find(x=>x.textContent.includes("Conectar Codex")).click()',
    );
    await waitFor(() => execute<boolean>('return !!document.querySelector("#mcp-guide-codex")'));
    expect(
      await execute<boolean>(
        'return document.querySelector("#mcp-guide-codex").innerText.includes(arguments[0])',
        [BASE_URL],
      ),
    ).toBe(true);
    await execute(
      'Array.from(document.querySelectorAll("button")).find(x=>x.textContent.includes("Revogar todas")).click()',
    );
    await waitFor(() => execute<boolean>('return !!document.querySelector("dialog[open]")'));
    await execute(
      'Array.from(document.querySelectorAll("dialog button")).find(x=>x.textContent.includes("Revogar acesso")).click()',
    );
    await waitFor(() => execute<boolean>('return !document.querySelector("dialog[open]")'));
    expect(
      (
        await fetch(`${BASE_URL}/api/mcp`, {
          headers: { authorization: `Bearer ${tokens.access_token}` },
        })
      ).status,
    ).toBe(401);
    expect(await execute<string>('return location.pathname')).toBe('/admin/connections');
  } finally {
    if (sessionId)
      await fetch(`http://127.0.0.1:9521/session/${sessionId}`, { method: 'DELETE' }).catch(
        () => undefined,
      );
    await pool.query(
      'UPDATE mcp_oauth."oauthClient" SET "redirectUris"=$1::jsonb WHERE "clientId"=$2',
      [JSON.stringify(prior.rows[0].redirectUris), clientId],
    );
    driver.kill();
    callback.close();
  }
}
