import { GET as listProjects } from './route';
import { GET as getProject } from './[id]/route';
import { apiError } from '@/shared/lib/api-helpers';
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
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('@/shared/lib/api-helpers', () => ({
  apiError: jest.fn().mockImplementation((code: string, message: string, status: number) => ({
    status,
    json: () => Promise.resolve({ error: { code, message } }),
  })),
}));

// ── helpers ───────────────────────────────────────────────────────────────────

function makeReq(url: string) {
  return new Request(url);
}

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

const PROJECT = {
  id: 'proj-1',
  title: 'KiwiBit',
  description: 'A cool project',
  repoUrl: null,
  liveUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── GET /api/projects ─────────────────────────────────────────────────────────

describe('GET /api/projects', () => {
  it('returns paginated list', async () => {
    (prisma.project.findMany as jest.Mock).mockResolvedValue([PROJECT]);
    (prisma.project.count as jest.Mock).mockResolvedValue(1);
    const res = await listProjects(makeReq('http://localhost/api/projects'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
  });

  it('respects page and limit query params', async () => {
    (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.project.count as jest.Mock).mockResolvedValue(0);
    await listProjects(makeReq('http://localhost/api/projects?page=2&limit=5'));
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    );
  });

  it('filters by search term on title and description', async () => {
    (prisma.project.findMany as jest.Mock).mockResolvedValue([PROJECT]);
    (prisma.project.count as jest.Mock).mockResolvedValue(1);
    await listProjects(makeReq('http://localhost/api/projects?search=kiwi'));
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
    );
  });

  it('returns empty list when no projects exist', async () => {
    (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.project.count as jest.Mock).mockResolvedValue(0);
    const res = await listProjects(makeReq('http://localhost/api/projects'));
    const body = await res.json();
    expect(body.items).toHaveLength(0);
    expect(body.total).toBe(0);
  });
});

// ── GET /api/projects/[id] ────────────────────────────────────────────────────

describe('GET /api/projects/[id]', () => {
  it('returns 404 when project not found', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
    await getProject(makeReq('http://localhost/api/projects/x'), paramsFor('x'));
    expect(apiError).toHaveBeenCalledWith('NOT_FOUND', expect.any(String), 404);
  });

  it('returns the project', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(PROJECT);
    const res = await getProject(
      makeReq('http://localhost/api/projects/proj-1'),
      paramsFor('proj-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('proj-1');
    expect(body.title).toBe('KiwiBit');
  });
});
