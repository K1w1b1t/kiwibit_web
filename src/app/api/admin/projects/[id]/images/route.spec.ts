import { GET as listImages, POST as addImage, MAX_PROJECT_IMAGES } from './route';
import { PUT as updateImage, DELETE as deleteImage } from './[imageId]/route';
import { PUT as reorderImages } from './order/route';
import { prisma } from '@/shared/lib/prisma';
import { deleteObjects } from '@/shared/lib/storage';
import { makeReq, mockAuth } from '@/shared/test-utils/spec-helpers';

jest.mock('@/shared/lib/storage', () => ({
  deleteObjects: jest.fn().mockResolvedValue(true),
}));

// ── helpers ───────────────────────────────────────────────────────────────────

const PROJECT_ID = 'pid-1';
const BASE = `http://localhost/api/admin/projects/${PROJECT_ID}/images`;

/** The image routes carry two params, so `paramsFor` from spec-helpers is too narrow. */
function imageParams(imageId: string, projectId = PROJECT_ID) {
  return { params: Promise.resolve({ id: projectId, imageId }) };
}

function projectParams(projectId = PROJECT_ID) {
  return { params: Promise.resolve({ id: projectId }) };
}

function makeImage(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'img-1',
    projectId: PROJECT_ID,
    url: 'https://cdn.test/a.png',
    storagePath: 'projects/a.png',
    alt: null,
    position: 0,
    isCover: true,
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  (deleteObjects as jest.Mock).mockResolvedValue(true);
});

// ── GET /api/admin/projects/[id]/images ───────────────────────────────────────

describe('GET /api/admin/projects/[id]/images', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await listImages(makeReq(BASE), projectParams());
    expect(res.status).toBe(401);
  });

  it('returns 404 when the project does not exist', async () => {
    mockAuth();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await listImages(makeReq(BASE), projectParams());
    expect(res.status).toBe(404);
  });

  it('returns the project images with a total', async () => {
    mockAuth();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: PROJECT_ID });
    (prisma.projectImage.findMany as jest.Mock).mockResolvedValue([makeImage()]);

    const res = await listImages(makeReq(BASE), projectParams());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
  });
});

// ── POST /api/admin/projects/[id]/images ──────────────────────────────────────

describe('POST /api/admin/projects/[id]/images', () => {
  const VALID = { url: 'https://cdn.test/a.png', storagePath: 'projects/a.png' };

  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await addImage(makeReq(BASE, VALID), projectParams());
    expect(res.status).toBe(401);
  });

  it('returns 400 when url is not http(s)', async () => {
    mockAuth();
    const res = await addImage(
      makeReq(BASE, { ...VALID, url: 'javascript:alert(1)' }),
      projectParams(),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when storagePath is missing', async () => {
    mockAuth();
    const res = await addImage(makeReq(BASE, { url: VALID.url }), projectParams());
    expect(res.status).toBe(400);
  });

  it('returns 400 when alt is neither a string nor null', async () => {
    mockAuth();
    const res = await addImage(makeReq(BASE, { ...VALID, alt: 7 }), projectParams());
    expect(res.status).toBe(400);
  });

  it('returns 404 when the project does not exist', async () => {
    mockAuth();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await addImage(makeReq(BASE, VALID), projectParams());
    expect(res.status).toBe(404);
  });

  it(`returns 409 once the project holds ${MAX_PROJECT_IMAGES} images`, async () => {
    mockAuth();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: PROJECT_ID });
    (prisma.projectImage.count as jest.Mock).mockResolvedValue(MAX_PROJECT_IMAGES);

    const res = await addImage(makeReq(BASE, VALID), projectParams());

    expect(res.status).toBe(409);
    expect(prisma.projectImage.create).not.toHaveBeenCalled();
  });

  it('makes the first image the cover at position 0', async () => {
    mockAuth();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: PROJECT_ID });
    (prisma.projectImage.count as jest.Mock).mockResolvedValue(0);
    (prisma.projectImage.create as jest.Mock).mockResolvedValue(makeImage());

    const res = await addImage(makeReq(BASE, VALID), projectParams());

    expect(res.status).toBe(201);
    expect(prisma.projectImage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ position: 0, isCover: true }),
    });
  });

  it('appends later images without stealing the cover', async () => {
    mockAuth();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: PROJECT_ID });
    (prisma.projectImage.count as jest.Mock).mockResolvedValue(3);
    (prisma.projectImage.create as jest.Mock).mockResolvedValue(makeImage({ position: 3 }));

    await addImage(makeReq(BASE, VALID), projectParams());

    expect(prisma.projectImage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ position: 3, isCover: false }),
    });
  });

  it('normalises a blank alt to null', async () => {
    mockAuth();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: PROJECT_ID });
    (prisma.projectImage.count as jest.Mock).mockResolvedValue(0);
    (prisma.projectImage.create as jest.Mock).mockResolvedValue(makeImage());

    await addImage(makeReq(BASE, { ...VALID, alt: '   ' }), projectParams());

    expect(prisma.projectImage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ alt: null }),
    });
  });
});

