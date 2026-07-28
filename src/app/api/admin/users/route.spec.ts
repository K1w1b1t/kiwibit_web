import { GET as listUsers, POST as createUser } from './route';
import { GET as getUser, PUT as updateUser, DELETE as deleteUser } from './[id]/route';
import { apiError, requireAdminSession } from '@/shared/lib/api-helpers';
import { prisma } from '@/shared/lib/prisma';
import { makeReq, paramsFor, mockAuth } from '@/shared/test-utils/spec-helpers';

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_pw'),
}));

// ── helpers ───────────────────────────────────────────────────────────────────

/** Meets the 8..72 byte rule enforced by `checkPassword`. */
const VALID_PASSWORD = 'S3nhaForte!';

/** Distinct from the session user (uid-1) so delete is not a self-delete. */
const USER = {
  id: 'uid-2',
  name: 'Alice',
  email: 'alice@test.com',
  role: 'member',
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** Signs the request as a non-admin admin-area role. */
function mockEditorAuth() {
  (requireAdminSession as jest.Mock).mockResolvedValue({
    session: {
      user: { id: 'uid-9', name: 'Ed', email: 'ed@test.com', role: 'editor' as const },
    },
    response: null,
  });
}

// ── GET /api/admin/users ──────────────────────────────────────────────────────

describe('GET /api/admin/users', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await listUsers(makeReq('http://localhost/api/admin/users'));
    expect(res.status).toBe(401);
  });

  it('returns paginated list', async () => {
    mockAuth();
    (prisma.user.findMany as jest.Mock).mockResolvedValue([USER]);
    (prisma.user.count as jest.Mock).mockResolvedValue(1);
    const res = await listUsers(makeReq('http://localhost/api/admin/users'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('never selects the password column', async () => {
    mockAuth();
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.count as jest.Mock).mockResolvedValue(0);
    await listUsers(makeReq('http://localhost/api/admin/users'));
    const args = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
    expect(args.select.password).toBeUndefined();
  });

  it('passes search filter to prisma', async () => {
    mockAuth();
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.count as jest.Mock).mockResolvedValue(0);
    await listUsers(makeReq('http://localhost/api/admin/users?search=alice'));
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
    );
  });

  it('respects page and limit params', async () => {
    mockAuth();
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.count as jest.Mock).mockResolvedValue(0);
    const res = await listUsers(makeReq('http://localhost/api/admin/users?page=2&limit=5'));
    const body = await res.json();
    expect(body.page).toBe(2);
    expect(body.limit).toBe(5);
  });
});

// ── POST /api/admin/users ─────────────────────────────────────────────────────

