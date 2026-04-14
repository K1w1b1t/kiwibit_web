import { GET as listPosts } from './route';
import { GET as getPost } from './[id]/route';
import { apiError } from '@/shared/lib/api-helpers';
import { prisma } from '@/shared/lib/prisma';
import { makeReq, paramsFor, assertPaginatedResponse } from '@/shared/test-utils/spec-helpers';

// ── helpers ───────────────────────────────────────────────────────────────────

const POST_RECORD = {
  id: 'post-1',
  title: 'Hello World',
  authorId: 'uid-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── GET /api/posts ────────────────────────────────────────────────────────────

describe('GET /api/posts', () => {
  it('returns paginated list', async () => {
    (prisma.post.findMany as jest.Mock).mockResolvedValue([POST_RECORD]);
    (prisma.post.count as jest.Mock).mockResolvedValue(1);
    await assertPaginatedResponse(await listPosts(makeReq('http://localhost/api/posts')), {
      items: 1,
      total: 1,
      page: 1,
    });
  });

  it('respects page and limit query params', async () => {
    (prisma.post.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.post.count as jest.Mock).mockResolvedValue(0);
    await listPosts(makeReq('http://localhost/api/posts?page=2&limit=10'));
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });

  it('filters by title when search param is provided', async () => {
    (prisma.post.findMany as jest.Mock).mockResolvedValue([POST_RECORD]);
    (prisma.post.count as jest.Mock).mockResolvedValue(1);
    await listPosts(makeReq('http://localhost/api/posts?search=hello'));
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ title: expect.any(Object) }) }),
    );
  });

  it('filters by authorId when param is provided', async () => {
    (prisma.post.findMany as jest.Mock).mockResolvedValue([POST_RECORD]);
    (prisma.post.count as jest.Mock).mockResolvedValue(1);
    await listPosts(makeReq('http://localhost/api/posts?authorId=uid-1'));
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ authorId: 'uid-1' }) }),
    );
  });

  it('returns empty list when no posts exist', async () => {
    (prisma.post.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.post.count as jest.Mock).mockResolvedValue(0);
    await assertPaginatedResponse(await listPosts(makeReq('http://localhost/api/posts')), {
      items: 0,
      total: 0,
    });
  });
});

// ── GET /api/posts/[id] ───────────────────────────────────────────────────────

describe('GET /api/posts/[id]', () => {
  it('returns 404 when post not found', async () => {
    (prisma.post.findUnique as jest.Mock).mockResolvedValue(null);
    await getPost(makeReq('http://localhost/api/posts/x'), paramsFor('x'));
    expect(apiError).toHaveBeenCalledWith('NOT_FOUND', expect.any(String), 404);
  });

  it('returns the post', async () => {
    (prisma.post.findUnique as jest.Mock).mockResolvedValue(POST_RECORD);
    const res = await getPost(makeReq('http://localhost/api/posts/post-1'), paramsFor('post-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('post-1');
    expect(body.title).toBe('Hello World');
  });
});