// ── PUT /api/admin/projects/[id]/images/[imageId] ─────────────────────────────

describe('PUT /api/admin/projects/[id]/images/[imageId]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await updateImage(makeReq(`${BASE}/img-1`, { alt: 'x' }), imageParams('img-1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when alt is neither a string nor null', async () => {
    mockAuth();
    const res = await updateImage(makeReq(`${BASE}/img-1`, { alt: 7 }), imageParams('img-1'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when isCover is not a boolean', async () => {
    mockAuth();
    const res = await updateImage(
      makeReq(`${BASE}/img-1`, { isCover: 'yes' }),
      imageParams('img-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when the image does not exist', async () => {
    mockAuth();
    (prisma.projectImage.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await updateImage(makeReq(`${BASE}/img-1`, { alt: 'x' }), imageParams('img-1'));
    expect(res.status).toBe(404);
  });

  it('returns 404 when the image belongs to another project', async () => {
    mockAuth();
    (prisma.projectImage.findUnique as jest.Mock).mockResolvedValue(
      makeImage({ projectId: 'other-project' }),
    );
    const res = await updateImage(makeReq(`${BASE}/img-1`, { alt: 'x' }), imageParams('img-1'));
    expect(res.status).toBe(404);
  });

  it('clears every other cover when promoting one', async () => {
    mockAuth();
    (prisma.projectImage.findUnique as jest.Mock).mockResolvedValue(
      makeImage({ id: 'img-2', isCover: false }),
    );
    (prisma.projectImage.findMany as jest.Mock).mockResolvedValue([makeImage()]);

    const res = await updateImage(
      makeReq(`${BASE}/img-2`, { isCover: true }),
      imageParams('img-2'),
    );

    expect(res.status).toBe(200);
    expect(prisma.projectImage.updateMany).toHaveBeenCalledWith({
      where: { projectId: PROJECT_ID },
      data: { isCover: false },
    });
    expect(prisma.projectImage.update).toHaveBeenCalledWith({
      where: { id: 'img-2' },
      data: expect.objectContaining({ isCover: true }),
    });
  });

  it('leaves alt untouched when the key is absent', async () => {
    mockAuth();
    (prisma.projectImage.findUnique as jest.Mock).mockResolvedValue(
      makeImage({ isCover: false, alt: 'kept' }),
    );
    (prisma.projectImage.findMany as jest.Mock).mockResolvedValue([]);

    await updateImage(makeReq(`${BASE}/img-1`, {}, 'PUT'), imageParams('img-1'));

    const call = (prisma.projectImage.update as jest.Mock).mock.calls[0][0];
    expect(call.data).not.toHaveProperty('alt');
  });

  it('trims alt and stores a blank one as null', async () => {
    mockAuth();
    (prisma.projectImage.findUnique as jest.Mock).mockResolvedValue(makeImage({ isCover: false }));
    (prisma.projectImage.findMany as jest.Mock).mockResolvedValue([]);

    await updateImage(makeReq(`${BASE}/img-1`, { alt: '  ' }), imageParams('img-1'));

    expect(prisma.projectImage.update).toHaveBeenCalledWith({
      where: { id: 'img-1' },
      data: expect.objectContaining({ alt: null }),
    });
  });

  it('refuses to unset the cover of the only covered image', async () => {
    mockAuth();
    (prisma.projectImage.findUnique as jest.Mock).mockResolvedValue(makeImage({ isCover: true }));
    (prisma.projectImage.findMany as jest.Mock).mockResolvedValue([]);

    await updateImage(makeReq(`${BASE}/img-1`, { isCover: false }), imageParams('img-1'));

    const call = (prisma.projectImage.update as jest.Mock).mock.calls[0][0];
    expect(call.data).not.toHaveProperty('isCover');
  });
});

// ── DELETE /api/admin/projects/[id]/images/[imageId] ──────────────────────────

describe('DELETE /api/admin/projects/[id]/images/[imageId]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await deleteImage(makeReq(`${BASE}/img-1`), imageParams('img-1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when the image belongs to another project', async () => {
    mockAuth();
    (prisma.projectImage.findUnique as jest.Mock).mockResolvedValue(
      makeImage({ projectId: 'other-project' }),
    );
    const res = await deleteImage(makeReq(`${BASE}/img-1`), imageParams('img-1'));
    expect(res.status).toBe(404);
    expect(prisma.projectImage.delete).not.toHaveBeenCalled();
  });

  it('deletes the row, compacts positions and removes the object', async () => {
    mockAuth();
    (prisma.projectImage.findUnique as jest.Mock).mockResolvedValue(
      makeImage({ isCover: false, storagePath: 'projects/gone.png' }),
    );
    (prisma.projectImage.findMany as jest.Mock)
      .mockResolvedValueOnce([{ id: 'img-2' }, { id: 'img-3' }])
      .mockResolvedValueOnce([]);

    const res = await deleteImage(makeReq(`${BASE}/img-1`), imageParams('img-1'));

    expect(res.status).toBe(200);
    expect(prisma.projectImage.delete).toHaveBeenCalledWith({ where: { id: 'img-1' } });
    expect(prisma.projectImage.update).toHaveBeenCalledWith({
      where: { id: 'img-2' },
      data: expect.objectContaining({ position: 0 }),
    });
    expect(deleteObjects).toHaveBeenCalledWith(['projects/gone.png']);
  });

  it('promotes the first survivor when the cover is deleted', async () => {
    mockAuth();
    (prisma.projectImage.findUnique as jest.Mock).mockResolvedValue(makeImage({ isCover: true }));
    (prisma.projectImage.findMany as jest.Mock)
      .mockResolvedValueOnce([{ id: 'img-2' }, { id: 'img-3' }])
      .mockResolvedValueOnce([]);

    await deleteImage(makeReq(`${BASE}/img-1`), imageParams('img-1'));

    const updates = (prisma.projectImage.update as jest.Mock).mock.calls.map((c) => c[0]);
    expect(updates[0].data).toMatchObject({ position: 0, isCover: true });
    expect(updates[1].data).toMatchObject({ position: 1, isCover: false });
  });
});

