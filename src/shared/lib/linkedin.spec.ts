import {
  authorizeUrl,
  exchangeCode,
  fetchProfile,
  fetchUserinfo,
  isLinkedinConfigured,
  LINKEDIN_AUTOPOST_SCOPE,
  LINKEDIN_SCOPE,
  parseOauthCookie,
  redirectUri,
  scopeAllowsAutoPost,
  triggerLinkedInAutoPost,
  triggerLinkedInAutoPostForBlog,
  triggerPersonalAutoPost,
  type LinkedinAutoPostConnection,
} from './linkedin';
import { encryptToken } from './token-crypto';

describe('parseOauthCookie', () => {
  it('splits state and member id', () => {
    expect(parseOauthCookie('abc:member-1')).toEqual({
      state: 'abc',
      memberId: 'member-1',
    });
  });

  it('ignores any stale trailing suffix', () => {
    expect(parseOauthCookie('abc:member-1:autopost')).toEqual({
      state: 'abc',
      memberId: 'member-1',
    });
  });

  it('rejects malformed or empty values', () => {
    expect(parseOauthCookie(undefined)).toBeNull();
    expect(parseOauthCookie('nocolon')).toBeNull();
    expect(parseOauthCookie(':member')).toBeNull();
    expect(parseOauthCookie('state:')).toBeNull();
  });
});

describe('LinkedIn OAuth lib', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env.LINKEDIN_CLIENT_ID = 'client-123';
    process.env.LINKEDIN_CLIENT_SECRET = 'secret-456';
  });

  afterEach(() => {
    process.env = { ...original };
    jest.restoreAllMocks();
  });

  it('reports configuration state', () => {
    expect(isLinkedinConfigured()).toBe(true);
    delete process.env.LINKEDIN_CLIENT_SECRET;
    expect(isLinkedinConfigured()).toBe(false);
  });

  it('builds an authorize URL with basic scope and fixed redirect', () => {
    const url = new URL(authorizeUrl('state-xyz'));
    expect(url.origin + url.pathname).toBe('https://www.linkedin.com/oauth/v2/authorization');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('client-123');
    expect(url.searchParams.get('scope')).toBe(LINKEDIN_SCOPE);
    expect(url.searchParams.get('state')).toBe('state-xyz');
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri());
  });

  it('builds an authorize URL with the extended auto-post scope when asked', () => {
    const url = new URL(authorizeUrl('state-xyz', LINKEDIN_AUTOPOST_SCOPE));
    expect(url.searchParams.get('scope')).toBe(LINKEDIN_AUTOPOST_SCOPE);
    expect(LINKEDIN_AUTOPOST_SCOPE).toContain('w_member_social');
  });

  it('exchanges a code for an access token', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ access_token: 'tok', expires_in: 5184000, scope: LINKEDIN_SCOPE }),
          { status: 200 },
        ),
      );

    const result = await exchangeCode('the-code');
    expect(result).toEqual({
      accessToken: 'tok',
      expiresInSeconds: 5184000,
      scope: LINKEDIN_SCOPE,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.linkedin.com/oauth/v2/accessToken',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(URLSearchParams),
      }),
    );
  });

  it('throws when the token exchange fails', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('nope', { status: 400 }));
    await expect(exchangeCode('bad')).rejects.toThrow();
  });

  it('reads sub and picture from userinfo', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ sub: 'linkedin-sub', picture: 'https://cdn/pic.jpg' }), {
        status: 200,
      }),
    );

    await expect(fetchUserinfo('tok')).resolves.toEqual({
      sub: 'linkedin-sub',
      picture: 'https://cdn/pic.jpg',
    });
  });

  it('reads the profile person id used for author URNs', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'person-123' }), {
        status: 200,
      }),
    );

    await expect(fetchProfile('tok')).resolves.toEqual({ id: 'person-123' });
  });

  it('tolerates a missing picture but requires sub', async () => {
    const spy = jest.spyOn(global, 'fetch');

    spy.mockResolvedValueOnce(new Response(JSON.stringify({ sub: 'only-sub' }), { status: 200 }));
    await expect(fetchUserinfo('tok')).resolves.toEqual({ sub: 'only-sub', picture: null });

    spy.mockResolvedValueOnce(new Response(JSON.stringify({ picture: 'x' }), { status: 200 }));
    await expect(fetchUserinfo('tok')).rejects.toThrow();
  });
});

