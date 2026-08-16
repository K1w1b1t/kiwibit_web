import {
  authorizeUrl,
  exchangeCode,
  fetchUserinfo,
  isLinkedinConfigured,
  LINKEDIN_SCOPE,
  parseOauthCookie,
  redirectUri,
  triggerLinkedInAutoPost,
} from './linkedin';

describe('parseOauthCookie', () => {
  it('splits state and member id', () => {
    expect(parseOauthCookie('abc:member-1')).toEqual({ state: 'abc', memberId: 'member-1' });
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
