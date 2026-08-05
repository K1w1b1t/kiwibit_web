import { POST as upload, DELETE as discard } from './route';
import { apiError } from '@/shared/lib/api-helpers';
import { deleteObjects, isStorageConfigured, putObject } from '@/shared/lib/storage';
import { mockAuth } from '@/shared/test-utils/spec-helpers';

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/shared/lib/storage', () => ({
  isStorageConfigured: jest.fn().mockReturnValue(true),
  putObject: jest.fn(),
  deleteObjects: jest.fn(),
}));

// ── helpers ───────────────────────────────────────────────────────────────────

const URL_ = 'http://localhost/api/admin/uploads';

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** 16 bytes: `sniffImageType` refuses anything shorter than 12. */
function pngBytes() {
  return new Uint8Array([...PNG_MAGIC, 0, 0, 0, 13, 0, 0, 0, 0]);
}

function jpegBytes() {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
}

/**
 * The declared MIME type is deliberately independent of the bytes — the route's
 * whole point is that it trusts the content, not the header.
 */
function uploadRequest(
  // Not a bare `Uint8Array`: `BlobPart` requires the buffer to be a plain
  // ArrayBuffer, which the default `ArrayBufferLike` does not guarantee.
  bytes: Uint8Array<ArrayBuffer>,
  declaredType: string,
  scope: string | null = 'projects',
) {
  const form = new FormData();
  form.set('file', new File([bytes], 'image.png', { type: declaredType }));
  if (scope !== null) form.set('scope', scope);
  return new Request(URL_, { method: 'POST', body: form });
}

beforeEach(() => {
  (isStorageConfigured as jest.Mock).mockReturnValue(true);
  (putObject as jest.Mock).mockResolvedValue({
    ok: true,
    url: 'https://cdn.test/projects/x.png',
    key: 'projects/x.png',
  });
  (deleteObjects as jest.Mock).mockResolvedValue(true);
});

// ── POST /api/admin/uploads ───────────────────────────────────────────────────

describe('POST /api/admin/uploads', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await upload(uploadRequest(pngBytes(), 'image/png'));
    expect(res.status).toBe(401);
  });

  it('returns 503 when storage is not configured', async () => {
    mockAuth();
    (isStorageConfigured as jest.Mock).mockReturnValue(false);

    const res = await upload(uploadRequest(pngBytes(), 'image/png'));

    expect(res.status).toBe(503);
    expect(putObject).not.toHaveBeenCalled();
  });

  it('returns 400 when the body is not multipart', async () => {
    mockAuth();
    const req = new Request(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"file":"nope"}',
    });

    const res = await upload(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 when the file field is missing', async () => {
    mockAuth();
    const form = new FormData();
    form.set('scope', 'projects');

    const res = await upload(new Request(URL_, { method: 'POST', body: form }));

    expect(res.status).toBe(400);
  });

  it('returns 400 for a scope outside the managed prefixes', async () => {
    mockAuth();
    const res = await upload(uploadRequest(pngBytes(), 'image/png', 'etc'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for a disallowed declared type', async () => {
    mockAuth();
    const res = await upload(uploadRequest(pngBytes(), 'image/gif'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when the bytes are not a supported image', async () => {
    mockAuth();
    const notAnImage = new Uint8Array(16).fill(0x41);

    const res = await upload(uploadRequest(notAnImage, 'image/png'));

    expect(res.status).toBe(400);
    expect(putObject).not.toHaveBeenCalled();
  });

  it('rejects a JPEG masquerading as a PNG', async () => {
    mockAuth();

    const res = await upload(uploadRequest(jpegBytes(), 'image/png'));

    expect(res.status).toBe(400);
    expect(putObject).not.toHaveBeenCalled();
  });

  it('stores the object under the scope prefix and returns url plus path', async () => {
    mockAuth();

    const res = await upload(uploadRequest(pngBytes(), 'image/png'));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toEqual({ url: 'https://cdn.test/projects/x.png', path: 'projects/x.png' });

    const [key, , type] = (putObject as jest.Mock).mock.calls[0];
    expect(key).toMatch(/^projects\/[0-9a-f-]{36}\.png$/);
    expect(type).toBe('image/png');
  });

  it('returns 502 when storage rejects the upload', async () => {
    mockAuth();
    (putObject as jest.Mock).mockResolvedValue({ ok: false, message: 'bucket on fire' });

    const res = await upload(uploadRequest(pngBytes(), 'image/png'));

    expect(res.status).toBe(502);
    expect(apiError).toHaveBeenCalledWith('STORAGE_ERROR', 'bucket on fire', 502);
  });
});

// ── DELETE /api/admin/uploads ─────────────────────────────────────────────────

describe('DELETE /api/admin/uploads', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth(false);
    const res = await discard(new Request(`${URL_}?path=projects/a.png`, { method: 'DELETE' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when path is missing', async () => {
    mockAuth();
    const res = await discard(new Request(URL_, { method: 'DELETE' }));
    expect(res.status).toBe(400);
  });

  it('refuses a path outside the managed prefixes', async () => {
    mockAuth();

    const res = await discard(new Request(`${URL_}?path=secrets/key.pem`, { method: 'DELETE' }));

    expect(res.status).toBe(400);
    expect(deleteObjects).not.toHaveBeenCalled();
  });

  it('refuses a traversal even under a valid prefix', async () => {
    mockAuth();

    const res = await discard(
      new Request(`${URL_}?path=projects/../../etc/passwd`, { method: 'DELETE' }),
    );

    expect(res.status).toBe(400);
    expect(deleteObjects).not.toHaveBeenCalled();
  });

  it('deletes a managed object', async () => {
    mockAuth();

    const res = await discard(new Request(`${URL_}?path=projects/a.png`, { method: 'DELETE' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(deleteObjects).toHaveBeenCalledWith(['projects/a.png']);
  });

  it('reports failure without throwing when storage says no', async () => {
    mockAuth();
    (deleteObjects as jest.Mock).mockResolvedValue(false);

    const res = await discard(new Request(`${URL_}?path=projects/a.png`, { method: 'DELETE' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: false });
  });
});
