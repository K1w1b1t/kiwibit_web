import { ApiClient } from './helpers/client';
import { signInAsAdmin, makeAdminClient } from './helpers/auth';
import { BASE_URL } from './helpers/constants';

const TAG = `e2e-posts-${Date.now()}`;

describe('Posts CRUD — /api/admin/posts', () => {
  let client: ApiClient;
  let createdId: string;

  beforeAll(async () => {
    client = makeAdminClient();
    await signInAsAdmin(client);
  });

  // ── LIST ──────────────────────────────────────────────────────────────────
  it('GET /api/admin/posts returns a paginated list', async () => {
    const res = await client.get('/api/admin/posts');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  // ── CREATE ────────────────────────────────────────────────────────────────
  it('POST /api/admin/posts creates a post', async () => {
    const res = await client.post('/api/admin/posts', {
      title: `E2E Post ${TAG}`,
      content: 'E2E test content body',
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe(`E2E Post ${TAG}`);
    createdId = body.data.id;
  });

  it('POST /api/admin/posts rejects missing title', async () => {
    const res = await client.post('/api/admin/posts', { content: 'no title' });
    expect(res.status).toBe(400);
  });

  it('POST /api/admin/posts rejects missing content', async () => {
    const res = await client.post('/api/admin/posts', { title: 'no content' });
    expect(res.status).toBe(400);
  });

  // ── READ ──────────────────────────────────────────────────────────────────
  it('GET /api/admin/posts/[id] returns the created post', async () => {
    const res = await client.get(`/api/admin/posts/${createdId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(createdId);
    expect(body.content).toBe('E2E test content body');
  });

  it('GET /api/admin/posts/[id] returns 404 for unknown id', async () => {
    const res = await client.get('/api/admin/posts/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  // Public endpoint
  it('GET /api/posts/[id] returns the post publicly', async () => {
    const anon = new ApiClient(BASE_URL);
    const res = await anon.get(`/api/posts/${createdId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(createdId);
  });

  // ── UPDATE ────────────────────────────────────────────────────────────────
  it('PUT /api/admin/posts/[id] updates the post', async () => {
    const res = await client.put(`/api/admin/posts/${createdId}`, {
      title: `Updated Post ${TAG}`,
      content: 'Updated E2E content',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.title).toBe(`Updated Post ${TAG}`);
    expect(body.data.content).toBe('Updated E2E content');
  });

  it('GET /api/posts/[id] reflects the updated post', async () => {
    const anon = new ApiClient(BASE_URL);
    const res = await anon.get(`/api/posts/${createdId}`);
    const body = await res.json();
    expect(body.title).toBe(`Updated Post ${TAG}`);
    expect(body.content).toBe('Updated E2E content');
  });

  // ── DELETE ────────────────────────────────────────────────────────────────
  it('DELETE /api/admin/posts/[id] removes the post', async () => {
    const res = await client.delete(`/api/admin/posts/${createdId}`);
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it('GET /api/admin/posts/[id] returns 404 after deletion', async () => {
    const res = await client.get(`/api/admin/posts/${createdId}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/posts does not include the deleted post', async () => {
    const anon = new ApiClient(BASE_URL);
    const res = await anon.get(`/api/posts?search=${TAG}`);
    const body = await res.json();
    expect(body.items).toHaveLength(0);
  });
});
