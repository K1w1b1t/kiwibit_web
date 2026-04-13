import { ApiClient } from './helpers/client';
import { signInAsAdmin, makeAdminClient } from './helpers/auth';
import { BASE_URL } from './helpers/constants';

const TAG = `e2e-proj-${Date.now()}`;

describe('Projects CRUD — /api/admin/projects', () => {
  let client: ApiClient;
  let createdId: string;

  beforeAll(async () => {
    client = makeAdminClient();
    await signInAsAdmin(client);
  });

  // ── LIST ──────────────────────────────────────────────────────────────────
  it('GET /api/admin/projects returns a paginated list', async () => {
    const res = await client.get('/api/admin/projects');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  // ── CREATE ────────────────────────────────────────────────────────────────
  it('POST /api/admin/projects creates a project', async () => {
    const res = await client.post('/api/admin/projects', {
      title: `E2E Project ${TAG}`,
      description: 'E2E test project description',
      repoUrl: 'https://github.com/example/e2e-project',
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe(`E2E Project ${TAG}`);
    createdId = body.data.id;
  });

  it('POST /api/admin/projects rejects missing title', async () => {
    const res = await client.post('/api/admin/projects', { description: 'no title' });
    expect(res.status).toBe(400);
  });

  it('POST /api/admin/projects rejects missing description', async () => {
    const res = await client.post('/api/admin/projects', { title: 'no desc' });
    expect(res.status).toBe(400);
  });

  // ── READ ──────────────────────────────────────────────────────────────────
  it('GET /api/admin/projects/[id] returns the created project', async () => {
    const res = await client.get(`/api/admin/projects/${createdId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(createdId);
    expect(body.description).toBe('E2E test project description');
  });

  it('GET /api/admin/projects/[id] returns 404 for unknown id', async () => {
    const res = await client.get('/api/admin/projects/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  // Public endpoint
  it('GET /api/projects/[id] returns the project publicly', async () => {
    const anon = new ApiClient(BASE_URL);
    const res = await anon.get(`/api/projects/${createdId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(createdId);
  });

  // ── UPDATE ────────────────────────────────────────────────────────────────
  it('PUT /api/admin/projects/[id] updates the project', async () => {
    const res = await client.put(`/api/admin/projects/${createdId}`, {
      description: 'Updated E2E description',
      liveUrl: 'https://example.com/live',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.description).toBe('Updated E2E description');
    expect(body.data.liveUrl).toBe('https://example.com/live');
  });

  it('GET /api/projects/[id] reflects the updated project', async () => {
    const anon = new ApiClient(BASE_URL);
    const res = await anon.get(`/api/projects/${createdId}`);
    const body = await res.json();
    expect(body.description).toBe('Updated E2E description');
  });

  // ── DELETE ────────────────────────────────────────────────────────────────
  it('DELETE /api/admin/projects/[id] removes the project', async () => {
    const res = await client.delete(`/api/admin/projects/${createdId}`);
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it('GET /api/admin/projects/[id] returns 404 after deletion', async () => {
    const res = await client.get(`/api/admin/projects/${createdId}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/projects does not include the deleted project', async () => {
    const anon = new ApiClient(BASE_URL);
    const res = await anon.get(`/api/projects?search=${TAG}`);
    const body = await res.json();
    expect(body.items).toHaveLength(0);
  });
});