// ── PUT /api/admin/projects/[id]/images/order ─────────────────────────────────

describe('PUT /api/admin/projects/[id]/images/order', () => {
  const ORDER_URL = `${BASE}/order`;

  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await reorderImages(makeReq(ORDER_URL, { ids: ['a'] }), projectParams());
    expect(res.status).toBe(401);
  });

  it('returns 400 when ids is not an array of strings', async () => {
    mockAuth();
    const res = await reorderImages(makeReq(ORDER_URL, { ids: ['a', 3] }), projectParams());
    expect(res.status).toBe(400);
  });

  it('returns 404 when the project has no images', async () => {
    mockAuth();
    (prisma.projectImage.findMany as jest.Mock).mockResolvedValue([]);
    const res = await reorderImages(makeReq(ORDER_URL, { ids: ['a'] }), projectParams());
    expect(res.status).toBe(404);
  });

  it('rejects duplicate ids', async () => {
    mockAuth();
    (prisma.projectImage.findMany as jest.Mock).mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const res = await reorderImages(makeReq(ORDER_URL, { ids: ['a', 'a'] }), projectParams());
    expect(res.status).toBe(400);
  });

  it('rejects a partial list', async () => {
    mockAuth();
    (prisma.projectImage.findMany as jest.Mock).mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const res = await reorderImages(makeReq(ORDER_URL, { ids: ['a'] }), projectParams());
    expect(res.status).toBe(400);
  });

  it("rejects an id from another project's images", async () => {
    mockAuth();
    (prisma.projectImage.findMany as jest.Mock).mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const res = await reorderImages(makeReq(ORDER_URL, { ids: ['a', 'zzz'] }), projectParams());
    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rewrites positions to match the payload order', async () => {
    mockAuth();
    (prisma.projectImage.findMany as jest.Mock)
      .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }])
      .mockResolvedValueOnce([]);

    const res = await reorderImages(makeReq(ORDER_URL, { ids: ['b', 'a'] }), projectParams());

    expect(res.status).toBe(200);
    const updates = (prisma.projectImage.update as jest.Mock).mock.calls.map((c) => c[0]);
    expect(updates).toEqual([
      { where: { id: 'b' }, data: { position: 0 } },
      { where: { id: 'a' }, data: { position: 1 } },
    ]);
  });
});
