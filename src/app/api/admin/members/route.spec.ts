import { GET as listMembers, POST as createMember } from './route';
import { GET as getMember, PUT as updateMember, DELETE as deleteMember } from './[id]/route';
import { requireAdminSession, apiError } from '@/shared/lib/api-helpers';
import { prisma } from '@/shared/lib/prisma';

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
    member: {
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
  requireAdminSession: jest.fn(),
  apiError: jest.fn().mockImplementation((code: string, message: string, status: number) => ({
    status,
    json: () => Promise.resolve({ error: { code, message } }),
  })),
}));

// ── helpers ───────────────────────────────────────────────────────────────────

const ADMIN_SESSION = {
  session: {
    user: { id: 'uid-1', name: 'Admin', email: 'admin@test.com', role: 'admin' as const },
  },
  response: null,
};

function mockAuth(ok = true) {
  (requireAdminSession as jest.Mock).mockResolvedValue(
    ok
      ? ADMIN_SESSION
      : { session: null, response: { status: 401, json: () => Promise.resolve({}) } },
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

const MEMBER = {
  id: 'mid-1',
  userId: null,
  name: 'Alice',
  bio: 'Dev',
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── GET /api/admin/members ────────────────────────────────────────────────────

describe('GET /api/admin/members', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await listMembers(makeReq('http://localhost/api/admin/members'));
    expect(res.status).toBe(401);
  });

  it('returns paginated list', async () => {
    mockAuth();
    (prisma.member.findMany as jest.Mock).mockResolvedValue([MEMBER]);
    (prisma.member.count as jest.Mock).mockResolvedValue(1);
    const res = await listMembers(makeReq('http://localhost/api/admin/members'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('passes search filter', async () => {
    mockAuth();
    (prisma.member.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.member.count as jest.Mock).mockResolvedValue(0);
    await listMembers(makeReq('http://localhost/api/admin/members?search=alice'));
    expect(prisma.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ name: expect.any(Object) }) }),
    );
  });

  it('returns empty list when no members exist', async () => {
    mockAuth();
    (prisma.member.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.member.count as jest.Mock).mockResolvedValue(0);
    const res = await listMembers(makeReq('http://localhost/api/admin/members'));
    const body = await res.json();
    expect(body.items).toHaveLength(0);
    expect(body.total).toBe(0);
  });
});

// ── POST /api/admin/members ───────────────────────────────────────────────────

describe('POST /api/admin/members', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await createMember(makeReq('http://localhost/api/admin/members', { name: 'A' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is invalid JSON', async () => {
    mockAuth();
    const req = new Request('http://localhost/api/admin/members', { method: 'POST', body: 'bad' });
    await createMember(req);
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
  });

  it('returns 400 when name is missing', async () => {
    mockAuth();
    await createMember(makeReq('http://localhost/api/admin/members', { bio: 'no name' }));
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
  });

  it('returns 400 when name is empty string', async () => {
    mockAuth();
    await createMember(makeReq('http://localhost/api/admin/members', { name: '  ' }));
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
  });

  it('creates member and returns 201', async () => {
    mockAuth();
    (prisma.member.create as jest.Mock).mockResolvedValue(MEMBER);
    const res = await createMember(
      makeReq('http://localhost/api/admin/members', { name: 'Alice', bio: 'Dev' }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Alice');
  });
});

// ── GET /api/admin/members/[id] ───────────────────────────────────────────────

describe('GET /api/admin/members/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await getMember(
      makeReq('http://localhost/api/admin/members/mid-1'),
      paramsFor('mid-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when not found', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(null);
    await getMember(makeReq('http://localhost/api/admin/members/x'), paramsFor('x'));
    expect(apiError).toHaveBeenCalledWith('NOT_FOUND', expect.any(String), 404);
  });

  it('returns the member', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(MEMBER);
    const res = await getMember(
      makeReq('http://localhost/api/admin/members/mid-1'),
      paramsFor('mid-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('mid-1');
  });
});

// ── PUT /api/admin/members/[id] ───────────────────────────────────────────────

describe('PUT /api/admin/members/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await updateMember(
      makeReq('http://localhost/api/admin/members/mid-1', { bio: 'new' }, 'PUT'),
      paramsFor('mid-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is invalid JSON', async () => {
    mockAuth();
    const req = new Request('http://localhost/api/admin/members/mid-1', {
      method: 'PUT',
      body: 'bad',
    });
    await updateMember(req, paramsFor('mid-1'));
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
  });

  it('returns 404 when member not found', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(null);
    await updateMember(
      makeReq('http://localhost/api/admin/members/x', { bio: 'b' }, 'PUT'),
      paramsFor('x'),
    );
    expect(apiError).toHaveBeenCalledWith('NOT_FOUND', expect.any(String), 404);
  });

  it('updates and returns member', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(MEMBER);
    (prisma.member.update as jest.Mock).mockResolvedValue({ ...MEMBER, bio: 'Updated' });
    const res = await updateMember(
      makeReq('http://localhost/api/admin/members/mid-1', { bio: 'Updated' }, 'PUT'),
      paramsFor('mid-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.bio).toBe('Updated');
  });

  it('sets nullable fields to null when passed as null', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(MEMBER);
    (prisma.member.update as jest.Mock).mockResolvedValue({ ...MEMBER, bio: null });
    await updateMember(
      makeReq('http://localhost/api/admin/members/mid-1', { bio: null }, 'PUT'),
      paramsFor('mid-1'),
    );
    expect(prisma.member.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bio: null }) }),
    );
  });
});

// ── DELETE /api/admin/members/[id] ────────────────────────────────────────────

describe('DELETE /api/admin/members/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await deleteMember(
      makeReq('http://localhost/api/admin/members/mid-1', undefined, 'DELETE'),
      paramsFor('mid-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when member not found', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(null);
    await deleteMember(
      makeReq('http://localhost/api/admin/members/x', undefined, 'DELETE'),
      paramsFor('x'),
    );
    expect(apiError).toHaveBeenCalledWith('NOT_FOUND', expect.any(String), 404);
  });

  it('deletes member and returns success', async () => {
    mockAuth();
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(MEMBER);
    (prisma.member.delete as jest.Mock).mockResolvedValue(MEMBER);
    const res = await deleteMember(
      makeReq('http://localhost/api/admin/members/mid-1', undefined, 'DELETE'),
      paramsFor('mid-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
