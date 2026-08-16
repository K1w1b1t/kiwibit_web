import { absoluteUrl } from '@/shared/lib/seo';
import { runAfterResponse } from '@/shared/lib/after-response';
import { reportServerError } from '@/shared/lib/discord';

/**
 * "Sign In with LinkedIn using OpenID Connect" OAuth, used to sync a member's
 * profile photo (issue #80).
 *
 * SERVER ONLY. `LINKEDIN_CLIENT_SECRET` must never reach the browser — nothing
 * here is `NEXT_PUBLIC_` and the module is imported solely from route handlers.
 *
 * Scope is the basic OIDC set: it returns name/email/`picture` and cannot post.
 * Auto-posting adds a separate LinkedIn product approval flow and re-consent.
 */
export const LINKEDIN_SCOPE = 'openid profile email';

/** httpOnly cookie carrying `${state}:${memberId}` between connect and callback. */
export const LINKEDIN_OAUTH_COOKIE = 'linkedin_oauth';

/** Parses the OAuth state cookie carrying state and memberId. */
export function parseOauthCookie(
  value: string | undefined,
): { state: string; memberId: string } | null {
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

  // Fallback for legacy 3-part cookie format if any.
  const memberId = rest.slice(secondColon + 1);
  if (!state || !memberId) return null;
  return { state, memberId };
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
export function authorizeUrl(state: string): string {
  const config = readConfig();
  if (!config) throw new Error('LinkedIn is not configured.');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: redirectUri(),
    scope: LINKEDIN_SCOPE,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type TokenResult = { accessToken: string; expiresInSeconds: number; scope: string };

/** Exchanges the authorization code for an access token (client secret stays server-side). */
export async function exchangeCode(code: string): Promise<TokenResult> {
  const config = readConfig();
  if (!config) throw new Error('LinkedIn is not configured.');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

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

export type LinkedInTarget = 'personal' | 'company';

export type LinkedInAutoPostInput = {
  title: string;
  url: string;
  summary?: string;
  imageUrl?: string | null;
};

export type LinkedInAutoPostResult = {
  ok: boolean;
  sent?: boolean;
  skipped?: boolean;
  expired?: boolean;
  target?: LinkedInTarget;
  status?: number;
  code?: string;
  detail?: string;
};

export type LinkedInBlogPost = {
  id: string;
  title: string;
  content: string;
  coverImageUrl: string | null;
  status: 'draft' | 'published';
};

function getLinkedInConfig(target: LinkedInTarget) {
  const config = {
    personal: {
      enabled: process.env.LINKEDIN_PERSONAL_AUTO_POST_ENABLED,
      token: process.env.LINKEDIN_PERSONAL_ACCESS_TOKEN,
      authorUrn: process.env.LINKEDIN_PERSONAL_AUTHOR_URN,
    },
    company: {
      enabled: process.env.LINKEDIN_COMPANY_AUTO_POST_ENABLED,
      token: process.env.LINKEDIN_COMPANY_ACCESS_TOKEN,
      authorUrn: process.env.LINKEDIN_COMPANY_AUTHOR_URN,
    },
  }[target];

  return {
    enabled: config.enabled === 'true' || config.enabled === '1',
    token: config.token?.trim() || undefined,
    authorUrn: config.authorUrn?.trim() || undefined,
  };
}

function ensureLinkedInText(input: LinkedInAutoPostInput): string {
  const baseText = [input.title, input.summary?.trim() || '', input.url]
    .filter(Boolean)
    .join('\n\n');
  return baseText.trim().slice(0, 3000);
}

function buildPayload(input: LinkedInAutoPostInput, authorUrn: string) {
  const summaryText = input.summary?.trim() || 'Leia o artigo completo no blog da Kiwibit.';
  const shareText = ensureLinkedInText(input);

  return {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: shareText },
        shareMediaCategory: 'ARTICLE',
        media: [
          {
            status: 'READY',
            description: { text: summaryText.slice(0, 200) },
            originalUrl: input.url,
            title: { text: input.title.slice(0, 200) },
            ...(input.imageUrl ? { media: input.imageUrl } : {}),
          },
        ],
      },
    },
    visibility: 'PUBLIC',
  };
}

export async function triggerLinkedInAutoPost(
  target: LinkedInTarget,
  input: LinkedInAutoPostInput,
): Promise<LinkedInAutoPostResult> {
  const { enabled, token, authorUrn } = getLinkedInConfig(target);

  if (!enabled || !token || !authorUrn || !input.url) {
    return { ok: false, skipped: true, target };
  }

  const payload = buildPayload(input, authorUrn);

  try {
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.9',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      return { ok: true, sent: true, target, status: response.status };
    }

    const rawBody = await response.text().catch(() => '');
    const expired =
      response.status === 401 || /expired|invalid_token|token.*expired|unauthorized/i.test(rawBody);

    if (expired) {
      return {
        ok: false,
        expired: true,
        target,
        status: response.status,
        code: 'LINKEDIN_TOKEN_EXPIRED',
        detail: rawBody.slice(0, 500),
      };
    }

    return {
      ok: false,
      target,
      status: response.status,
      code: 'LINKEDIN_POST_FAILED',
      detail: rawBody.slice(0, 500),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown LinkedIn API error';
    return {
      ok: false,
      target,
      code: 'LINKEDIN_POST_ERROR',
      detail: message.slice(0, 500),
    };
  }
}

export async function triggerLinkedInAutoPostForBlog(
  post: LinkedInBlogPost,
): Promise<LinkedInAutoPostResult[]> {
  if (post.status !== 'published') return [];

  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const postUrl = `${siteBase}/blog/${post.id}`;
  const results: LinkedInAutoPostResult[] = [];

  for (const target of ['personal', 'company'] as const) {
    const result = await triggerLinkedInAutoPost(target, {
      title: post.title,
      summary: post.content.replace(/\s+/g, ' ').trim().slice(0, 180),
      url: postUrl,
      imageUrl: post.coverImageUrl ?? null,
    });

    results.push(result);

    if (result.ok || result.skipped) continue;

    runAfterResponse(() =>
      reportServerError({
        source: 'linkedinAutoPost',
        code: result.code ?? 'LINKEDIN_POST_FAILED',
        message: `LinkedIn ${target} auto-post failed for blog post ${post.id}. ${result.detail ?? 'No response body returned.'}`,
        status: result.status,
      }),
    );
  }

  return results;
}

export const publishLinkedInPost = triggerLinkedInAutoPost;
export const publishToLinkedIn = triggerLinkedInAutoPost;
