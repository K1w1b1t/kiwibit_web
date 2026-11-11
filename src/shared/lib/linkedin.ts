import { richTextToText, renderPostContent } from '@/shared/lib/sanitize-rich-text';
import { absoluteUrl } from '@/shared/lib/seo';
import { runAfterResponse } from '@/shared/lib/after-response';
import { reportServerError } from '@/shared/lib/discord';
import { decryptToken } from '@/shared/lib/token-crypto';

/**
 * "Sign In with LinkedIn using OpenID Connect" OAuth, used to sync a member's
 * profile photo (issue #80).
 *
 * SERVER ONLY. `LINKEDIN_CLIENT_SECRET` must never reach the browser — nothing
 * here is `NEXT_PUBLIC_` and the module is imported solely from route handlers.
 *
 * Uses OIDC profile data without requesting email or legacy profile access.
 */
export const LINKEDIN_SCOPE = 'openid profile';

/**
 * Extended scope for auto-posting to the member's OWN profile (issue #81). Adds
 * `w_member_social` ("Share on LinkedIn" product) on top of the basic OIDC set,
 * so the connection keeps returning name/email/picture while also gaining the
 * right to post. Requested only on an explicit, separate opt-in.
 */
export const LINKEDIN_AUTOPOST_SCOPE = `${LINKEDIN_SCOPE} w_member_social`;

/** The LinkedIn permission that lets a member post to their own profile. */
export const LINKEDIN_MEMBER_POST_SCOPE = 'w_member_social';

/** True when a granted `scope` string includes the member-post permission. */
export function scopeAllowsAutoPost(scope: string): boolean {
  return scope.split(/[\s,]+/).includes(LINKEDIN_MEMBER_POST_SCOPE);
}

/**
 * httpOnly cookie carrying `${state}:${memberId}` between connect and callback.
 */
export const LINKEDIN_OAUTH_COOKIE = 'linkedin_oauth';

/**
 * Parses the OAuth state cookie. `state` and `memberId` (a UUID, no colons) are
 * separated by a colon; the granted token scope, not this cookie, determines
 * whether auto-posting can be enabled.
 */
export function parseOauthCookie(
  value: string | undefined,
): { state: string; memberId: string; flowId?: string; publicationRequested?: boolean } | null {
  if (!value) return null;

  const [state, memberId, flowId, intent] = value.split(':');
  if (!state || !memberId) return null;

  return {
    state,
    memberId,
    ...(flowId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(flowId)
      ? { flowId, publicationRequested: intent === 'publish' }
      : {}),
  };
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

/**
 * Authorization URL to redirect the member to for consent. Defaults to the basic
 * OIDC scope (photo sync); pass `LINKEDIN_AUTOPOST_SCOPE` to also request the
 * auto-post permission during the same consent.
 */
export function authorizeUrl(state: string, scope: string = LINKEDIN_SCOPE): string {
  const config = readConfig();
  if (!config) throw new Error('LinkedIn is not configured.');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: redirectUri(),
    scope,
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
  if (!response.ok) {
    console.warn('[LinkedIn OAuth] token_exchange http_error', { status: response.status });
    throw new Error(`LinkedIn token exchange failed (${response.status}).`);
  }

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
  if (!response.ok) {
    console.warn('[LinkedIn OAuth] userinfo http_error', { status: response.status });
    throw new Error(`LinkedIn userinfo failed (${response.status}).`);
  }

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
  commentary?: string;
  imageUrl?: string | null;
};

export type LinkedInAutoPostResult = {
  ok: boolean;
  sent?: boolean;
  skipped?: boolean;
  expired?: boolean;
  reconnectRequired?: boolean;
  target?: LinkedInTarget;
  status?: number;
  code?: string;
  detail?: string;
};

export type LinkedInBlogPost = {
  titlePt?: string | null;
  contentPt?: string | null;
  titleEn?: string | null;
  contentEn?: string | null;
  contentFormat?: 'text' | 'html' | 'markdown';
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
  if (input.commentary !== undefined) return input.commentary;
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
          },
        ],
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };
}

/** Current supported Marketing API version, verified against LinkedIn's versioning docs. */
const LINKEDIN_POSTS_VERSION = '202610';

