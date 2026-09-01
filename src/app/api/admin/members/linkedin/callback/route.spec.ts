import { NextRequest } from 'next/server';
import { GET as linkedinCallback } from './route';
import { prisma } from '@/shared/lib/prisma';
import { mockAuth } from '@/shared/test-utils/spec-helpers';
import * as linkedinLib from '@/shared/lib/linkedin';

describe('GET /api/admin/members/linkedin/callback', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.LINKEDIN_CLIENT_ID = 'client-id';
    process.env.LINKEDIN_CLIENT_SECRET = 'client-secret';
    process.env.LINKEDIN_TOKEN_ENC_KEY = Buffer.alloc(32, 'a').toString('base64');
    (prisma.linkedinConnection.findFirst as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const req = new NextRequest('http://localhost/api/admin/members/linkedin/callback');
    const res = await linkedinCallback(req);
    expect(res.status).toBe(401);
  });

  it('redirects to members list when OAuth cookie is missing', async () => {
    mockAuth();
    const req = new NextRequest(
      'http://localhost/api/admin/members/linkedin/callback?code=123&state=abc',
    );
    const res = await linkedinCallback(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/members');
  });

  it('redirects with error status when state in URL does not match state in cookie', async () => {
    mockAuth();
    const req = new NextRequest(
      'http://localhost/api/admin/members/linkedin/callback?code=123&state=wrong_state',
      {
        headers: { cookie: `${linkedinLib.LINKEDIN_OAUTH_COOKIE}=correct_state:mid-1` },
      },
    );
    const res = await linkedinCallback(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/members/mid-1/edit?linkedin=error');
  });

  it('redirects with forbidden status when signed-in user does not own the member', async () => {
    mockAuth(); // user id is uid-1
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      userId: 'other-user',
      avatarPath: null,
    });

    const req = new NextRequest(
      'http://localhost/api/admin/members/linkedin/callback?code=123&state=state123',
      {
        headers: { cookie: `${linkedinLib.LINKEDIN_OAUTH_COOKIE}=state123:mid-1` },
      },
    );
    const res = await linkedinCallback(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/members/mid-1/edit?linkedin=forbidden');
  });

  it('redirects with error status when linkedinSub is already bound to another member', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      userId: 'uid-1',
      avatarPath: null,
    });

    jest.spyOn(linkedinLib, 'exchangeCode').mockResolvedValue({
      accessToken: 'tok-123',
      expiresInSeconds: 3600,
      scope: 'openid profile email',
    });
    jest.spyOn(linkedinLib, 'fetchUserinfo').mockResolvedValue({
      sub: 'sub-claimed-by-other',
      picture: null,
    });
    jest.spyOn(linkedinLib, 'fetchProfile').mockResolvedValue({ id: 'person-claimed-by-other' });

    (prisma.linkedinConnection.findFirst as jest.Mock).mockResolvedValue({
      memberId: 'other-member-id',
    });

    const req = new NextRequest(
      'http://localhost/api/admin/members/linkedin/callback?code=123&state=state123',
      {
        headers: { cookie: `${linkedinLib.LINKEDIN_OAUTH_COOKIE}=state123:mid-1` },
      },
    );
    const res = await linkedinCallback(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/members/mid-1/edit?linkedin=error');
  });

  it('successfully connects LinkedIn account and upserts connection', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      userId: 'uid-1',
      avatarPath: null,
    });

    jest.spyOn(linkedinLib, 'exchangeCode').mockResolvedValue({
      accessToken: 'tok-123',
      expiresInSeconds: 3600,
      scope: 'openid profile email',
    });
    jest.spyOn(linkedinLib, 'fetchUserinfo').mockResolvedValue({
      sub: 'sub-my-account',
      picture: null,
    });
    jest.spyOn(linkedinLib, 'fetchProfile').mockResolvedValue({ id: 'person-my-account' });

    (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb(prisma));
    (prisma.linkedinConnection.upsert as jest.Mock).mockResolvedValue({});

    const req = new NextRequest(
      'http://localhost/api/admin/members/linkedin/callback?code=123&state=state123',
      {
        headers: { cookie: `${linkedinLib.LINKEDIN_OAUTH_COOKIE}=state123:mid-1` },
      },
    );
    const res = await linkedinCallback(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/members/mid-1/edit?linkedin=connected');
    expect(prisma.linkedinConnection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { memberId: 'mid-1' },
        create: expect.objectContaining({
          linkedinSub: 'sub-my-account',
          linkedinPersonId: 'person-my-account',
          autoPostEnabled: false,
        }),
      }),
    );
  });

  it('enables the auto-post opt-in when the granted scope includes w_member_social', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      userId: 'uid-1',
      avatarPath: null,
    });

    jest.spyOn(linkedinLib, 'exchangeCode').mockResolvedValue({
      accessToken: 'tok-123',
      expiresInSeconds: 3600,
      scope: 'openid profile email w_member_social',
    });
    jest.spyOn(linkedinLib, 'fetchUserinfo').mockResolvedValue({ sub: 'sub-x', picture: null });
    jest.spyOn(linkedinLib, 'fetchProfile').mockResolvedValue({ id: 'person-x' });

    (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb(prisma));
    (prisma.linkedinConnection.upsert as jest.Mock).mockResolvedValue({});

    const req = new NextRequest(
      'http://localhost/api/admin/members/linkedin/callback?code=123&state=state123',
      { headers: { cookie: `${linkedinLib.LINKEDIN_OAUTH_COOKIE}=state123:mid-1` } },
    );
    await linkedinCallback(req);

    expect(prisma.linkedinConnection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ autoPostEnabled: true }),
        update: expect.objectContaining({ autoPostEnabled: true }),
      }),
    );
  });
});
