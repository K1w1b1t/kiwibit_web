import { GET as listUsers, POST as createUser } from './route';
import { GET as getUser, PUT as updateUser, DELETE as deleteUser } from './[id]/route';
import { requireAdminSession, apiError } from '@/shared/lib/api-helpers';
import { prisma } from '@/shared/lib/prisma';

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(body),
    })),
  },
}));

jest.mock('@/shared/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('@/shared/lib/api-helpers', () => ({
  ...jest.requireActual('@/shared/lib/api-helpers'),
  requireAdminSession: jest.fn(),
  apiError: jest.fn().mockImplementation((code: string, message: string, status: number) => ({
    status,
    json: () => Promise.resolve({ error: { code, message } }),
  })),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_pw'),
}));

// ── helpers ───────────────────────────────────────────────────────────────────

const ADMIN_SESSION = {
  session: {
    user: { id: 'uid-1', name: 'Admin', email: 'admin@test.com', role: 'admin' as const },
  },
  response: null,
};
const UNAUTH_RESPONSE = {
  status: 401,
  json: () => Promise.resolve({ error: { code: 'UNAUTHORIZED' } }),
};

function mockAuth(ok = true) {
  (requireAdminSession as jest.Mock).mockResolvedValue(
    ok ? ADMIN_SESSION : { session: null, response: UNAUTH_RESPONSE },
  );
}

function makeReq(url: string, body?: unknown, method = body ? 'POST' : 'GET') {
  return new Request(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

const USER = {
  id: 'uid-1',
  name: 'Alice',
  email: 'alice@test.com',
  role: 'member',
  createdAt: new Date(),
  updatedAt: new Date(),
};

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
      makeReq('http://localhost/api/admin/users', { name: 'A', email: 'a@b.com', password: 'pw' }),
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

  it('returns 409 when email already exists', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    await createUser(
      makeReq('http://localhost/api/admin/users', {
        name: 'A',
        email: 'alice@test.com',
        password: 'pw',
      }),
    );
    expect(apiError).toHaveBeenCalledWith('CONFLICT', expect.any(String), 409);
  });

  it('creates and returns user with 201', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(USER);
    const res = await createUser(
      makeReq('http://localhost/api/admin/users', {
        name: 'Alice',
        email: 'alice@test.com',
        password: 'pw',
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe('alice@test.com');
  });
});

// ── GET /api/admin/users/[id] ─────────────────────────────────────────────────

describe('GET /api/admin/users/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await getUser(
      makeReq('http://localhost/api/admin/users/uid-1'),
      paramsFor('uid-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await getUser(makeReq('http://localhost/api/admin/users/missing'), paramsFor('missing'));
    expect(apiError).toHaveBeenCalledWith('NOT_FOUND', expect.any(String), 404);
  });

  it('returns the user when found', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    const res = await getUser(
      makeReq('http://localhost/api/admin/users/uid-1'),
      paramsFor('uid-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('uid-1');
  });
});

// ── PUT /api/admin/users/[id] ─────────────────────────────────────────────────

describe('PUT /api/admin/users/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await updateUser(
      makeReq('http://localhost/api/admin/users/uid-1', { name: 'Bob' }, 'PUT'),
      paramsFor('uid-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is not valid JSON', async () => {
    mockAuth();
    const req = new Request('http://localhost/api/admin/users/uid-1', {
      method: 'PUT',
      body: 'bad',
    });
    const res = await updateUser(req, paramsFor('uid-1'));
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
      makeReq('http://localhost/api/admin/users/uid-1', { name: 'Bob' }, 'PUT'),
      paramsFor('uid-1'),
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
      makeReq('http://localhost/api/admin/users/uid-1', { password: 'newpw' }, 'PUT'),
      paramsFor('uid-1'),
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ password: 'hashed_pw' }) }),
    );
  });
});

// ── DELETE /api/admin/users/[id] ──────────────────────────────────────────────

describe('DELETE /api/admin/users/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await deleteUser(
      makeReq('http://localhost/api/admin/users/uid-1', undefined, 'DELETE'),
      paramsFor('uid-1'),
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

  it('deletes user and returns success', async () => {
    mockAuth();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    (prisma.user.delete as jest.Mock).mockResolvedValue(USER);
    const res = await deleteUser(
      makeReq('http://localhost/api/admin/users/uid-1', undefined, 'DELETE'),
      paramsFor('uid-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
