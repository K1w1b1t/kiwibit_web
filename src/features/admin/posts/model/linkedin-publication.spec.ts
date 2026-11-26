import { prisma } from '@/shared/lib/prisma';
import { triggerLinkedInAutoPost, triggerPersonalAutoPost } from '@/shared/lib/linkedin';
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
    authorId: 'author-1',
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
  const member = {
    id: 'member-1',
    linkedinConnection: {
      linkedinPersonId: 'person-1',
      scope: 'w_member_social',
      autoPostEnabled: true,
      accessTokenExpiry: new Date('2099-01-01'),
    },
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
    jest.mocked(prisma.member.findUnique).mockResolvedValue(member as never);
  });

  afterAll(() => {
    process.env = env;
  });

  it('returns the saved text and availability for the author profile only', async () => {
    expect(await getLinkedInReview('post-1')).toMatchObject({
      text: 'Reviewed',
      hashtags: '#Tag',
      version: 1,
      destinations: { personal: true },
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
    expect(triggerPersonalAutoPost).not.toHaveBeenCalled();
  });

  it('rejects sending with no author connection even when company posting is configured', async () => {
    jest.mocked(prisma.member.findUnique).mockResolvedValue(null);
    expect(await getLinkedInReview('post-1')).toMatchObject({ destinations: { personal: false } });
    expect(await confirmLinkedInReview('post-1', 1, true)).toMatchObject({ status: 409 });
    expect(prisma.linkedinBlogDelivery.upsert).not.toHaveBeenCalled();
    expect(triggerLinkedInAutoPost).not.toHaveBeenCalled();
    expect(triggerPersonalAutoPost).not.toHaveBeenCalled();
  });

  it('rejects a final message exceeding the personal limit before claiming a delivery', async () => {
    jest.mocked(prisma.linkedinBlogReview.findUnique).mockResolvedValue({
      ...review,
      text: 'a'.repeat(3000),
    } as never);
    expect(await confirmLinkedInReview('post-1', 1, true)).toMatchObject({ status: 400 });
    expect(prisma.linkedinBlogDelivery.upsert).not.toHaveBeenCalled();
  });

  it.each(['sending', 'unknown', 'succeeded'])(
    'blocks a second send while status is %s',
    async (status) => {
      jest.mocked(prisma.linkedinBlogReview.findUnique).mockResolvedValue({
        ...review,
        deliveries: [{ target: 'personal', status }],
      } as never);
      expect(await confirmLinkedInReview('post-1', 1, true)).toMatchObject({ status: 409 });
      expect(triggerPersonalAutoPost).not.toHaveBeenCalled();
    },
  );

  it('claims before sending and records an ambiguous provider failure as unknown', async () => {
    jest
      .mocked(triggerPersonalAutoPost)
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
    ).toBeLessThan(jest.mocked(triggerPersonalAutoPost).mock.invocationCallOrder[0]);
  });

  it('records confirmed success and the uploaded media identifiers', async () => {
    jest.mocked(triggerPersonalAutoPost).mockResolvedValue({
      ok: true,
      sent: true,
      postUrn: 'urn:li:share:1',
      imageUrn: 'urn:li:image:1',
    });
    await confirmLinkedInReview('post-1', 1, true);
    expect(prisma.linkedinBlogDelivery.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ target: 'personal', version: 1 }),
        data: expect.objectContaining({
          status: 'succeeded',
          postUrn: 'urn:li:share:1',
          imageUrn: 'urn:li:image:1',
        }),
      }),
    );
    expect(triggerPersonalAutoPost).toHaveBeenCalledWith(
      member.linkedinConnection,
      expect.objectContaining({ commentary: 'Reviewed\n\n#Tag' }),
    );
  });

  it('keeps a confirmed media failure eligible for retry', async () => {
    jest.mocked(triggerPersonalAutoPost).mockResolvedValue({
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

  it('ignores an uncertain historical company delivery when saving and sending', async () => {
    const companyDelivery = { target: 'company', status: 'unknown' };
    let version = review.version;
    jest.mocked(prisma.linkedinBlogReview.findUnique).mockImplementation((args) => {
      const deliveries = args?.include?.deliveries;
      const personalOnly =
        typeof deliveries === 'object' && deliveries.where?.target === 'personal';
      return Promise.resolve({
        ...review,
        version,
        deliveries: personalOnly ? [] : [companyDelivery],
      }) as never;
    });
    jest.mocked(prisma.linkedinBlogReview.upsert).mockImplementation(() => {
      version += 1;
      return Promise.resolve({ version }) as never;
    });
    jest.mocked(triggerPersonalAutoPost).mockResolvedValue({ ok: true, sent: true });
    await expect(
      saveLinkedInReview('post-1', 1, 'Reviewed text', '#Tag', updatedAt.toISOString()),
    ).resolves.toEqual({ version: 2 });
    expect(await confirmLinkedInReview('post-1', 2, true)).toMatchObject({
      review: { deliveries: [] },
    });
    expect(prisma.linkedinBlogDelivery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ target: 'personal' }) }),
    );
    expect(triggerPersonalAutoPost).toHaveBeenCalledTimes(1);
    expect(triggerLinkedInAutoPost).not.toHaveBeenCalled();
  });
});
