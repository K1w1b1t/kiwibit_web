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

const TAG = `e2e-posts-${Date.now()}`;

describe('Posts CRUD — /api/admin/posts', () => {
  const ref = useAdminClient();
  let createdId: string;

  // ── LIST ──────────────────────────────────────────────────────────────────
  it('GET /api/admin/posts returns a paginated list', async () => {
    await expectPaginatedList(await ref.client.get('/api/admin/posts'));
  });

  // ── CREATE ────────────────────────────────────────────────────────────────
  it('POST /api/admin/posts creates a post as a draft', async () => {
    createdId = await expectCreated(
      ref.client.post('/api/admin/posts', {
        title: `E2E Post ${TAG}`,
        content: 'E2E test content body',
      }),
      (data) => {
        expect(data.title).toBe(`E2E Post ${TAG}`);
        // Saving must not publish — that is the whole point of the draft state.
        expect(data.status).toBe('draft');
        expect(data.publishedAt).toBeNull();
      },
    );
  });

  it('POST /api/admin/posts rejects missing title', async () => {
    expect((await ref.client.post('/api/admin/posts', { content: 'no title' })).status).toBe(400);
  });

  it('POST /api/admin/posts rejects missing content', async () => {
    expect((await ref.client.post('/api/admin/posts', { title: 'no content' })).status).toBe(400);
  });

  it('POST /api/admin/posts rejects an unknown status', async () => {
    const res = await ref.client.post('/api/admin/posts', {
      title: 'bad status',
      content: 'body',
      status: 'archived',
    });
    expect(res.status).toBe(400);
  });

  // ── READ ──────────────────────────────────────────────────────────────────
  it('GET /api/admin/posts/[id] returns the created post', () =>
    expectAdminItem(ref.client.get(`/api/admin/posts/${createdId}`), createdId, (body) =>
      expect(body.content).toBe('E2E test content body'),
    ));

  it('GET /api/admin/posts/[id] returns 404 for unknown id', async () => {
    expect((await ref.client.get(`/api/admin/posts/${UNKNOWN_ID}`)).status).toBe(404);
  });

  // ── DRAFT VISIBILITY ──────────────────────────────────────────────────────
  it('GET /api/posts/[id] hides a draft from the public', async () => {
    expect((await anonClient().get(`/api/posts/${createdId}`)).status).toBe(404);
  });

  it('GET /api/posts does not list a draft', async () => {
    const body = await (await anonClient().get(`/api/posts?search=${TAG}`)).json();
    expect(body.items).toHaveLength(0);
  });

  // ── PUBLISH ───────────────────────────────────────────────────────────────
  it('PUT /api/admin/posts/[id] publishes and stamps publishedAt', async () => {
    const res = await ref.client.put(`/api/admin/posts/${createdId}`, { status: 'published' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('published');
    expect(body.data.publishedAt).not.toBeNull();
  });

  it('GET /api/posts/[id] returns the post publicly once published', () =>
    expectPublicItem(anonClient().get(`/api/posts/${createdId}`), createdId));

  it('GET /api/posts lists it once published', async () => {
    const body = await (await anonClient().get(`/api/posts?search=${TAG}`)).json();
    expect(body.items).toHaveLength(1);
  });

  // ── UPDATE ────────────────────────────────────────────────────────────────
  it('PUT /api/admin/posts/[id] updates the post', async () => {
    const res = await ref.client.put(`/api/admin/posts/${createdId}`, {
      title: `Updated Post ${TAG}`,
      content: 'Updated E2E content',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.title).toBe(`Updated Post ${TAG}`);
    expect(body.data.content).toBe('Updated E2E content');
  });

  it('GET /api/posts/[id] reflects the updated post', async () => {
    const body = await (await anonClient().get(`/api/posts/${createdId}`)).json();
    expect(body.title).toBe(`Updated Post ${TAG}`);
    expect(body.content).toBe('Updated E2E content');
  });

  // ── UNPUBLISH ─────────────────────────────────────────────────────────────
  it('PUT /api/admin/posts/[id] unpublishes but keeps publishedAt', async () => {
    const res = await ref.client.put(`/api/admin/posts/${createdId}`, { status: 'draft' });
    const body = await res.json();
    expect(body.data.status).toBe('draft');
    expect(body.data.publishedAt).not.toBeNull();
    expect((await anonClient().get(`/api/posts/${createdId}`)).status).toBe(404);
  });

  // ── DELETE ────────────────────────────────────────────────────────────────
  it('DELETE /api/admin/posts/[id] removes the post', () =>
    expectDeleteOk(ref.client.delete(`/api/admin/posts/${createdId}`)));

  it('GET /api/admin/posts/[id] returns 404 after deletion', async () => {
    expect((await ref.client.get(`/api/admin/posts/${createdId}`)).status).toBe(404);
  });

  it('GET /api/posts does not include the deleted post', async () => {
    const body = await (await anonClient().get(`/api/posts?search=${TAG}`)).json();
    expect(body.items).toHaveLength(0);
  });
});
