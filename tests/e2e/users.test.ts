import {
  useAdminClient,
  anonClient,
  expectPaginatedList,
  expectDeleteOk,
  UNKNOWN_ID,
} from './helpers/crud';

const TAG = `e2e-users-${Date.now()}`;

describe('Users CRUD — /api/admin/users', () => {
  const ref = useAdminClient();
  let createdId: string;

  // ── LIST ──────────────────────────────────────────────────────────────────
  it('GET /api/admin/users returns a paginated list', async () => {
    await expectPaginatedList(await ref.client.get('/api/admin/users'));
  });

  // ── CREATE ────────────────────────────────────────────────────────────────
  it('POST /api/admin/users creates a new user', async () => {
    const res = await ref.client.post('/api/admin/users', {
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
    const res = await ref.client.post('/api/admin/users', {
      name: 'Duplicate',
      email: `${TAG}@kiwibit.test`,
      password: 'Password#123!',
    });
    expect(res.status).toBe(409);
  });

  it('POST /api/admin/users rejects missing required fields', async () => {
    expect((await ref.client.post('/api/admin/users', { name: 'No email' })).status).toBe(400);
  });

  // ── READ ──────────────────────────────────────────────────────────────────
  it('GET /api/admin/users/[id] returns the created user', async () => {
    const res = await ref.client.get(`/api/admin/users/${createdId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(createdId);
    expect(body.email).toBe(`${TAG}@kiwibit.test`);
  });

  it('GET /api/admin/users/[id] returns 404 for unknown id', async () => {
    expect((await ref.client.get(`/api/admin/users/${UNKNOWN_ID}`)).status).toBe(404);
  });

  // ── UPDATE ────────────────────────────────────────────────────────────────
  it('PUT /api/admin/users/[id] updates the user name', async () => {
    const res = await ref.client.put(`/api/admin/users/${createdId}`, { name: `Updated ${TAG}` });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe(`Updated ${TAG}`);
  });

  it('GET /api/admin/users/[id] reflects the updated name', async () => {
    const body = await (await ref.client.get(`/api/admin/users/${createdId}`)).json();
    expect(body.name).toBe(`Updated ${TAG}`);
  });

  // ── DELETE ────────────────────────────────────────────────────────────────
  it('DELETE /api/admin/users/[id] removes the user', () =>
    expectDeleteOk(ref.client.delete(`/api/admin/users/${createdId}`)));

  it('GET /api/admin/users/[id] returns 404 after deletion', async () => {
    expect((await ref.client.get(`/api/admin/users/${createdId}`)).status).toBe(404);
  });

  it('GET /api/admin/users does not include the deleted user', async () => {
    const body = await (await ref.client.get(`/api/admin/users?search=${TAG}`)).json();
    expect(body.items).toHaveLength(0);
  });

  // ── UNAUTHENTICATED ───────────────────────────────────────────────────────
  it('unauthenticated client gets 401', async () => {
    expect((await anonClient().get('/api/admin/users')).status).toBe(401);
  });
});
