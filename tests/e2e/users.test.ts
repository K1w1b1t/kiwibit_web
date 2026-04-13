import { ApiClient } from './helpers/client';
import { signInAsAdmin, makeAdminClient } from './helpers/auth';
import { BASE_URL } from './helpers/constants';

const TAG = `e2e-users-${Date.now()}`;

describe('Users CRUD — /api/admin/users', () => {
  let client: ApiClient;
  let createdId: string;

  beforeAll(async () => {
    client = makeAdminClient();
    await signInAsAdmin(client);
  });

  // ── LIST ──────────────────────────────────────────────────────────────────
  it('GET /api/admin/users returns a paginated list', async () => {
    const res = await client.get('/api/admin/users');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  // ── CREATE ────────────────────────────────────────────────────────────────
  it('POST /api/admin/users creates a new user', async () => {
    const res = await client.post('/api/admin/users', {
      name: `Test User ${TAG}`,
      email: `${TAG}@kiwibit.test`,
      password: 'Password#123!',
      role: 'member',
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe(`${TAG}@kiwibit.test`);
    createdId = body.data.id;
  });

  it('POST /api/admin/users rejects duplicate email', async () => {
    const res = await client.post('/api/admin/users', {
      name: 'Duplicate',
      email: `${TAG}@kiwibit.test`,
      password: 'Password#123!',
    });
    expect(res.status).toBe(409);
  });

  it('POST /api/admin/users rejects missing required fields', async () => {
    const res = await client.post('/api/admin/users', { name: 'No email' });
    expect(res.status).toBe(400);
  });

  // ── READ ──────────────────────────────────────────────────────────────────
  it('GET /api/admin/users/[id] returns the created user', async () => {
    const res = await client.get(`/api/admin/users/${createdId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(createdId);
    expect(body.email).toBe(`${TAG}@kiwibit.test`);
  });

  it('GET /api/admin/users/[id] returns 404 for unknown id', async () => {
    const res = await client.get('/api/admin/users/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  // ── UPDATE ────────────────────────────────────────────────────────────────
  it('PUT /api/admin/users/[id] updates the user name', async () => {
    const res = await client.put(`/api/admin/users/${createdId}`, { name: `Updated ${TAG}` });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe(`Updated ${TAG}`);
  });

  it('GET /api/admin/users/[id] reflects the updated name', async () => {
    const res = await client.get(`/api/admin/users/${createdId}`);
    const body = await res.json();
    expect(body.name).toBe(`Updated ${TAG}`);
  });

  // ── DELETE ────────────────────────────────────────────────────────────────
  it('DELETE /api/admin/users/[id] removes the user', async () => {
    const res = await client.delete(`/api/admin/users/${createdId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('GET /api/admin/users/[id] returns 404 after deletion', async () => {
    const res = await client.get(`/api/admin/users/${createdId}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/admin/users does not include the deleted user', async () => {
    const res = await client.get(`/api/admin/users?search=${TAG}`);
    const body = await res.json();
    expect(body.items).toHaveLength(0);
  });

  // ── UNAUTHENTICATED ───────────────────────────────────────────────────────
  it('unauthenticated client gets 401', async () => {
    const anon = new ApiClient(BASE_URL);
    const res = await anon.get('/api/admin/users');
    expect(res.status).toBe(401);
  });
});
