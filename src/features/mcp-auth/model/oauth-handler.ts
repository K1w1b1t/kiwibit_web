import { getMcpSettings } from '@/shared/config/mcp';
import { getMcpAuth } from '@/shared/lib/mcp-oauth-provider';
import { mcpRequestIp, takeMcpRateLimit } from '@/shared/lib/mcp-rate-limit';
import { readBoundedBody } from '@/shared/lib/read-bounded-body';
import { acceptMcpConsent, showMcpConsent } from './browser-authorization';
import { recordMcpSecurityOutcome } from '@/shared/lib/mcp-security';

const permittedPaths: Record<string, readonly string[]> = {
  GET: ['/oauth2/authorize', '/browser'],
  POST: ['/oauth2/token', '/oauth2/revoke', '/browser'],
};

async function validGrantUser(body: string | undefined) {
  if (!body) return true;
  const form = new URLSearchParams(body);
  const grantType = form.get('grant_type');
  if (grantType !== 'authorization_code' && grantType !== 'refresh_token') return true;
  try {
    await getMcpAuth().api.validatePanelGrantUser({
      body: {
        grantType,
        value: form.get(grantType === 'authorization_code' ? 'code' : 'refresh_token') ?? '',
      },
    });
    return true;
  } catch {
    return false;
  }
}

async function forwardProviderRequest(request: Request, path: string) {
  const headers = new Headers(request.headers);
  headers.delete('cookie');
  const body = request.method === 'POST' ? await readBoundedBody(request, 16000) : undefined;
  if (path === '/oauth2/token' && !(await validGrantUser(body))) {
    return Response.json(
      { error: 'invalid_grant' },
      { status: 400, headers: { 'cache-control': 'no-store' } },
    );
  }
  const response = await getMcpAuth().handler(
    new Request(request.url, { method: request.method, headers, body }),
  );
  response.headers.set('cache-control', 'no-store');
  return response;
}

function oauthFailure(error: unknown) {
  const disabled = error instanceof Error && error.message === 'MCP_DISABLED';
  if (!disabled) recordMcpSecurityOutcome('OAUTH_REJECTED');
  return Response.json(
    {
      error: {
        code: disabled ? 'NOT_FOUND' : 'MCP_UNAVAILABLE',
        message: disabled
          ? 'MCP is disabled.'
          : 'Authorization is unavailable. Restart the connection flow.',
      },
    },
    { status: disabled ? 404 : 503, headers: { 'cache-control': 'no-store' } },
  );
}

export async function handleMcpOAuth(request: Request) {
  try {
    const settings = getMcpSettings();
    const url = new URL(request.url);
    if (url.origin !== settings.origin || url.search.length > 16000)
      return new Response('Invalid canonical origin.', { status: 400 });
    const path = url.pathname.slice('/api/mcp-auth'.length);
    if (!permittedPaths[request.method]?.includes(path)) return new Response(null, { status: 404 });
    const limit = await takeMcpRateLimit(
      path === '/oauth2/token' ? 'oauth-token-ip' : 'oauth-authorization-ip',
      mcpRequestIp(request),
      path === '/oauth2/token' ? 20 : 30,
      60,
    );
    if (!limit.allowed)
      return new Response('Too many requests.', {
        status: 429,
        headers: { 'retry-after': String(limit.retryAfter) },
      });
    if (path === '/browser')
      return request.method === 'GET'
        ? await showMcpConsent(request)
        : await acceptMcpConsent(request);
    return await forwardProviderRequest(request, path);
  } catch (error) {
    return oauthFailure(error);
  }
}