describe('POST /api/admin/users', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await createUser(
      makeReq('http://localhost/api/admin/users', {
        name: 'A',
        email: 'a@b.com',
        password: VALID_PASSWORD,
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is not valid JSON', async () => {
    mockAuth();
    const req = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      body: 'not-json',
    });
    const res = await createUser(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when required fields are missing', async () => {
    mockAuth();
    await createUser(makeReq('http://localhost/api/admin/users', { name: 'Alice' }));
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
  });

  it.each(['', '   '])('returns 400 for blank name %s', async (name) => {
    mockAuth();
    await createUser(
      makeReq('http://localhost/api/admin/users', {
        name,
        email: 'a@b.com',
        password: VALID_PASSWORD,
      }),
    );
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
  });

  it.each(['not-an-email', 'a@b', ''])('returns 400 for invalid email %s', async (email) => {
    mockAuth();
    await createUser(
      makeReq('http://localhost/api/admin/users', {
        name: 'Alice',
        email,
        password: VALID_PASSWORD,
      }),
    );
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
  });

  it.each(['', 'short'])('returns 400 for weak password %s', async (password) => {
    mockAuth();
    await createUser(
      makeReq('http://localhost/api/admin/users', {
        name: 'Alice',
        email: 'a@b.com',
        password,
      }),
    );
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
  });

  it('returns 400 for a role outside the schema enum', async () => {
    mockAuth();
    await createUser(
      makeReq('http://localhost/api/admin/users', {
        name: 'Alice',
        email: 'a@b.com',
        password: VALID_PASSWORD,
        role: 'superuser',
      }),
    );
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it.each(['admin', 'editor', 'member_manager'])(
    'returns 403 when a non-admin assigns %s',
    async (role) => {
      mockEditorAuth();
      await createUser(
        makeReq('http://localhost/api/admin/users', {
          name: 'Alice',
          email: 'a@b.com',
          password: VALID_PASSWORD,
          role,
        }),
      );
      expect(apiError).toHaveBeenCalledWith('FORBIDDEN', expect.any(String), 403);
      expect(prisma.user.create).not.toHaveBeenCalled();
    },
  );

  it('lets a non-admin create a plain member', async () => {
    mockEditorAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(USER);
    const res = await createUser(
      makeReq('http://localhost/api/admin/users', {
        name: 'Alice',
        email: 'alice@test.com',
        password: VALID_PASSWORD,
        role: 'member',
      }),
    );
    expect(res.status).toBe(201);
  });

  it('returns 409 when email already exists', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    await createUser(
      makeReq('http://localhost/api/admin/users', {
        name: 'A',
        email: 'alice@test.com',
        password: VALID_PASSWORD,
      }),
    );
    expect(apiError).toHaveBeenCalledWith('CONFLICT', expect.any(String), 409);
  });

  it('returns 409 when the insert races the uniqueness check (P2002)', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockRejectedValue({ code: 'P2002' });
    await createUser(
      makeReq('http://localhost/api/admin/users', {
        name: 'A',
        email: 'alice@test.com',
        password: VALID_PASSWORD,
      }),
    );
    expect(apiError).toHaveBeenCalledWith('CONFLICT', expect.any(String), 409);
  });

  it('does not hash before checking for a duplicate email', async () => {
    mockAuth();
    const { hash } = jest.requireMock('bcryptjs') as { hash: jest.Mock };
    hash.mockClear();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    await createUser(
      makeReq('http://localhost/api/admin/users', {
        name: 'A',
        email: 'alice@test.com',
        password: VALID_PASSWORD,
      }),
    );
    expect(hash).not.toHaveBeenCalled();
  });

  it('creates and returns user with 201', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(USER);
    const res = await createUser(
      makeReq('http://localhost/api/admin/users', {
        name: 'Alice',
        email: 'alice@test.com',
        password: VALID_PASSWORD,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe('alice@test.com');
  });

  it('defaults role to member', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(USER);
    await createUser(
      makeReq('http://localhost/api/admin/users', {
        name: 'Alice',
        email: 'alice@test.com',
        password: VALID_PASSWORD,
      }),
    );
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'member' }) }),
    );
  });
});

// ── GET /api/admin/users/[id] ─────────────────────────────────────────────────

describe('GET /api/admin/users/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await getUser(
      makeReq('http://localhost/api/admin/users/uid-2'),
      paramsFor('uid-2'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await getUser(makeReq('http://localhost/api/admin/users/missing'), paramsFor('missing'));
    expect(apiError).toHaveBeenCalledWith('NOT_FOUND', expect.any(String), 404);
  });

  it('returns the user when found, without password', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    const res = await getUser(
      makeReq('http://localhost/api/admin/users/uid-2'),
      paramsFor('uid-2'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('uid-2');
    const args = (prisma.user.findUnique as jest.Mock).mock.calls[0][0];
    expect(args.select.password).toBeUndefined();
  });
});

// ── PUT /api/admin/users/[id] ─────────────────────────────────────────────────

