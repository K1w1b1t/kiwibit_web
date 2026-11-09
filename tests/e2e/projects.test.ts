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

const TAG = `e2e-proj-${Date.now()}`;

describe('Projects CRUD — /api/admin/projects', () => {
  const ref = useAdminClient();
  let createdId: string;

  // ── LIST ──────────────────────────────────────────────────────────────────
  it('GET /api/admin/projects returns a paginated list', async () => {
    await expectPaginatedList(await ref.client.get('/api/admin/projects'));
  });

  // ── CREATE ────────────────────────────────────────────────────────────────
  it('POST /api/admin/projects creates a project', async () => {
    createdId = await expectCreated(
      ref.client.post('/api/admin/projects', {
        title: `E2E Project ${TAG}`,
        description: 'E2E test project description',
        repoUrl: 'https://github.com/example/e2e-project',
      }),
      (data) => expect(data.title).toBe(`E2E Project ${TAG}`),
    );
  });

  it('POST /api/admin/projects rejects missing title', async () => {
    expect((await ref.client.post('/api/admin/projects', { description: 'no title' })).status).toBe(
      400,
    );
  });

  it('POST /api/admin/projects rejects missing description', async () => {
    expect((await ref.client.post('/api/admin/projects', { title: 'no desc' })).status).toBe(400);
  });

  // ── READ ──────────────────────────────────────────────────────────────────
  it('GET /api/admin/projects/[id] returns the created project', () =>
    expectAdminItem(ref.client.get(`/api/admin/projects/${createdId}`), createdId, (body) =>
      expect(body.description).toBe('E2E test project description'),
    ));

  it('GET /api/admin/projects/[id] returns 404 for unknown id', async () => {
    expect((await ref.client.get(`/api/admin/projects/${UNKNOWN_ID}`)).status).toBe(404);
  });

  it('GET /api/projects/[id] returns the project publicly', () =>
    expectPublicItem(anonClient().get(`/api/projects/${createdId}`), createdId));

  // ── UPDATE ────────────────────────────────────────────────────────────────
  it('PUT /api/admin/projects/[id] updates the project', async () => {
    const res = await ref.client.put(`/api/admin/projects/${createdId}`, {
      description: 'Updated E2E description',
      liveUrl: 'https://example.com/live',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.description).toBe('Updated E2E description');
    expect(body.data.liveUrl).toBe('https://example.com/live');
  });

  it('GET /api/projects/[id] reflects the updated project', async () => {
    const body = await (await anonClient().get(`/api/projects/${createdId}`)).json();
    expect(body.description).toBe('Updated E2E description');
  });

  // ── DELETE ────────────────────────────────────────────────────────────────
  it('DELETE /api/admin/projects/[id] removes the project', () =>
    expectDeleteOk(ref.client.delete(`/api/admin/projects/${createdId}`)));

  it('GET /api/admin/projects/[id] returns 404 after deletion', async () => {
    expect((await ref.client.get(`/api/admin/projects/${createdId}`)).status).toBe(404);
  });

  it('GET /api/projects does not include the deleted project', async () => {
    const body = await (await anonClient().get(`/api/projects?search=${TAG}`)).json();
    expect(body.items).toHaveLength(0);
  });
});

describe('Bilingual projects and home highlights', () => {
  const ref = useAdminClient();
  let projectId: string;
  it('creates a bilingual highlight and returns translations publicly', async () => {
    projectId = await expectCreated(
      ref.client.post('/api/admin/projects', {
        titlePt: `Projeto ${TAG}`,
        descriptionPt: 'Descrição em português do projeto de teste.',
        titleEn: `Project ${TAG}`,
        descriptionEn: 'English description of the test project.',
        isFeatured: true,
        featuredOrder: 1,
      }),
      (data) => expect(data.titleEn).toBe(`Project ${TAG}`),
    );
    const project = await (await anonClient().get(`/api/projects/${projectId}`)).json();
    expect(project.titleEn).toBe(`Project ${TAG}`);
    const list = await (await anonClient().get(`/api/projects?featured=true&search=${TAG}`)).json();
    expect(list.items.map((item: { id: string }) => item.id)).toContain(projectId);
  });
  it('localizes the detail and its metadata from the URL', async () => {
    const english = await (await anonClient().get(`/en/projects/${projectId}`)).text();
    const portuguese = await (await anonClient().get(`/pt/projects/${projectId}`)).text();
    expect(english).toContain(`Project ${TAG}`);
    expect(portuguese).toContain(`Projeto ${TAG}`);
  });
  it('preserves omitted translations and rejects removing the last language', async () => {
    expect(
      (
        await ref.client.put(`/api/admin/projects/${projectId}`, {
          titlePt: null,
          descriptionPt: null,
        })
      ).status,
    ).toBe(200);
    const project = await (await anonClient().get(`/api/projects/${projectId}`)).json();
    expect(project.titleEn).toBe(`Project ${TAG}`);
    expect(project.titlePt).toBeNull();
    expect(
      (
        await ref.client.put(`/api/admin/projects/${projectId}`, {
          titleEn: null,
          descriptionEn: null,
        })
      ).status,
    ).toBe(400);
    expect(
      (await ref.client.put(`/api/admin/projects/${projectId}`, { featuredOrder: -1 })).status,
    ).toBe(400);
  });
  it('supports English-only creation without legacy fields', async () => {
    const id = await expectCreated(
      ref.client.post('/api/admin/projects', {
        titleEn: `English ${TAG}`,
        descriptionEn: 'A complete English-only project description.',
      }),
      (data) => expect(data.title).toBe(`English ${TAG}`),
    );
    await expectDeleteOk(ref.client.delete(`/api/admin/projects/${id}`));
  });
  it('removes the fixture', () =>
    expectDeleteOk(ref.client.delete(`/api/admin/projects/${projectId}`)));
});