function buildCompanyPayload(input: LinkedInAutoPostInput, authorUrn: string) {
  return {
    author: authorUrn,
    commentary: ensureLinkedInText(input)
      .slice(0, input.commentary === undefined ? 1500 : undefined)
      .replace(/[\\|{}@[\]()<>#*_~]/g, String.raw`\$&`),
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: {
      article: {
        source: input.url,
        title: input.title.slice(0, 200),
        ...(input.summary && { description: input.summary.slice(0, 200) }),
      },
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };
}

const UGC_POSTS_URL = 'https://api.linkedin.com/v2/ugcPosts';

/**
 * Shared transport: organization posts use the versioned Posts API; personal
 * posts retain their existing Share on LinkedIn endpoint. Never throws, so
 * provider failures cannot prevent local content from being saved.
 */
async function postLinkedIn(
  token: string,
  authorUrn: string,
  input: LinkedInAutoPostInput,
  company = false,
): Promise<LinkedInAutoPostResult> {
  if (company && !/^urn:li:organization:\d+$/.test(authorUrn))
    return {
      ok: false,
      code: 'LINKEDIN_COMPANY_AUTHOR_INVALID',
      detail: 'Expected an organization author URN.',
    };
  const payload = company ? buildCompanyPayload(input, authorUrn) : buildPayload(input, authorUrn);

  try {
    const response = await fetch(company ? 'https://api.linkedin.com/rest/posts' : UGC_POSTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        ...(company && { 'Linkedin-Version': LINKEDIN_POSTS_VERSION }),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      return { ok: true, sent: true, status: response.status };
    }

    const rawBody = await response.text().catch(() => '');
    const expired =
      response.status === 401 || /expired|invalid_token|token.*expired|unauthorized/i.test(rawBody);

    if (expired) {
      return {
        ok: false,
        expired: true,
        status: response.status,
        code: 'LINKEDIN_TOKEN_EXPIRED',
        detail: 'LinkedIn rejected the publication request.',
      };
    }

    return {
      ok: false,
      status: response.status,
      code: 'LINKEDIN_POST_FAILED',
      detail: 'LinkedIn rejected the publication request.',
    };
  } catch {
    return {
      ok: false,
      code: 'LINKEDIN_POST_ERROR',
      detail: 'LinkedIn publication request failed.',
    };
  }
}

/**
 * Env-based auto-post. Still the path for the company page (a single global
 * `w_organization_social` token, issue #81's "global config" destination). The
 * personal target keeps working here for local testing, but the blog flow drives
 * the personal profile from the author's own connection instead (see below).
 */
export async function triggerLinkedInAutoPost(
  target: LinkedInTarget,
  input: LinkedInAutoPostInput,
): Promise<LinkedInAutoPostResult> {
  const { enabled, token, authorUrn } = getLinkedInConfig(target);

  if (!enabled || !token || !authorUrn || !input.url) {
    return { ok: false, skipped: true, target };
  }

  const result = await postLinkedIn(token, authorUrn, input, target === 'company');
  return { ...result, target };
}

/**
 * A member's stored LinkedIn connection, reduced to what auto-posting needs. The
 * token is encrypted at rest and only decrypted here, right before the request.
 */
export type LinkedinAutoPostConnection = {
  linkedinSub: string;
  linkedinPersonId: string | null;
  scope: string;
  autoPostEnabled: boolean;
  accessTokenEnc: string;
  accessTokenExpiry: Date;
};

export function isLinkedInAccessTokenExpired(expiry: Date, now: number = Date.now()): boolean {
  return expiry.getTime() <= now;
}

/**
 * Posts to the author's OWN LinkedIn profile from their stored connection (issue
 * #81). Skips silently unless the member opted in AND granted `w_member_social`.
 * A token past its expiry short-circuits as `expired` so the caller can disable
 * the opt-in and ask for a reconnect.
 */
export async function triggerPersonalAutoPost(
  connection: LinkedinAutoPostConnection,
  input: LinkedInAutoPostInput,
): Promise<LinkedInAutoPostResult> {
  if (!connection.autoPostEnabled || !scopeAllowsAutoPost(connection.scope) || !input.url) {
    return { ok: false, skipped: true, target: 'personal' };
  }

  if (isLinkedInAccessTokenExpired(connection.accessTokenExpiry)) {
    return {
      ok: false,
      expired: true,
      reconnectRequired: true,
      target: 'personal',
      code: 'LINKEDIN_TOKEN_EXPIRED',
      detail: 'Stored access token expired before the request.',
    };
  }

  if (!connection.linkedinPersonId) {
    return {
      ok: false,
      reconnectRequired: true,
      target: 'personal',
      code: 'LINKEDIN_PERSON_ID_MISSING',
      detail: 'Stored LinkedIn connection is missing the Person ID required for posting.',
    };
  }

  let token: string;
  try {
    token = decryptToken(connection.accessTokenEnc);
  } catch {
    return {
      ok: false,
      target: 'personal',
      code: 'LINKEDIN_POST_ERROR',
      detail: 'Failed to decrypt the stored access token.',
    };
  }

  const result = await postLinkedIn(token, `urn:li:person:${connection.linkedinPersonId}`, input);
  return { ...result, target: 'personal' };
}

/** Builds one language-safe announcement within both destination budgets. */
export function composeLinkedInBlogPost(
  post: LinkedInBlogPost,
  siteBase: string,
): LinkedInAutoPostInput | null {
  const explicit = Boolean(post.titlePt?.trim() || post.titleEn?.trim());
  const translations = [
    {
      locale: 'pt',
      title: explicit ? post.titlePt : post.title,
      content: explicit ? post.contentPt : post.content,
      invite: 'Leia o artigo completo:',
    },
    {
      locale: 'en',
      title: post.titleEn,
      content: post.contentEn,
      invite: 'Read the full article:',
    },
  ].filter((item) => item.title?.trim() && item.content?.trim());
  if (!translations.length) return null;
  const blocks = translations.map((item) => ({
    title: item.title!.trim(),
    summary: (post.contentFormat && post.contentFormat !== 'text'
      ? richTextToText(renderPostContent(item.content!, post.contentFormat))
      : item.content!
    )
      .replace(/\s+/g, ' ')
      .trim(),
    url: `${siteBase.replace(/\/$/, '')}/${item.locale}/blog/${post.id}`,
    invite: item.invite,
  }));
  const render = (length: number) =>
    (blocks.length === 2 ? 'English below ↓\n\n' : '') +
    blocks
      .map((block) => {
        const chars = Array.from(block.summary);
        const summary =
          length === 0
            ? ''
            : chars.length > length
              ? chars.slice(0, Math.max(0, length - 1)).join('') + '…'
              : block.summary;
        return [block.title, summary, `${block.invite} ${block.url}`].filter(Boolean).join('\n\n');
      })
      .join('\n\n——— English ———\n\n');
  let length = 180;
  let commentary = render(length);
  while (commentary.replace(/[\\|{}@[\]()<>#*_~]/g, String.raw`\$&`).length > 1500 && length > 0) {
    commentary = render(--length);
  }
  if (commentary.replace(/[\\|{}@[\]()<>#*_~]/g, String.raw`\$&`).length > 1500) return null;
  return {
    title: blocks[0].title,
    summary: blocks[0].summary.slice(0, 180),
    url: blocks[0].url,
    imageUrl: post.coverImageUrl,
    commentary,
  };
}

/**
 * Fans a freshly published blog post out to every enabled LinkedIn destination:
 * the company page (global env config) and the author's own profile (their
 * per-member connection, when passed). Both are independent — either, both, or
 * neither may fire. Failures are reported to Discord and never block publishing.
 */
export async function triggerLinkedInAutoPostForBlog(
  post: LinkedInBlogPost,
  authorConnection: LinkedinAutoPostConnection | null = null,
): Promise<LinkedInAutoPostResult[]> {
  if (post.status !== 'published') return [];

  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const input = composeLinkedInBlogPost(post, siteBase);
  if (!input) return [{ ok: false, code: 'LINKEDIN_TEXT_TOO_LONG' }];

  const results: LinkedInAutoPostResult[] = [
    await triggerLinkedInAutoPost('company', input),
    authorConnection
      ? await triggerPersonalAutoPost(authorConnection, input)
      : { ok: false, skipped: true, target: 'personal' },
  ];

  for (const result of results) {
    if (result.ok || result.skipped) continue;

    runAfterResponse(() =>
      reportServerError({
        source: 'linkedinAutoPost',
        code: result.code ?? 'LINKEDIN_POST_FAILED',
        message: `LinkedIn ${result.target ?? 'unknown'} auto-post failed for blog post ${post.id}. ${result.detail ?? 'No response body returned.'}`,
        status: result.status,
      }),
    );
  }

  return results;
}

export const publishLinkedInPost = triggerLinkedInAutoPost;
export const publishToLinkedIn = triggerLinkedInAutoPost;
