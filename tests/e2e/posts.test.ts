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

  it('persists a LinkedIn review without publishing it', async () => {
    const path = `/api/admin/posts/${createdId}/linkedin`;
    expect((await anonClient().get(path)).status).toBe(401);
    const first = await ref.client.get(path);
    expect(first.status).toBe(200);
    const suggestion = await first.json();
    expect(suggestion.version).toBe(0);
    expect(suggestion.text).toContain('Leia o post no meu blog:');
    const saved = await ref.client.put(path, {
      version: 0,
      text: 'Uma chamada revisada e coerente.',
      hashtags: '#Kiwibit',
      postUpdatedAt: suggestion.postUpdatedAt,
    });
    expect(saved.status).toBe(200);
    const savedBody = await saved.json();
    expect(savedBody.version).toBe(1);
    const reopened = await (await ref.client.get(path)).json();
    expect(reopened.text).toBe('Uma chamada revisada e coerente.');
    expect(reopened.deliveries).toEqual([]);
    expect((await ref.client.post(path, { version: 1, acknowledged: false })).status).toBe(400);
    const simultaneous = await Promise.all([
      ref.client.put(path, {
        version: 1,
        text: 'Primeira revisão',
        hashtags: '#Kiwibit',
        postUpdatedAt: reopened.postUpdatedAt,
      }),
      ref.client.put(path, {
        version: 1,
        text: 'Segunda revisão',
        hashtags: '#Kiwibit',
        postUpdatedAt: reopened.postUpdatedAt,
      }),
    ]);
    expect(simultaneous.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(
      (
        await ref.client.put(`/api/admin/posts/${createdId}`, {
          linkedinIntroPt: 'Uma nova chamada do autor.',
        })
      ).status,
    ).toBe(200);
    const currentReview = await (await ref.client.get(path)).json();
    expect(currentReview.stale).toBe(true);
    expect(
      (
        await ref.client.put(path, {
          version: currentReview.version,
          text: 'Revisão antiga',
          hashtags: '#Kiwibit',
          postUpdatedAt: reopened.postUpdatedAt,
        })
      ).status,
    ).toBe(409);
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

describe('Bilingual posts', () => {
  const ref = useAdminClient();
  it('creates English-only content, preserves translations on partial updates, and searches English titles', async () => {
    const response = await ref.client.post('/api/admin/posts', {
      titleEn: `English translation ${TAG}`,
      contentEn: 'A complete English article for bilingual integration testing.',
      status: 'draft',
    });
    expect(response.status).toBe(201);
    const { data } = await response.json();
    try {
      expect(data.titlePt).toBeNull();
      expect(data.title).toBe(data.titleEn);
      const update = await ref.client.put(`/api/admin/posts/${data.id}`, {
        coverImageAltEn: 'English cover',
      });
      expect(update.status).toBe(200);
      expect((await update.json()).data.titlePt).toBeNull();
      const list = await (
        await ref.client.get(`/api/admin/posts?search=${encodeURIComponent(data.titleEn)}`)
      ).json();
      expect(list.items.some((item: { id: string }) => item.id === data.id)).toBe(true);
      expect(
        (await ref.client.put(`/api/admin/posts/${data.id}`, { titleEn: null, contentEn: null }))
          .status,
      ).toBe(400);
    } finally {
      await ref.client.delete(`/api/admin/posts/${data.id}`);
    }
  });
});

describe('Rich post content — /api/admin/posts', () => {
  const ref = useAdminClient();
  it('persists sanitized bilingual HTML, preserves omitted translations and exposes safe public content', async () => {
    const response = await ref.client.post('/api/admin/posts', {
      titlePt: `Rich post ${TAG}`,
      contentPt: '<h2 onclick="alert(1)">Portuguese article content</h2><script>alert(1)</script>',
      titleEn: `Rich English ${TAG}`,
      contentEn: '<p><strong>English article content</strong> 🚀</p>',
      contentFormat: 'html',
      status: 'published',
    });
    expect(response.status).toBe(201);
    const { data } = await response.json();
    try {
      expect(data.contentFormat).toBe('html');
      expect(data.contentPt).toBe('<h2>Portuguese article content</h2>');
      const updated = await ref.client.put(`/api/admin/posts/${data.id}`, {
        contentPt: 'Updated <literal> Portuguese article',
      });
      expect(updated.status).toBe(200);
      const { data: next } = await updated.json();
      expect(next.contentPt).toContain('&lt;literal&gt;');
      expect(next.contentEn).toBe(data.contentEn);
      const publicResponse = await anonClient().get(`/api/posts/${data.id}`);
      expect(publicResponse.status).toBe(200);
      const publicPost = await publicResponse.json();
      expect(publicPost.contentFormat).toBe('html');
      expect(publicPost.content).not.toMatch(/onclick|<script>/);
    } finally {
      await ref.client.delete(`/api/admin/posts/${data.id}`);
    }
  });
});

describe('Markdown preview and persistence', () => {
  const ref = useAdminClient();
  it('previews and stores Markdown safely with raw HTML and existing locale fallback', async () => {
    const markdown =
      '# Heading\n\nA **long article** with <u>underline</u> and <script>alert(1)</script>.';
    const preview = await ref.client.post('/api/admin/posts/preview', { content: markdown });
    expect(preview.status).toBe(200);
    const previewBody = await preview.json();
    expect(previewBody.html).toContain('<strong>long article</strong>');
    expect(previewBody.html).toContain('<u>underline</u>');
    expect(previewBody.html).not.toContain('<script>');
    const created = await ref.client.post('/api/admin/posts', {
      titlePt: 'Markdown example',
      contentPt: markdown,
      contentFormat: 'markdown',
      status: 'published',
    });
    expect(created.status).toBe(201);
    const { data } = await created.json();
    try {
      expect(data.contentPt).toBe(markdown);
      const publicPage = await anonClient().get(`/en/blog/${data.id}`);
      expect(publicPage.status).toBe(200);
      const html = await publicPage.text();
      expect(html).toContain(previewBody.html);
    } finally {
      await ref.client.delete(`/api/admin/posts/${data.id}`);
    }
  });
});
