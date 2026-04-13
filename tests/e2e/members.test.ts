import { ApiClient } from './helpers/client';
import { signInAsAdmin, makeAdminClient } from './helpers/auth';
import { BASE_URL } from './helpers/constants';

const TAG = `e2e-members-${Date.now()}`;

describe('Members CRUD — /api/admin/members', () => {
  let client: ApiClient;
  let createdId: string;

  beforeAll(async () => {
    client = makeAdminClient();
    await signInAsAdmin(client);
  });

  // ── LIST ──────────────────────────────────────────────────────────────────
  it('GET /api/admin/members returns a paginated list', async () => {
    const res = await client.get('/api/admin/members');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  // ── CREATE ────────────────────────────────────────────────────────────────
  it('POST /api/admin/members creates a member', async () => {
    const res = await client.post('/api/admin/members', {
      name: `E2E Member ${TAG}`,
      bio: 'E2E test bio',
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe(`E2E Member ${TAG}`);
    createdId = body.data.id;
  });

  it('POST /api/admin/members rejects missing name', async () => {
    const res = await client.post('/api/admin/members', { bio: 'No name' });
    expect(res.status).toBe(400);
  });

  // ── READ ──────────────────────────────────────────────────────────────────
  it('GET /api/admin/members/[id] returns the created member', async () => {
    const res = await client.get(`/api/admin/members/${createdId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(createdId);
    expect(body.bio).toBe('E2E test bio');
  });

  it('GET /api/admin/members/[id] returns 404 for unknown id', async () => {
    const res = await client.get('/api/admin/members/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  // Public endpoint also works
  it('GET /api/members/[id] returns the member publicly', async () => {
    const anon = new ApiClient(BASE_URL);
    const res = await anon.get(`/api/members/${createdId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(createdId);
  });

  // ── UPDATE ────────────────────────────────────────────────────────────────
  it('PUT /api/admin/members/[id] updates bio', async () => {
    const res = await client.put(`/api/admin/members/${createdId}`, {
      bio: 'Updated E2E bio',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.bio).toBe('Updated E2E bio');
  });

  it('GET /api/admin/members/[id] reflects the updated bio', async () => {
    const res = await client.get(`/api/admin/members/${createdId}`);
    const body = await res.json();
    expect(body.bio).toBe('Updated E2E bio');
  });

  // ── DELETE ────────────────────────────────────────────────────────────────
  it('DELETE /api/admin/members/[id] removes the member', async () => {
    const res = await client.delete(`/api/admin/members/${createdId}`);
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it('GET /api/admin/members/[id] returns 404 after deletion', async () => {
    const res = await client.get(`/api/admin/members/${createdId}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/members does not include the deleted member', async () => {
    const anon = new ApiClient(BASE_URL);
    const res = await anon.get(`/api/members?search=${TAG}`);
    const body = await res.json();
    expect(body.items).toHaveLength(0);
  });
});
