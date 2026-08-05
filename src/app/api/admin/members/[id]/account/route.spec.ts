import { POST as createAccount } from './route';
import { apiError, requireAdminSession } from '@/shared/lib/api-helpers';
import { prisma } from '@/shared/lib/prisma';
import { makeReq, paramsFor, mockAuth } from '@/shared/test-utils/spec-helpers';

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_pw'),
}));

// ── helpers ───────────────────────────────────────────────────────────────────

const URL_ = 'http://localhost/api/admin/members/mid-1/account';

/** Meets the 8..72 byte rule enforced by `checkPassword`. */
const VALID_PASSWORD = 'S3nhaForte!';

const VALID_BODY = { email: 'alice@test.com', password: VALID_PASSWORD };

/** A member with no account yet — the only state this route accepts. */
const UNLINKED_MEMBER = { id: 'mid-1', name: 'Alice', userId: null };

function uniqueConstraintError() {
  return Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
}

/** Signs in as `editor`, which may not hand out privileged roles. */
function mockEditorAuth() {
  (requireAdminSession as jest.Mock).mockResolvedValue({
    session: { user: { id: 'uid-9', name: 'Ed', email: 'ed@test.com', role: 'editor' } },
    response: null,
  });
}

beforeEach(() => {
  (prisma.member.findUnique as jest.Mock).mockResolvedValue(UNLINKED_MEMBER);
});

// ── POST /api/admin/members/[id]/account ──────────────────────────────────────

describe('POST /api/admin/members/[id]/account', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await createAccount(makeReq(URL_, VALID_BODY), paramsFor('mid-1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is invalid JSON', async () => {
    mockAuth();
    const req = new Request(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{oops',
    });
    const res = await createAccount(req, paramsFor('mid-1'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when the member does not exist', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await createAccount(makeReq(URL_, VALID_BODY), paramsFor('mid-1'));
    expect(res.status).toBe(404);
  });

  it('returns 409 when the member already has an account', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      ...UNLINKED_MEMBER,
      userId: 'uid-7',
    });

    const res = await createAccount(makeReq(URL_, VALID_BODY), paramsFor('mid-1'));

    expect(res.status).toBe(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid email', async () => {
    mockAuth();
    const res = await createAccount(
      makeReq(URL_, { ...VALID_BODY, email: 'not-an-email' }),
      paramsFor('mid-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for a password below the minimum length', async () => {
    mockAuth();
    const res = await createAccount(
      makeReq(URL_, { ...VALID_BODY, password: 'short' }),
      paramsFor('mid-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for an unknown role', async () => {
    mockAuth();
    const res = await createAccount(
      makeReq(URL_, { ...VALID_BODY, role: 'wizard' }),
      paramsFor('mid-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 403 when a non-admin assigns a privileged role', async () => {
    mockEditorAuth();
    const res = await createAccount(
      makeReq(URL_, { ...VALID_BODY, role: 'admin' }),
      paramsFor('mid-1'),
    );
    expect(res.status).toBe(403);
    expect(apiError).toHaveBeenCalledWith('FORBIDDEN', expect.any(String), 403);
  });

  it('creates the user and links it to the member in one transaction', async () => {
    mockAuth();
    const created = { id: 'uid-2', name: 'Alice', email: 'alice@test.com', role: 'member' };
    (prisma.user.create as jest.Mock).mockResolvedValue(created);

    const res = await createAccount(makeReq(URL_, VALID_BODY), paramsFor('mid-1'));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toEqual(created);

    expect(prisma.$transaction).toHaveBeenCalled();
    // Name comes from the member row, not the request body.
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Alice',
          email: 'alice@test.com',
          password: 'hashed_pw',
          role: 'member',
        }),
      }),
    );
    expect(prisma.member.update).toHaveBeenCalledWith({
      where: { id: 'mid-1' },
      data: { userId: 'uid-2' },
    });
  });

  it('defaults the role to member when omitted', async () => {
    mockAuth();
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'uid-2' });

    await createAccount(makeReq(URL_, VALID_BODY), paramsFor('mid-1'));

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'member' }) }),
    );
  });

  it('trims the email before storing it', async () => {
    mockAuth();
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'uid-2' });

    await createAccount(
      makeReq(URL_, { ...VALID_BODY, email: '  alice@test.com  ' }),
      paramsFor('mid-1'),
    );

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'alice@test.com' }) }),
    );
  });

  it('never stores the raw password', async () => {
    mockAuth();
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'uid-2' });

    await createAccount(makeReq(URL_, VALID_BODY), paramsFor('mid-1'));

    const data = (prisma.user.create as jest.Mock).mock.calls[0][0].data;
    expect(data.password).not.toBe(VALID_PASSWORD);
  });

  it('does not hash before rejecting an already-linked member', async () => {
    mockAuth();
    const { hash } = jest.requireMock('bcryptjs') as { hash: jest.Mock };
    hash.mockClear();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      ...UNLINKED_MEMBER,
      userId: 'uid-7',
    });

    await createAccount(makeReq(URL_, VALID_BODY), paramsFor('mid-1'));

    expect(hash).not.toHaveBeenCalled();
  });

  it('maps a duplicate email to 409', async () => {
    mockAuth();
    (prisma.$transaction as jest.Mock).mockRejectedValueOnce(uniqueConstraintError());

    const res = await createAccount(makeReq(URL_, VALID_BODY), paramsFor('mid-1'));

    expect(res.status).toBe(409);
    expect(apiError).toHaveBeenCalledWith('CONFLICT', 'Email already in use.', 409);
  });

  it('rethrows an unrecognised database error', async () => {
    mockAuth();
    (prisma.$transaction as jest.Mock).mockRejectedValueOnce(new Error('connection lost'));

    await expect(createAccount(makeReq(URL_, VALID_BODY), paramsFor('mid-1'))).rejects.toThrow(
      'connection lost',
    );
  });
});
