import { GET as listMembers } from './route';
import { GET as getMember } from './[id]/route';
import { apiError } from '@/shared/lib/api-helpers';
import { prisma } from '@/shared/lib/prisma';
import { makeReq, paramsFor, assertPaginatedResponse } from '@/shared/test-utils/spec-helpers';

// ── helpers ───────────────────────────────────────────────────────────────────

const MEMBER = {
  id: 'mem-1',
  name: 'Alice',
  bio: null,
  avatarUrl: null,
  userId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── GET /api/members ──────────────────────────────────────────────────────────

describe('GET /api/members', () => {
  it('returns paginated list', async () => {
    (prisma.member.findMany as jest.Mock).mockResolvedValue([MEMBER]);
    (prisma.member.count as jest.Mock).mockResolvedValue(1);
    await assertPaginatedResponse(await listMembers(makeReq('http://localhost/api/members')), {
      items: 1,
      total: 1,
      page: 1,
    });
  });

  it('respects page and limit query params', async () => {
    (prisma.member.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.member.count as jest.Mock).mockResolvedValue(0);
    await listMembers(makeReq('http://localhost/api/members?page=3&limit=10'));
    expect(prisma.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });

  it('filters by name when search param is provided', async () => {
    (prisma.member.findMany as jest.Mock).mockResolvedValue([MEMBER]);
    (prisma.member.count as jest.Mock).mockResolvedValue(1);
    await listMembers(makeReq('http://localhost/api/members?search=alice'));
    expect(prisma.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ name: expect.any(Object) }) }),
    );
  });

  it('returns empty list when no members exist', async () => {
    (prisma.member.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.member.count as jest.Mock).mockResolvedValue(0);
    await assertPaginatedResponse(await listMembers(makeReq('http://localhost/api/members')), {
      items: 0,
      total: 0,
    });
  });
});

// ── GET /api/members/[id] ─────────────────────────────────────────────────────

describe('GET /api/members/[id]', () => {
  it('returns 404 when member not found', async () => {
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(null);
    await getMember(makeReq('http://localhost/api/members/x'), paramsFor('x'));
    expect(apiError).toHaveBeenCalledWith('NOT_FOUND', expect.any(String), 404);
  });

  it('returns the member', async () => {
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(MEMBER);
    const res = await getMember(makeReq('http://localhost/api/members/mem-1'), paramsFor('mem-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('mem-1');
    expect(body.name).toBe('Alice');
  });
});
