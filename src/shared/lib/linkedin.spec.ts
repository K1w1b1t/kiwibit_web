import {
  authorizeUrl,
  exchangeCode,
  fetchUserinfo,
  generatePkce,
  isLinkedinConfigured,
  LINKEDIN_SCOPE,
  parseOauthCookie,
  redirectUri,
} from './linkedin';

describe('generatePkce', () => {
  it('generates a valid codeVerifier and S256 codeChallenge', () => {
    const { codeVerifier, codeChallenge } = generatePkce();
    expect(codeVerifier).toBeTruthy();
    expect(codeChallenge).toBeTruthy();
    expect(typeof codeVerifier).toBe('string');
    expect(typeof codeChallenge).toBe('string');
    expect(codeVerifier).not.toEqual(codeChallenge);
  });
});

describe('parseOauthCookie', () => {
  it('splits state and member id (legacy 2-part format)', () => {
    expect(parseOauthCookie('abc:member-1')).toEqual({ state: 'abc', memberId: 'member-1' });
  });

  it('splits state, codeVerifier, and member id (3-part PKCE format)', () => {
    expect(parseOauthCookie('abc:verifier123:member-1')).toEqual({
      state: 'abc',
      codeVerifier: 'verifier123',
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

  it('builds an authorize URL with PKCE parameters, basic scope, and fixed redirect', () => {
    const url = new URL(authorizeUrl('state-xyz', 'challenge-123'));
    expect(url.origin + url.pathname).toBe('https://www.linkedin.com/oauth/v2/authorization');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('client-123');
    expect(url.searchParams.get('scope')).toBe(LINKEDIN_SCOPE);
    expect(url.searchParams.get('state')).toBe('state-xyz');
    expect(url.searchParams.get('code_challenge')).toBe('challenge-123');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri());
  });

  it('exchanges a code with codeVerifier for an access token', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ access_token: 'tok', expires_in: 5184000, scope: LINKEDIN_SCOPE }),
          { status: 200 },
        ),
      );

    const result = await exchangeCode('the-code', 'verifier-456');
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
    const callBody = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
    expect(callBody.get('code_verifier')).toBe('verifier-456');
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
