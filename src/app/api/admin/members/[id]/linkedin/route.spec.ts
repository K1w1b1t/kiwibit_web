import { DELETE as disconnectLinkedin, PATCH as toggleAutoPost } from './route';
import { prisma } from '@/shared/lib/prisma';
import { makeReq, paramsFor, mockAuth } from '@/shared/test-utils/spec-helpers';

// ADMIN_SESSION.user.id is 'uid-1'.
const AUTOPOST_SCOPE = 'openid profile email w_member_social';

function patchReq(body: unknown) {
  return makeReq('http://localhost/api/admin/members/mid-1/linkedin', body, 'PATCH');
}

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

describe('PATCH /api/admin/members/[id]/linkedin', () => {
  it('rejects a non-boolean autoPostEnabled', async () => {
    mockAuth();
    const res = await toggleAutoPost(patchReq({ autoPostEnabled: 'yes' }), paramsFor('mid-1'));
    expect(res.status).toBe(400);
    expect(prisma.linkedinConnection.update).not.toHaveBeenCalled();
  });

  it('forbids toggling a member that is not your own account', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      userId: 'someone-else',
      linkedinConnection: { scope: AUTOPOST_SCOPE },
    });
    const res = await toggleAutoPost(patchReq({ autoPostEnabled: true }), paramsFor('mid-1'));
    expect(res.status).toBe(403);
    expect(prisma.linkedinConnection.update).not.toHaveBeenCalled();
  });

  it('404s when the member has no connection', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      userId: 'uid-1',
      linkedinConnection: null,
    });
    const res = await toggleAutoPost(patchReq({ autoPostEnabled: true }), paramsFor('mid-1'));
    expect(res.status).toBe(404);
    expect(prisma.linkedinConnection.update).not.toHaveBeenCalled();
  });

  it('409s when enabling without the auto-post scope', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      userId: 'uid-1',
      linkedinConnection: { scope: 'openid profile email' },
    });
    const res = await toggleAutoPost(patchReq({ autoPostEnabled: true }), paramsFor('mid-1'));
    expect(res.status).toBe(409);
    expect(prisma.linkedinConnection.update).not.toHaveBeenCalled();
  });

  it('enables the opt-in when the scope allows it', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      userId: 'uid-1',
      linkedinConnection: { scope: AUTOPOST_SCOPE },
    });
    (prisma.linkedinConnection.update as jest.Mock).mockResolvedValue({});
    const res = await toggleAutoPost(patchReq({ autoPostEnabled: true }), paramsFor('mid-1'));
    expect(res.status).toBe(200);
    expect(prisma.linkedinConnection.update).toHaveBeenCalledWith({
      where: { memberId: 'mid-1' },
      data: { autoPostEnabled: true },
    });
  });

  it('allows disabling even without the auto-post scope', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      userId: 'uid-1',
      linkedinConnection: { scope: 'openid profile email' },
    });
    (prisma.linkedinConnection.update as jest.Mock).mockResolvedValue({});
    const res = await toggleAutoPost(patchReq({ autoPostEnabled: false }), paramsFor('mid-1'));
    expect(res.status).toBe(200);
    expect(prisma.linkedinConnection.update).toHaveBeenCalledWith({
      where: { memberId: 'mid-1' },
      data: { autoPostEnabled: false },
    });
  });
});
