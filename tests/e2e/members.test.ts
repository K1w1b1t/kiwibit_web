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

describe('member account deletion', () => {
  const ref = useAdminClient();

  it('removes the linked account, preserves posts, and invalidates its session', async () => {
    const email = `${TAG}-author@kiwibit.test`;
    const password = 'Password#123!';
    const response = await ref.client.post('/api/admin/members', {
      name: 'Author',
      account: { email, password, role: 'editor' },
    });
    expect(response.status).toBe(201);
    const { data: member } = await response.json();
    const author = anonClient();
    const { csrfToken } = await (await author.get('/api/auth/csrf')).json();
    await author.postForm('/api/auth/callback/credentials', {
      csrfToken,
      email,
      password,
      redirect: 'false',
      json: 'true',
      callbackUrl: '/',
    });
    const created = await author.post('/api/admin/posts', {
      title: 'Retained author post',
      content: 'Content',
      status: 'published',
    });
    expect(created.status).toBe(201);
    const { data: post } = await created.json();
    expect((await ref.client.delete(`/api/admin/members/${member.id}`)).status).toBe(200);
    expect((await ref.client.get(`/api/admin/users/${member.user.id}`)).status).toBe(404);
    const retained = await (await anonClient().get(`/api/posts/${post.id}`)).json();
    expect(retained.authorId).toBeNull();
    expect(retained.author).toBeNull();
    expect((await author.get('/api/admin/posts')).status).toBe(401);
    expect((await ref.client.get(`/api/admin/posts/${post.id}`)).status).toBe(200);
  });
});

describe('optional account management', () => {
  const ref = useAdminClient();
  it('creates an account later and rejects a second account', async () => {
    const response = await ref.client.post('/api/admin/members', { name: 'Optional account' });
    expect(response.status).toBe(201);
    const { data: member } = await response.json();
    const body = {
      email: `${TAG}-optional@kiwibit.test`,
      password: 'Password#123!',
      role: 'member',
    };
    expect((await ref.client.post(`/api/admin/members/${member.id}/account`, body)).status).toBe(
      201,
    );
    expect((await ref.client.post(`/api/admin/members/${member.id}/account`, body)).status).toBe(
      409,
    );
    expect((await ref.client.delete(`/api/admin/members/${member.id}`)).status).toBe(200);
  });
});
