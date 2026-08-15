import { createHash, randomBytes } from 'node:crypto';
import { absoluteUrl } from '@/shared/lib/seo';

/**
 * "Sign In with LinkedIn using OpenID Connect" OAuth, used to sync a member's
 * profile photo (issue #80).
 *
 * SERVER ONLY. `LINKEDIN_CLIENT_SECRET` must never reach the browser — nothing
 * here is `NEXT_PUBLIC_` and the module is imported solely from route handlers.
 *
 * Scope is the basic OIDC set: it returns name/email/`picture` and cannot post.
 * Auto-posting (issue #81) will add `w_member_social`, a separate LinkedIn
 * product approval, and re-consent.
 */
export const LINKEDIN_SCOPE = 'openid profile email';

/** httpOnly cookie carrying `${state}:${codeVerifier}:${memberId}` between connect and callback. */
export const LINKEDIN_OAUTH_COOKIE = 'linkedin_oauth';

export type PkcePair = { codeVerifier: string; codeChallenge: string };

/** Generates a cryptographically random PKCE code verifier and S256 challenge. */
export function generatePkce(): PkcePair {
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

/** Parses the OAuth state cookie carrying state, optional codeVerifier, and memberId. */
export function parseOauthCookie(
  value: string | undefined,
): { state: string; codeVerifier?: string; memberId: string } | null {
  if (!value) return null;
  const firstColon = value.indexOf(':');
  if (firstColon <= 0) return null;

  const state = value.slice(0, firstColon);
  const rest = value.slice(firstColon + 1);

  const secondColon = rest.indexOf(':');
  if (secondColon <= 0) {
    const memberId = rest;
    if (!state || !memberId) return null;
    return { state, memberId };
  }

  const codeVerifier = rest.slice(0, secondColon);
  const memberId = rest.slice(secondColon + 1);
  if (!state || !codeVerifier || !memberId) return null;
  return { state, codeVerifier, memberId };
}

const AUTHORIZE_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

/** Fixed redirect URI — LinkedIn matches it exactly; the member id travels in `state`. */
export function redirectUri(): string {
  return absoluteUrl('/api/admin/members/linkedin/callback');
}

type LinkedinConfig = { clientId: string; clientSecret: string };

function readConfig(): LinkedinConfig | null {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/** True when the app has the LinkedIn OAuth credentials. */
export function isLinkedinConfigured(): boolean {
  return readConfig() !== null;
}

/** Authorization URL to redirect the member to for consent. */
export function authorizeUrl(state: string, codeChallenge?: string): string {
  const config = readConfig();
  if (!config) throw new Error('LinkedIn is not configured.');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: redirectUri(),
    scope: LINKEDIN_SCOPE,
    state,
  });
  if (codeChallenge) {
    params.set('code_challenge', codeChallenge);
    params.set('code_challenge_method', 'S256');
  }
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type TokenResult = { accessToken: string; expiresInSeconds: number; scope: string };

/** Exchanges the authorization code for an access token (client secret stays server-side). */
export async function exchangeCode(code: string, codeVerifier?: string): Promise<TokenResult> {
  const config = readConfig();
  if (!config) throw new Error('LinkedIn is not configured.');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });
  if (codeVerifier) {
    body.set('code_verifier', codeVerifier);
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`LinkedIn token exchange failed (${response.status}).`);

  const json = (await response.json()) as {
    access_token?: unknown;
    expires_in?: unknown;
    scope?: unknown;
  };
  if (typeof json.access_token !== 'string') {
    throw new Error('LinkedIn token response is missing access_token.');
  }

  return {
    accessToken: json.access_token,
    expiresInSeconds: typeof json.expires_in === 'number' ? json.expires_in : 0,
    scope: typeof json.scope === 'string' ? json.scope : LINKEDIN_SCOPE,
  };
}

export type LinkedinUserinfo = { sub: string; picture: string | null };

/** Reads the OIDC userinfo endpoint for the stable `sub` and the profile `picture`. */
export async function fetchUserinfo(accessToken: string): Promise<LinkedinUserinfo> {
  const response = await fetch(USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`LinkedIn userinfo failed (${response.status}).`);

  const json = (await response.json()) as { sub?: unknown; picture?: unknown };
  if (typeof json.sub !== 'string') throw new Error('LinkedIn userinfo is missing sub.');

  return {
    sub: json.sub,
    picture: typeof json.picture === 'string' ? json.picture : null,
  };
}
