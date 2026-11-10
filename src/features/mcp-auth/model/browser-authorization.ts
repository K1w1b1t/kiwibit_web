import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { parseCookies, parseSetCookieHeader } from 'better-auth/cookies';
import { verifyOAuthQueryParams } from '@better-auth/oauth-provider';
import { requirePanelSession } from '@/shared/lib/api-helpers';
import { getMcpAuth } from '@/shared/lib/mcp-oauth-provider';
import { getMcpSettings, MCP_SCOPES } from '@/shared/config/mcp';
import { prisma } from '@/shared/lib/prisma';
import { PANEL_ROLES } from '@/shared/lib/roles';
import { readBoundedBody } from '@/shared/lib/read-bounded-body';
import { escapeHtml } from '@/shared/lib/rich-text';
import { recordMcpSecurityOutcome } from '@/shared/lib/mcp-security';
import { constantTimeEqual } from '@/shared/lib/constant-time-equal';

const cookieName = 'kiwibit-mcp-csrf';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const noStore = { 'cache-control': 'no-store', 'referrer-policy': 'origin' };

async function browserUser() {
  const { session } = await requirePanelSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  return user && PANEL_ROLES.has(user.role) ? user : null;
}

export async function showMcpConsent(request: Request) {
  const settings = getMcpSettings();
  const query = new URL(request.url).search.slice(1);
  if (query.length > 16000 || !(await verifyOAuthQueryParams(query, settings.secret)))
    return new Response('Invalid authorization transaction.', { status: 400, headers: noStore });
  const user = await browserUser();
  if (!user)
    return NextResponse.redirect(
      new URL(
        `/login?callbackUrl=${encodeURIComponent(`/api/mcp-auth/browser?${query}`)}`,
        settings.origin,
      ),
    );
  const params = new URLSearchParams(query);
  const clientId = params.get('client_id');
  const redirect = params.get('redirect_uri');
  if (!clientId || !redirect)
    return new Response('Invalid authorization transaction.', { status: 400 });
  const client = await getMcpAuth().api.getOAuthClientPublicPrelogin({
    body: { client_id: clientId, oauth_query: query },
  });
  const scopes = (params.get('scope') ?? '').split(' ').filter(Boolean);
  if (
    !scopes.length ||
    scopes.some((scope) => !MCP_SCOPES.includes(scope as (typeof MCP_SCOPES)[number]))
  )
    return new Response('Invalid scopes.', { status: 400 });
  const csrf = randomBytes(32).toString('base64url');
  const transaction = await prisma.mcpBrowserTransaction.create({
    data: {
      userId: user.id,
      queryHash: hash(query),
      csrfHash: hash(csrf),
      expiresAt: new Date(Date.now() + 120000),
    },
  });
  let metadataOrigin = 'Cliente pré-cadastrado';
  try {
    metadataOrigin = new URL(clientId).origin;
  } catch {
    /* Non-URL clients have no metadata provenance. */
  }
  const labels: Record<string, string> = {
    'posts:drafts:create': 'Criar rascunhos na minha conta',
    'posts:images:prepare': 'Preparar imagens para meus rascunhos',
    offline_access: 'Manter esta conexão por até 30 dias, com renovação de acesso',
  };
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Autorizar conexão · Kiwibit</title>
  <style>body{background:#090909;color:#eee;font:16px system-ui;padding:24px}main{max-width:680px;margin:8vh auto}code{overflow-wrap:anywhere}label{display:block;margin:20px 0}button{padding:12px 20px;margin:8px;border-radius:24px}small{color:#bbb}form{margin-top:24px}</style>
  <main><h1>Autorizar conexão</h1><p>Ambiente: <code>${escapeHtml(settings.origin)}</code></p>
  <p>Nome declarado pelo cliente: <strong>${escapeHtml(client.client_name ?? 'Cliente MCP')}</strong></p>
  <p>Origem dos metadados: <code>${escapeHtml(metadataOrigin)}</code></p><small>O nome é declarado pelo cliente e não comprova a identidade de uma empresa.</small>
  <p>Destino completo após a autorização: <code>${escapeHtml(redirect)}</code></p>
  <p>O assistente poderá criar rascunhos. A publicação e as alterações posteriores continuam no painel. As imagens enviadas terão URLs públicas.</p>
  <form method="post" action="/api/mcp-auth/browser"><input type="hidden" name="transaction" value="${transaction.id}"><input type="hidden" name="csrf" value="${csrf}"><input type="hidden" name="oauth_query" value="${escapeHtml(query)}">
  ${scopes.map((scope) => `<label><input type="checkbox" name="scope" value="${scope}" checked> ${escapeHtml(labels[scope])}</label>`).join('')}
  <button name="accept" value="yes" type="submit">Autorizar conexão</button><button name="accept" value="no" type="submit">Recusar</button></form></main></html>`;
  const response = new NextResponse(html, {
    headers: {
      ...noStore,
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': `default-src 'none'; style-src 'unsafe-inline'; form-action 'self' ${new URL(redirect).origin}; base-uri 'none'; frame-ancestors 'none'`,
    },
  });
  response.cookies.set(cookieName, `${transaction.id}.${csrf}`, {
    path: '/api/mcp-auth/browser',
    httpOnly: true,
    sameSite: 'strict',
    secure: settings.origin.startsWith('https:'),
    maxAge: 120,
  });
  return response;
}

export async function acceptMcpConsent(request: Request) {
  const settings = getMcpSettings();
  if (
    request.headers.get('origin') !== settings.origin ||
    !request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')
  )
    return new Response('Forbidden.', { status: 403, headers: noStore });
  const body = new URLSearchParams(await readBoundedBody(request, 20000));
  const unique = ['transaction', 'csrf', 'oauth_query', 'accept'];
  if (
    Array.from(body.keys()).some((key) => ![...unique, 'scope'].includes(key)) ||
    unique.some((key) => body.getAll(key).length !== 1)
  )
    return new Response('Invalid consent.', { status: 400 });
  const user = await browserUser();
  const query = body.get('oauth_query')!;
  const csrf = body.get('csrf')!;
  const transactionId = body.get('transaction')!;
  if (!/^[0-9a-f-]{36}$/i.test(transactionId) || !/^[a-zA-Z0-9_-]{43}$/.test(csrf))
    return new Response('Invalid consent transaction.', { status: 400 });
  const cookie = parseCookies(request.headers.get('cookie') ?? '').get(cookieName) ?? '';
  const expected = `${transactionId}.${csrf}`;
  if (
    !user ||
    !constantTimeEqual(expected, cookie) ||
    !(await verifyOAuthQueryParams(query, settings.secret))
  )
    return new Response('Invalid consent transaction.', { status: 403 });
  const requested = new Set((new URLSearchParams(query).get('scope') ?? '').split(' '));
  const scopes = Array.from(new Set(body.getAll('scope')));
  const accept = body.get('accept') === 'yes';
  if (
    (body.get('accept') !== 'yes' && body.get('accept') !== 'no') ||
    scopes.some((scope) => !requested.has(scope)) ||
    (accept &&
      (!scopes.includes('offline_access') || !scopes.some((scope) => scope.startsWith('posts:'))))
  )
    return new Response('Choose at least one tool permission and connection renewal.', {
      status: 400,
    });
  const used = await prisma.mcpBrowserTransaction.updateMany({
    where: {
      id: transactionId,
      userId: user.id,
      queryHash: hash(query),
      csrfHash: hash(csrf),
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { consumedAt: new Date() },
  });
  if (used.count !== 1)
    return new Response('Expired or consumed consent transaction.', { status: 403 });
  const auth = getMcpAuth();
  const bridge = await auth.api.panelBridge({
    headers: new Headers({ origin: settings.origin, accept: 'application/json' }),
    body: { userId: user.id, oauth_query: query },
    asResponse: true,
  });
  if (!bridge.ok) recordMcpSecurityOutcome('OAUTH_REJECTED', { userId: user.id });
  const cookieHeader = Array.from(
    parseSetCookieHeader(bridge.headers.get('set-cookie') ?? '').entries(),
  )
    .map(([name, cookie]) => `${name}=${cookie.value}`)
    .join('; ');
  if (!bridge.ok || !cookieHeader)
    return new Response('Authorization unavailable.', { status: 503 });
  const continuation: unknown = await bridge.json();
  if (
    !continuation ||
    typeof continuation !== 'object' ||
    !('url' in continuation) ||
    typeof continuation.url !== 'string'
  )
    return new Response('Invalid authorization continuation.', { status: 400 });
  const continued = new URL(continuation.url, settings.origin);
  if (continued.origin !== settings.origin || continued.pathname !== '/api/mcp-auth/browser')
    return new Response('Invalid authorization continuation.', { status: 400 });
  const outcome = await auth.api.oauth2Consent({
    headers: new Headers({
      cookie: cookieHeader,
      origin: settings.origin,
      accept: 'application/json',
    }),
    body: { accept, scope: scopes.join(' '), oauth_query: continued.search.slice(1) },
  });
  recordMcpSecurityOutcome(accept ? 'CONSENT_GRANTED' : 'CONSENT_DENIED', { userId: user.id });
  const response = NextResponse.redirect(outcome.url, 303);
  response.headers.set('cache-control', 'no-store');
  response.headers.set('referrer-policy', 'no-referrer');
  response.cookies.set(cookieName, '', {
    path: '/api/mcp-auth/browser',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'strict',
    secure: settings.origin.startsWith('https:'),
  });
  return response;
}
