import {
  useAdminClient,
  anonClient,
  expectPaginatedList,
  expectPublicItem,
  expectDeleteOk,
  expectCreated,
  expectAdminItem,
  UNKNOWN_ID,
} from './helpers/crud';

const TAG = `e2e-members-${Date.now()}`;

describe('Members CRUD — /api/admin/members', () => {
  const ref = useAdminClient();
  let createdId: string;

  // ── LIST ──────────────────────────────────────────────────────────────────
  it('GET /api/admin/members returns a paginated list', async () => {
    await expectPaginatedList(await ref.client.get('/api/admin/members'));
  });

  // ── CREATE ────────────────────────────────────────────────────────────────
  it('POST /api/admin/members creates a member', async () => {
    createdId = await expectCreated(
      ref.client.post('/api/admin/members', { name: `E2E Member ${TAG}`, bio: 'E2E test bio' }),
      (data) => expect(data.name).toBe(`E2E Member ${TAG}`),
    );
  });

  it('POST /api/admin/members rejects missing name', async () => {
    const res = await ref.client.post('/api/admin/members', { bio: 'No name' });
    expect(res.status).toBe(400);
  });

  // ── READ ──────────────────────────────────────────────────────────────────
  it('GET /api/admin/members/[id] returns the created member', () =>
    expectAdminItem(ref.client.get(`/api/admin/members/${createdId}`), createdId, (body) =>
      expect(body.bio).toBe('E2E test bio'),
    ));

  it('GET /api/admin/members/[id] returns 404 for unknown id', async () => {
    expect((await ref.client.get(`/api/admin/members/${UNKNOWN_ID}`)).status).toBe(404);
  });

  it('GET /api/members/[id] returns the member publicly', () =>
    expectPublicItem(anonClient().get(`/api/members/${createdId}`), createdId));

  // ── UPDATE ────────────────────────────────────────────────────────────────
  it('PUT /api/admin/members/[id] updates bio', async () => {
    const res = await ref.client.put(`/api/admin/members/${createdId}`, { bio: 'Updated E2E bio' });
    expect(res.status).toBe(200);
    expect((await res.json()).data.bio).toBe('Updated E2E bio');
  });

  it('GET /api/admin/members/[id] reflects the updated bio', async () => {
    const body = await (await ref.client.get(`/api/admin/members/${createdId}`)).json();
    expect(body.bio).toBe('Updated E2E bio');
  });

  // ── DELETE ────────────────────────────────────────────────────────────────
  it('DELETE /api/admin/members/[id] removes the member', () =>
    expectDeleteOk(ref.client.delete(`/api/admin/members/${createdId}`)));

  it('GET /api/admin/members/[id] returns 404 after deletion', async () => {
    expect((await ref.client.get(`/api/admin/members/${createdId}`)).status).toBe(404);
  });

  it('GET /api/members does not include the deleted member', async () => {
    const body = await (await anonClient().get(`/api/members?search=${TAG}`)).json();
    expect(body.items).toHaveLength(0);
  });
});
