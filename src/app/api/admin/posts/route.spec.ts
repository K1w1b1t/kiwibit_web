import { GET as listPosts, POST as createPost } from './route';
import { GET as getPost, PUT as updatePost, DELETE as deletePost } from './[id]/route';
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
    post: {
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

const POST_RECORD = {
  id: 'post-1',
  title: 'Hello',
  content: 'World',
  authorId: 'uid-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── GET /api/admin/posts ──────────────────────────────────────────────────────

describe('GET /api/admin/posts', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await listPosts(makeReq('http://localhost/api/admin/posts'));
    expect(res.status).toBe(401);
  });

  it('returns paginated list', async () => {
    mockAuth();
    (prisma.post.findMany as jest.Mock).mockResolvedValue([POST_RECORD]);
    (prisma.post.count as jest.Mock).mockResolvedValue(1);
    const res = await listPosts(makeReq('http://localhost/api/admin/posts'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('filters by authorId', async () => {
    mockAuth();
    (prisma.post.findMany as jest.Mock).mockResolvedValue([POST_RECORD]);
    (prisma.post.count as jest.Mock).mockResolvedValue(1);
    await listPosts(makeReq('http://localhost/api/admin/posts?authorId=uid-1'));
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ authorId: 'uid-1' }) }),
    );
  });

  it('filters by search term', async () => {
    mockAuth();
    (prisma.post.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.post.count as jest.Mock).mockResolvedValue(0);
    await listPosts(makeReq('http://localhost/api/admin/posts?search=hello'));
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ title: expect.any(Object) }) }),
    );
  });

  it('returns empty list when no posts exist', async () => {
    mockAuth();
    (prisma.post.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.post.count as jest.Mock).mockResolvedValue(0);
    const res = await listPosts(makeReq('http://localhost/api/admin/posts'));
    const body = await res.json();
    expect(body.items).toHaveLength(0);
    expect(body.total).toBe(0);
  });
});

// ── POST /api/admin/posts ─────────────────────────────────────────────────────

describe('POST /api/admin/posts', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await createPost(
      makeReq('http://localhost/api/admin/posts', { title: 'T', content: 'C' }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is invalid JSON', async () => {
    mockAuth();
    const req = new Request('http://localhost/api/admin/posts', { method: 'POST', body: 'bad' });
    await createPost(req);
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
  });

  it('returns 400 when title is missing', async () => {
    mockAuth();
    await createPost(makeReq('http://localhost/api/admin/posts', { content: 'no title' }));
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
  });

  it('returns 400 when content is missing', async () => {
    mockAuth();
    await createPost(makeReq('http://localhost/api/admin/posts', { title: 'no content' }));
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
  });

  it('creates post with session authorId and returns 201', async () => {
    mockAuth();
    (prisma.post.create as jest.Mock).mockResolvedValue(POST_RECORD);
    const res = await createPost(
      makeReq('http://localhost/api/admin/posts', { title: 'Hello', content: 'World' }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Hello');
    expect(prisma.post.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ authorId: 'uid-1' }) }),
    );
  });
});

// ── GET /api/admin/posts/[id] ─────────────────────────────────────────────────

describe('GET /api/admin/posts/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await getPost(
      makeReq('http://localhost/api/admin/posts/post-1'),
      paramsFor('post-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when not found', async () => {
    mockAuth();
    (prisma.post.findUnique as jest.Mock).mockResolvedValue(null);
    await getPost(makeReq('http://localhost/api/admin/posts/x'), paramsFor('x'));
    expect(apiError).toHaveBeenCalledWith('NOT_FOUND', expect.any(String), 404);
  });

  it('returns the post', async () => {
    mockAuth();
    (prisma.post.findUnique as jest.Mock).mockResolvedValue(POST_RECORD);
    const res = await getPost(
      makeReq('http://localhost/api/admin/posts/post-1'),
      paramsFor('post-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('post-1');
  });
});

// ── PUT /api/admin/posts/[id] ─────────────────────────────────────────────────

describe('PUT /api/admin/posts/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await updatePost(
      makeReq('http://localhost/api/admin/posts/post-1', { title: 'New' }, 'PUT'),
      paramsFor('post-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is invalid JSON', async () => {
    mockAuth();
    const req = new Request('http://localhost/api/admin/posts/post-1', {
      method: 'PUT',
      body: 'bad',
    });
    await updatePost(req, paramsFor('post-1'));
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
  });

  it('returns 404 when post not found', async () => {
    mockAuth();
    (prisma.post.findUnique as jest.Mock).mockResolvedValue(null);
    await updatePost(
      makeReq('http://localhost/api/admin/posts/x', { title: 'T' }, 'PUT'),
      paramsFor('x'),
    );
    expect(apiError).toHaveBeenCalledWith('NOT_FOUND', expect.any(String), 404);
  });

  it('updates and returns post', async () => {
    mockAuth();
    (prisma.post.findUnique as jest.Mock).mockResolvedValue(POST_RECORD);
    (prisma.post.update as jest.Mock).mockResolvedValue({
      ...POST_RECORD,
      title: 'Updated',
      content: 'New content',
    });
    const res = await updatePost(
      makeReq(
        'http://localhost/api/admin/posts/post-1',
        { title: 'Updated', content: 'New content' },
        'PUT',
      ),
      paramsFor('post-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Updated');
    expect(body.data.content).toBe('New content');
  });
});

// ── DELETE /api/admin/posts/[id] ──────────────────────────────────────────────

describe('DELETE /api/admin/posts/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await deletePost(
      makeReq('http://localhost/api/admin/posts/post-1', undefined, 'DELETE'),
      paramsFor('post-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when post not found', async () => {
    mockAuth();
    (prisma.post.findUnique as jest.Mock).mockResolvedValue(null);
    await deletePost(
      makeReq('http://localhost/api/admin/posts/x', undefined, 'DELETE'),
      paramsFor('x'),
    );
    expect(apiError).toHaveBeenCalledWith('NOT_FOUND', expect.any(String), 404);
  });

  it('deletes post and returns success', async () => {
    mockAuth();
    (prisma.post.findUnique as jest.Mock).mockResolvedValue(POST_RECORD);
    (prisma.post.delete as jest.Mock).mockResolvedValue(POST_RECORD);
    const res = await deletePost(
      makeReq('http://localhost/api/admin/posts/post-1', undefined, 'DELETE'),
      paramsFor('post-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
