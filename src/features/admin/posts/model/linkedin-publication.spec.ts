import { prisma } from '@/shared/lib/prisma';
import { triggerLinkedInAutoPost } from '@/shared/lib/linkedin';
import {
  confirmLinkedInReview,
  getLinkedInReview,
  saveLinkedInReview,
} from './linkedin-publication';

jest.mock('@/shared/lib/linkedin', () => ({
  ...jest.requireActual('@/shared/lib/linkedin'),
  triggerLinkedInAutoPost: jest.fn(),
  triggerPersonalAutoPost: jest.fn(),
}));

describe('LinkedIn blog review', () => {
  const env = { ...process.env };
  const updatedAt = new Date('2026-01-01T00:00:00Z');
  const post = {
    id: 'post-1',
    status: 'published',
    title: 'Title',
    content: 'Body',
    authorId: null,
    coverImageUrl: null,
    updatedAt,
  };
  const review = {
    postId: 'post-1',
    text: 'Reviewed',
    hashtags: '#Tag',
    version: 1,
    postUpdatedAt: updatedAt,
    deliveries: [],
  };
  beforeEach(() => {
    process.env = {
      ...env,
      LINKEDIN_COMPANY_AUTO_POST_ENABLED: 'true',
      LINKEDIN_COMPANY_ACCESS_TOKEN: 'token',
      LINKEDIN_COMPANY_AUTHOR_URN: 'urn:li:organization:12',
    };
    jest.mocked(prisma.post.findUnique).mockResolvedValue(post as never);
    jest.mocked(prisma.linkedinBlogReview.findUnique).mockResolvedValue(review as never);
  });
  afterAll(() => {
    process.env = env;
  });

  it('returns a saved review and configured destinations', async () => {
    expect(await getLinkedInReview('post-1')).toMatchObject({
      text: 'Reviewed',
      hashtags: '#Tag',
      version: 1,
      destinations: { company: true, personal: false },
    });
  });

  it('rejects an outdated revision', async () => {
    const result = await saveLinkedInReview('post-1', 0, 'Text', '#Tag', updatedAt.toISOString());
    expect(result).toMatchObject({ status: 409 });
    expect(prisma.linkedinBlogReview.upsert).not.toHaveBeenCalled();
  });

  it('rejects a review if the post or cover changed since the preview', async () => {
    const result = await saveLinkedInReview(
      'post-1',
      1,
      'Text',
      '#Tag',
      '2025-01-01T00:00:00.000Z',
    );
    expect(result).toMatchObject({ status: 409 });
    expect(prisma.linkedinBlogReview.upsert).not.toHaveBeenCalled();
  });

  it('does not publish without explicit acknowledgement', async () => {
    expect(await confirmLinkedInReview('post-1', 1, false)).toMatchObject({ status: 400 });
    expect(triggerLinkedInAutoPost).not.toHaveBeenCalled();
  });

  it('blocks retry while a delivery is in progress or uncertain', async () => {
    jest.mocked(prisma.linkedinBlogReview.findUnique).mockResolvedValue({
      ...review,
      deliveries: [{ target: 'company', status: 'unknown' }],
    } as never);
    expect(await confirmLinkedInReview('post-1', 1, true)).toMatchObject({ status: 409 });
    expect(triggerLinkedInAutoPost).not.toHaveBeenCalled();
  });

  it('claims before sending and records an ambiguous provider failure as unknown', async () => {
    jest
      .mocked(triggerLinkedInAutoPost)
      .mockResolvedValue({ ok: false, uncertain: true, code: 'LINKEDIN_POST_ERROR' });
    await confirmLinkedInReview('post-1', 1, true);
    expect(prisma.linkedinBlogDelivery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: 'sending', snapshotText: 'Reviewed\n\n#Tag' }),
      }),
    );
    expect(prisma.linkedinBlogDelivery.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'unknown', errorCode: 'LINKEDIN_POST_ERROR' }),
      }),
    );
    expect(
      jest.mocked(prisma.linkedinBlogDelivery.upsert).mock.invocationCallOrder[0],
    ).toBeLessThan(jest.mocked(triggerLinkedInAutoPost).mock.invocationCallOrder[0]);
  });

  it('records confirmed success and the uploaded media identifiers', async () => {
    jest.mocked(triggerLinkedInAutoPost).mockResolvedValue({
      ok: true,
      sent: true,
      postUrn: 'urn:li:share:1',
      imageUrn: 'urn:li:image:1',
    });
    await confirmLinkedInReview('post-1', 1, true);
    expect(prisma.linkedinBlogDelivery.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'succeeded',
          postUrn: 'urn:li:share:1',
          imageUrn: 'urn:li:image:1',
        }),
      }),
    );
  });

  it('keeps a confirmed media failure eligible for retry', async () => {
    jest.mocked(triggerLinkedInAutoPost).mockResolvedValue({
      ok: false,
      code: 'LINKEDIN_IMAGE_FAILED',
    });
    await confirmLinkedInReview('post-1', 1, true);
    expect(prisma.linkedinBlogDelivery.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'failed', errorCode: 'LINKEDIN_IMAGE_FAILED' }),
      }),
    );
  });

  it('never resends an already successful destination', async () => {
    jest.mocked(prisma.linkedinBlogReview.findUnique).mockResolvedValue({
      ...review,
      deliveries: [{ target: 'company', status: 'succeeded' }],
    } as never);
    expect(await confirmLinkedInReview('post-1', 1, true)).toMatchObject({ status: 409 });
    expect(triggerLinkedInAutoPost).not.toHaveBeenCalled();
  });
});