describe('PUT /api/admin/users/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await updateUser(
      makeReq('http://localhost/api/admin/users/uid-2', { name: 'Bob' }, 'PUT'),
      paramsFor('uid-2'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is not valid JSON', async () => {
    mockAuth();
    const req = new Request('http://localhost/api/admin/users/uid-2', {
      method: 'PUT',
      body: 'bad',
    });
    const res = await updateUser(req, paramsFor('uid-2'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when user not found', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await updateUser(
      makeReq('http://localhost/api/admin/users/x', { name: 'B' }, 'PUT'),
      paramsFor('x'),
    );
    expect(apiError).toHaveBeenCalledWith('NOT_FOUND', expect.any(String), 404);
  });

  it('updates and returns user', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    (prisma.user.update as jest.Mock).mockResolvedValue({ ...USER, name: 'Bob' });
    const res = await updateUser(
      makeReq('http://localhost/api/admin/users/uid-2', { name: 'Bob' }, 'PUT'),
      paramsFor('uid-2'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Bob');
  });

  it('hashes password when password field is provided', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    (prisma.user.update as jest.Mock).mockResolvedValue(USER);
    await updateUser(
      makeReq('http://localhost/api/admin/users/uid-2', { password: VALID_PASSWORD }, 'PUT'),
      paramsFor('uid-2'),
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ password: 'hashed_pw' }) }),
    );
  });

  it.each(['', 'short'])('returns 400 and never stores a weak password %s', async (password) => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    await updateUser(
      makeReq('http://localhost/api/admin/users/uid-2', { password }, 'PUT'),
      paramsFor('uid-2'),
    );
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('returns 400 for a role outside the schema enum', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    await updateUser(
      makeReq('http://localhost/api/admin/users/uid-2', { role: 'root' }, 'PUT'),
      paramsFor('uid-2'),
    );
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('returns 403 when a non-admin promotes to a privileged role', async () => {
    mockEditorAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    await updateUser(
      makeReq('http://localhost/api/admin/users/uid-2', { role: 'admin' }, 'PUT'),
      paramsFor('uid-2'),
    );
    expect(apiError).toHaveBeenCalledWith('FORBIDDEN', expect.any(String), 403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('returns 409 when demoting the last admin', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...USER, role: 'admin' });
    (prisma.user.count as jest.Mock).mockResolvedValue(1);
    await updateUser(
      makeReq('http://localhost/api/admin/users/uid-2', { role: 'member' }, 'PUT'),
      paramsFor('uid-2'),
    );
    expect(apiError).toHaveBeenCalledWith('CONFLICT', expect.any(String), 409);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('allows demoting an admin when another admin remains', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...USER, role: 'admin' });
    (prisma.user.count as jest.Mock).mockResolvedValue(2);
    (prisma.user.update as jest.Mock).mockResolvedValue({ ...USER, role: 'member' });
    const res = await updateUser(
      makeReq('http://localhost/api/admin/users/uid-2', { role: 'member' }, 'PUT'),
      paramsFor('uid-2'),
    );
    expect(res.status).toBe(200);
  });

  it('returns 409 when the new email is taken (P2002)', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    (prisma.user.update as jest.Mock).mockRejectedValue({ code: 'P2002' });
    await updateUser(
      makeReq('http://localhost/api/admin/users/uid-2', { email: 'taken@test.com' }, 'PUT'),
      paramsFor('uid-2'),
    );
    expect(apiError).toHaveBeenCalledWith('CONFLICT', expect.any(String), 409);
  });
});

// ── DELETE /api/admin/users/[id] ──────────────────────────────────────────────

describe('DELETE /api/admin/users/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await deleteUser(
      makeReq('http://localhost/api/admin/users/uid-2', undefined, 'DELETE'),
      paramsFor('uid-2'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await deleteUser(
      makeReq('http://localhost/api/admin/users/x', undefined, 'DELETE'),
      paramsFor('x'),
    );
    expect(apiError).toHaveBeenCalledWith('NOT_FOUND', expect.any(String), 404);
  });

  it('refuses to delete your own account', async () => {
    mockAuth();
    // ADMIN_SESSION is uid-1.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...USER, id: 'uid-1' });
    await deleteUser(
      makeReq('http://localhost/api/admin/users/uid-1', undefined, 'DELETE'),
      paramsFor('uid-1'),
    );
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete the last admin', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...USER, role: 'admin' });
    (prisma.user.count as jest.Mock).mockResolvedValue(1);
    await deleteUser(
      makeReq('http://localhost/api/admin/users/uid-2', undefined, 'DELETE'),
      paramsFor('uid-2'),
    );
    expect(apiError).toHaveBeenCalledWith('CONFLICT', expect.any(String), 409);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('deletes user and returns success', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    (prisma.user.delete as jest.Mock).mockResolvedValue(USER);
    const res = await deleteUser(
      makeReq('http://localhost/api/admin/users/uid-2', undefined, 'DELETE'),
      paramsFor('uid-2'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
