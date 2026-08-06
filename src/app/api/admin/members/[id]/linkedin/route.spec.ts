import { DELETE as disconnectLinkedin } from './route';
import { prisma } from '@/shared/lib/prisma';
import { makeReq, paramsFor, mockAuth } from '@/shared/test-utils/spec-helpers';

// ADMIN_SESSION.user.id is 'uid-1'.

describe('DELETE /api/admin/members/[id]/linkedin', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await disconnectLinkedin(
      makeReq('http://localhost/api/admin/members/mid-1/linkedin', undefined, 'DELETE'),
      paramsFor('mid-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when the member does not exist', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await disconnectLinkedin(
      makeReq('http://localhost/api/admin/members/mid-1/linkedin', undefined, 'DELETE'),
      paramsFor('mid-1'),
    );
    expect(res.status).toBe(404);
    expect(prisma.linkedinConnection.deleteMany).not.toHaveBeenCalled();
  });

  it('forbids disconnecting a member that is not your own account', async () => {
    mockAuth();
    // Linked to a different user than the signed-in one.
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({ userId: 'someone-else' });
    const res = await disconnectLinkedin(
      makeReq('http://localhost/api/admin/members/mid-1/linkedin', undefined, 'DELETE'),
      paramsFor('mid-1'),
    );
    expect(res.status).toBe(403);
    expect(prisma.linkedinConnection.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes the connection for your own member', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({ userId: 'uid-1' });
    (prisma.linkedinConnection.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    const res = await disconnectLinkedin(
      makeReq('http://localhost/api/admin/members/mid-1/linkedin', undefined, 'DELETE'),
      paramsFor('mid-1'),
    );

    expect(res.status).toBe(200);
    expect(prisma.linkedinConnection.deleteMany).toHaveBeenCalledWith({
      where: { memberId: 'mid-1' },
    });
  });
});
