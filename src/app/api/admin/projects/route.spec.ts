import { GET as listProjects, POST as createProject } from './route';
import { GET as getProject, PUT as updateProject, DELETE as deleteProject } from './[id]/route';
import { apiError } from '@/shared/lib/api-helpers';
import { prisma } from '@/shared/lib/prisma';
import { makeReq, paramsFor, mockAuth } from '@/shared/test-utils/spec-helpers';

// ── helpers ───────────────────────────────────────────────────────────────────

const PROJECT = {
  id: 'pid-1',
  title: 'Kiwibit',
  description: 'Main project',
  repoUrl: 'https://github.com/x',
  liveUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── GET /api/admin/projects ───────────────────────────────────────────────────

describe('GET /api/admin/projects', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await listProjects(makeReq('http://localhost/api/admin/projects'));
    expect(res.status).toBe(401);
  });

  it('returns paginated list', async () => {
    mockAuth();
    (prisma.project.findMany as jest.Mock).mockResolvedValue([PROJECT]);
    (prisma.project.count as jest.Mock).mockResolvedValue(1);
    const res = await listProjects(makeReq('http://localhost/api/admin/projects'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('passes search filter to prisma', async () => {
    mockAuth();
    (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.project.count as jest.Mock).mockResolvedValue(0);
    await listProjects(makeReq('http://localhost/api/admin/projects?search=kiwibit'));
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
    );
  });

  it('respects page and limit params', async () => {
    mockAuth();
    (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.project.count as jest.Mock).mockResolvedValue(0);
    const res = await listProjects(makeReq('http://localhost/api/admin/projects?page=2&limit=5'));
    const body = await res.json();
    expect(body.page).toBe(2);
    expect(body.limit).toBe(5);
  });
});

// ── POST /api/admin/projects ──────────────────────────────────────────────────

describe('POST /api/admin/projects', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await createProject(
      makeReq('http://localhost/api/admin/projects', { title: 'X', description: 'Y' }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is invalid JSON', async () => {
    mockAuth();
    const req = new Request('http://localhost/api/admin/projects', { method: 'POST', body: 'bad' });
    const res = await createProject(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when title is missing', async () => {
    mockAuth();
    await createProject(
      makeReq('http://localhost/api/admin/projects', { description: 'no title' }),
    );
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
  });

  it('returns 400 when description is missing', async () => {
    mockAuth();
    await createProject(makeReq('http://localhost/api/admin/projects', { title: 'X' }));
    expect(apiError).toHaveBeenCalledWith('BAD_REQUEST', expect.any(String), 400);
  });

  it('creates project and returns 201', async () => {
    mockAuth();
    (prisma.project.create as jest.Mock).mockResolvedValue(PROJECT);
    const res = await createProject(
      makeReq('http://localhost/api/admin/projects', {
        title: 'Kiwibit',
        description: 'Main project',
        repoUrl: 'https://github.com/x',
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Kiwibit');
  });
});

// ── GET /api/admin/projects/[id] ──────────────────────────────────────────────

describe('GET /api/admin/projects/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await getProject(
      makeReq('http://localhost/api/admin/projects/pid-1'),
      paramsFor('pid-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when not found', async () => {
    mockAuth();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
    await getProject(makeReq('http://localhost/api/admin/projects/x'), paramsFor('x'));
    expect(apiError).toHaveBeenCalledWith('NOT_FOUND', expect.any(String), 404);
  });

  it('returns the project', async () => {
    mockAuth();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(PROJECT);
    const res = await getProject(
      makeReq('http://localhost/api/admin/projects/pid-1'),
      paramsFor('pid-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('pid-1');
  });
});

// ── PUT /api/admin/projects/[id] ──────────────────────────────────────────────

describe('PUT /api/admin/projects/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await updateProject(
      makeReq('http://localhost/api/admin/projects/pid-1', { title: 'New' }, 'PUT'),
      paramsFor('pid-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is invalid JSON', async () => {
    mockAuth();
    const req = new Request('http://localhost/api/admin/projects/pid-1', {
      method: 'PUT',
      body: 'bad',
    });
    const res = await updateProject(req, paramsFor('pid-1'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when project not found', async () => {
    mockAuth();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
    await updateProject(
      makeReq('http://localhost/api/admin/projects/x', { title: 'T' }, 'PUT'),
      paramsFor('x'),
    );
    expect(apiError).toHaveBeenCalledWith('NOT_FOUND', expect.any(String), 404);
  });

  it('updates and returns project', async () => {
    mockAuth();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(PROJECT);
    (prisma.project.update as jest.Mock).mockResolvedValue({
      ...PROJECT,
      title: 'Updated',
      liveUrl: 'https://live.com',
    });
    const res = await updateProject(
      makeReq(
        'http://localhost/api/admin/projects/pid-1',
        { title: 'Updated', liveUrl: 'https://live.com' },
        'PUT',
      ),
      paramsFor('pid-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.title).toBe('Updated');
    expect(body.data.liveUrl).toBe('https://live.com');
  });

  it('sets liveUrl to null when passed as null', async () => {
    mockAuth();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(PROJECT);
    (prisma.project.update as jest.Mock).mockResolvedValue({ ...PROJECT, liveUrl: null });
    await updateProject(
      makeReq('http://localhost/api/admin/projects/pid-1', { liveUrl: null }, 'PUT'),
      paramsFor('pid-1'),
    );
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ liveUrl: null }) }),
    );
  });
});

// ── DELETE /api/admin/projects/[id] ───────────────────────────────────────────

describe('DELETE /api/admin/projects/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await deleteProject(
      makeReq('http://localhost/api/admin/projects/pid-1', undefined, 'DELETE'),
      paramsFor('pid-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when project not found', async () => {
    mockAuth();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
    await deleteProject(
      makeReq('http://localhost/api/admin/projects/x', undefined, 'DELETE'),
      paramsFor('x'),
    );
    expect(apiError).toHaveBeenCalledWith('NOT_FOUND', expect.any(String), 404);
  });

  it('deletes project and returns success', async () => {
    mockAuth();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(PROJECT);
    (prisma.project.delete as jest.Mock).mockResolvedValue(PROJECT);
    const res = await deleteProject(
      makeReq('http://localhost/api/admin/projects/pid-1', undefined, 'DELETE'),
      paramsFor('pid-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
