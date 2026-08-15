import { NextRequest } from 'next/server';
import { GET as connectLinkedin } from './route';
import { prisma } from '@/shared/lib/prisma';
import { paramsFor, mockAuth } from '@/shared/test-utils/spec-helpers';
import * as linkedinLib from '@/shared/lib/linkedin';

describe('GET /api/admin/members/[id]/linkedin/connect', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.LINKEDIN_CLIENT_ID = 'client-id';
    process.env.LINKEDIN_CLIENT_SECRET = 'client-secret';
    process.env.LINKEDIN_TOKEN_ENC_KEY = Buffer.alloc(32, 'a').toString('base64');
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await connectLinkedin(
      new NextRequest('http://localhost/api/admin/members/mid-1/linkedin/connect'),
      paramsFor('mid-1'),
    );
    expect(res.status).toBe(401);
  });

  it('redirects with error status when linkedin is not configured', async () => {
    mockAuth();
    delete process.env.LINKEDIN_CLIENT_SECRET;

    const res = await connectLinkedin(
      new NextRequest('http://localhost/api/admin/members/mid-1/linkedin/connect'),
      paramsFor('mid-1'),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/members/mid-1/edit?linkedin=error');
  });

  it('redirects with forbidden status when signed-in user does not own member', async () => {
    mockAuth(); // user id is uid-1
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({ userId: 'other-user' });

    const res = await connectLinkedin(
      new NextRequest('http://localhost/api/admin/members/mid-1/linkedin/connect'),
      paramsFor('mid-1'),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/members/mid-1/edit?linkedin=forbidden');
  });

  it('starts OAuth flow with PKCE and sets httpOnly cookie', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({ userId: 'uid-1' });

    const res = await connectLinkedin(
      new NextRequest('http://localhost/api/admin/members/mid-1/linkedin/connect'),
      paramsFor('mid-1'),
    );

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('https://www.linkedin.com/oauth/v2/authorization');
    expect(location).toContain('code_challenge=');
    expect(location).toContain('code_challenge_method=S256');

    const cookieHeader = res.headers.get('set-cookie');
    expect(cookieHeader).toContain(linkedinLib.LINKEDIN_OAUTH_COOKIE);
    expect(cookieHeader).toContain('HttpOnly');
  });
});
