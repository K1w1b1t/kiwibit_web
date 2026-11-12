import { GET, POST, PUT } from './route';
import { requireAdminSession } from '@/shared/lib/api-helpers';
import {
  confirmLinkedInReview,
  getLinkedInReview,
  saveLinkedInReview,
} from '@/features/admin/posts/model/linkedin-publication';
import { makeReq, paramsFor } from '@/shared/test-utils/spec-helpers';

jest.mock('@/features/admin/posts/model/linkedin-publication', () => ({
  confirmLinkedInReview: jest.fn(),
  getLinkedInReview: jest.fn(),
  saveLinkedInReview: jest.fn(),
}));

describe('LinkedIn review API', () => {
  const params = paramsFor('post-1');
  const url = 'http://localhost/api/admin/posts/post-1/linkedin';
  beforeEach(() => {
    jest.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: 'admin', role: 'admin' } },
      response: null,
    } as never);
  });
  it('requires administrative access for all methods', async () => {
    jest
      .mocked(requireAdminSession)
      .mockResolvedValue({ session: null, response: new Response(null, { status: 403 }) } as never);
    expect((await GET(makeReq(url), params))?.status).toBe(403);
    expect((await PUT(makeReq(url, {}, 'PUT'), params))?.status).toBe(403);
    expect((await POST(makeReq(url, {}, 'POST'), params))?.status).toBe(403);
    expect(confirmLinkedInReview).not.toHaveBeenCalled();
  });
  it('returns the saved review', async () => {
    jest.mocked(getLinkedInReview).mockResolvedValue({ text: 'Reviewed' } as never);
    expect((await GET(makeReq(url), params))?.status).toBe(200);
    expect(getLinkedInReview).toHaveBeenCalledWith('post-1');
  });
  it('rejects invalid input and never sends without confirmation', async () => {
    expect((await PUT(makeReq(url, { text: 42 }, 'PUT'), params))?.status).toBe(400);
    expect((await POST(makeReq(url, { version: 1 }, 'POST'), params))?.status).toBe(400);
    expect(saveLinkedInReview).not.toHaveBeenCalled();
    expect(confirmLinkedInReview).not.toHaveBeenCalled();
  });
  it('passes explicit confirmation and the saved version to the publication service', async () => {
    jest.mocked(confirmLinkedInReview).mockResolvedValue({ review: null } as never);
    expect(
      (await POST(makeReq(url, { version: 2, acknowledged: true }, 'POST'), params))?.status,
    ).toBe(200);
    expect(confirmLinkedInReview).toHaveBeenCalledWith('post-1', 2, true);
  });
});
