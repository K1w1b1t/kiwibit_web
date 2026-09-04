import { PUT } from './route';
import { apiError, requirePanelSession } from '@/shared/lib/api-helpers';
import { prisma } from '@/shared/lib/prisma';
import { makeReq, mockAuth } from '@/shared/test-utils/spec-helpers';

const MEMBER_SESSION = {
  session: {
    user: { id: 'uid-member', name: 'Member', email: 'member@test.com', role: 'member' as const },
  },
  response: null,
};

const MEMBER = { id: 'mid-1', userId: 'uid-member', name: 'Alice', bio: 'Dev' };

describe('PUT /api/member/profile', () => {
  beforeEach(() => {
    (requirePanelSession as jest.Mock).mockResolvedValue(MEMBER_SESSION);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await PUT(
      makeReq('http://localhost/api/member/profile', { bio: 'Updated' }, 'PUT'),
    );
    expect(res.status).toBe(401);
  });

  it('rejects a non-member role', async () => {
    (requirePanelSession as jest.Mock).mockResolvedValue({
      session: { user: { ...MEMBER_SESSION.session.user, role: 'admin' } },
      response: null,
    });
    await PUT(makeReq('http://localhost/api/member/profile', { bio: 'Updated' }, 'PUT'));
    expect(apiError).toHaveBeenCalledWith('FORBIDDEN', expect.any(String), 403);
  });

  it('rejects changes to the user association', async () => {
    await PUT(makeReq('http://localhost/api/member/profile', { userId: 'uid-other' }, 'PUT'));
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
    expect(prisma.member.update).not.toHaveBeenCalled();
  });

  it('returns 404 when the user has no linked member profile', async () => {
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(null);
    await PUT(makeReq('http://localhost/api/member/profile', { bio: 'Updated' }, 'PUT'));
    expect(apiError).toHaveBeenCalledWith('NOT_FOUND', expect.any(String), 404);
  });

  it('updates only the linked member profile', async () => {
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(MEMBER);
    (prisma.member.update as jest.Mock).mockResolvedValue({ ...MEMBER, bio: 'Updated' });

    const res = await PUT(
      makeReq('http://localhost/api/member/profile', { bio: 'Updated' }, 'PUT'),
    );

    expect(res.status).toBe(200);
    expect(prisma.member.findUnique).toHaveBeenCalledWith({ where: { userId: 'uid-member' } });
    expect(prisma.member.update).toHaveBeenCalledWith({
      where: { id: 'mid-1' },
      data: { bio: 'Updated' },
    });
  });
});