describe('triggerLinkedInAutoPost', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete (global as { fetch?: unknown }).fetch;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('skips when the target is disabled or unconfigured', async () => {
    const result = await triggerLinkedInAutoPost('personal', {
      title: 'Hello',
      url: 'https://example.com/post/123',
    });

    expect(result).toMatchObject({ ok: false, skipped: true });
  });

  it('posts to LinkedIn for a configured personal profile', async () => {
    process.env.LINKEDIN_PERSONAL_ACCESS_TOKEN = 'token';
    process.env.LINKEDIN_PERSONAL_AUTO_POST_ENABLED = 'true';
    process.env.LINKEDIN_PERSONAL_AUTHOR_URN = 'urn:li:person:abc123';

    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 201 });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await triggerLinkedInAutoPost('personal', {
      title: 'Hello',
      summary: 'A short summary',
      url: 'https://example.com/post/123',
    });

    expect(result).toMatchObject({ ok: true, sent: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.linkedin.com/v2/ugcPosts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('marks expired tokens without throwing', async () => {
    process.env.LINKEDIN_COMPANY_ACCESS_TOKEN = 'token';
    process.env.LINKEDIN_COMPANY_AUTO_POST_ENABLED = 'true';
    process.env.LINKEDIN_COMPANY_AUTHOR_URN = 'urn:li:organization:abc123';

    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'expired',
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await triggerLinkedInAutoPost('company', {
      title: 'Hello',
      url: 'https://example.com/post/123',
    });

    expect(result).toMatchObject({ ok: false, expired: true });
  });
});

describe('scopeAllowsAutoPost', () => {
  it('is true only when w_member_social is granted', () => {
    expect(scopeAllowsAutoPost('openid profile email w_member_social')).toBe(true);
    expect(scopeAllowsAutoPost('openid profile email')).toBe(false);
    expect(scopeAllowsAutoPost('')).toBe(false);
  });
});

describe('triggerPersonalAutoPost', () => {
  const originalEnv = { ...process.env };
  const TEST_KEY = Buffer.alloc(32, 7).toString('base64');

  function connection(over: Partial<LinkedinAutoPostConnection> = {}): LinkedinAutoPostConnection {
    return {
      linkedinSub: 'sub-123',
      linkedinPersonId: 'person-123',
      scope: 'openid profile email w_member_social',
      autoPostEnabled: true,
      accessTokenEnc: encryptToken('member-token'),
      accessTokenExpiry: new Date(Date.now() + 60_000),
      ...over,
    };
  }

  beforeEach(() => {
    process.env = { ...originalEnv, LINKEDIN_TOKEN_ENC_KEY: TEST_KEY };
    delete (global as { fetch?: unknown }).fetch;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const input = { title: 'Hello', url: 'https://example.com/blog/1' };

  it('skips when the member has not opted in', async () => {
    const result = await triggerPersonalAutoPost(connection({ autoPostEnabled: false }), input);
    expect(result).toMatchObject({ ok: false, skipped: true, target: 'personal' });
  });

  it('skips when the scope lacks w_member_social', async () => {
    const result = await triggerPersonalAutoPost(
      connection({ scope: 'openid profile email' }),
      input,
    );
    expect(result).toMatchObject({ ok: false, skipped: true, target: 'personal' });
  });

  it('reports expired without calling the API when the stored token is past expiry', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await triggerPersonalAutoPost(
      connection({ accessTokenExpiry: new Date(Date.now() - 1000) }),
      input,
    );

    expect(result).toMatchObject({ ok: false, expired: true, target: 'personal' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires the stored profile person id before posting', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await triggerPersonalAutoPost(connection({ linkedinPersonId: null }), input);

    expect(result).toMatchObject({
      ok: false,
      reconnectRequired: true,
      code: 'LINKEDIN_PERSON_ID_MISSING',
      target: 'personal',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts to the stored person URN with the decrypted token', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 201 });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await triggerPersonalAutoPost(connection(), input);

    expect(result).toMatchObject({ ok: true, sent: true, target: 'personal' });
    const [, requestInit] = fetchMock.mock.calls[0];
    expect(requestInit.headers.Authorization).toBe('Bearer member-token');
    expect(JSON.parse(requestInit.body).author).toBe('urn:li:person:person-123');
  });
});

describe('triggerLinkedInAutoPostForBlog', () => {
  const originalEnv = { ...process.env };
  const TEST_KEY = Buffer.alloc(32, 7).toString('base64');

  const post = {
    id: 'post-1',
    title: 'Hello',
    content: 'Body',
    coverImageUrl: null,
    status: 'published' as const,
  };

  beforeEach(() => {
    process.env = { ...originalEnv, LINKEDIN_TOKEN_ENC_KEY: TEST_KEY };
    delete (global as { fetch?: unknown }).fetch;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns nothing for a non-published post', async () => {
    const results = await triggerLinkedInAutoPostForBlog({ ...post, status: 'draft' });
    expect(results).toEqual([]);
  });

  it('skips both targets when nothing is configured or connected', async () => {
    const results = await triggerLinkedInAutoPostForBlog(post, null);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.skipped)).toBe(true);
    expect(results.map((r) => r.target)).toEqual(['company', 'personal']);
  });

  it('posts to the author profile independently of the company config', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 201 });
    global.fetch = fetchMock as unknown as typeof fetch;

    const results = await triggerLinkedInAutoPostForBlog(post, {
      linkedinSub: 'sub-9',
      linkedinPersonId: 'person-9',
      scope: 'openid profile email w_member_social',
      autoPostEnabled: true,
      accessTokenEnc: encryptToken('tok'),
      accessTokenExpiry: new Date(Date.now() + 60_000),
    });

    const personal = results.find((r) => r.target === 'personal');
    const company = results.find((r) => r.target === 'company');
    expect(personal).toMatchObject({ ok: true, sent: true });
    expect(company).toMatchObject({ skipped: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
