import { publishBlogPostToLinkedIn } from './linkedin-blog-post';
import { prisma } from '@/shared/lib/prisma';
import * as linkedinLib from '@/shared/lib/linkedin';

const post = {
  id: 'post-1',
  title: 'Hello',
  content: 'Body',
  coverImageUrl: null,
  status: 'published' as const,
  authorId: 'uid-1',
};

describe('publishBlogPostToLinkedIn', () => {
  afterEach(() => jest.restoreAllMocks());

  it('passes the author connection to the fan-out and disables the opt-in on an expired token', async () => {
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      id: 'mid-1',
      linkedinConnection: {
        linkedinSub: 'sub-1',
        scope: 'openid profile email w_member_social',
        autoPostEnabled: true,
        accessTokenEnc: 'enc',
        accessTokenExpiry: new Date(),
      },
    });
    (prisma.linkedinConnection.update as jest.Mock).mockResolvedValue({});

    jest.spyOn(linkedinLib, 'triggerLinkedInAutoPostForBlog').mockResolvedValue([
      { ok: false, skipped: true, target: 'company' },
      { ok: false, expired: true, target: 'personal', code: 'LINKEDIN_TOKEN_EXPIRED' },
    ]);

    await publishBlogPostToLinkedIn(post);

    expect(linkedinLib.triggerLinkedInAutoPostForBlog).toHaveBeenCalledWith(
      post,
      expect.objectContaining({ linkedinSub: 'sub-1', autoPostEnabled: true }),
    );
    expect(prisma.linkedinConnection.update).toHaveBeenCalledWith({
      where: { memberId: 'mid-1' },
      data: { autoPostEnabled: false },
    });
  });

  it('does not disable the opt-in when the personal post succeeds', async () => {
    (prisma.member.findUnique as jest.Mock).mockResolvedValue({
      id: 'mid-1',
      linkedinConnection: {
        linkedinSub: 'sub-1',
        scope: 'openid profile email w_member_social',
        autoPostEnabled: true,
        accessTokenEnc: 'enc',
        accessTokenExpiry: new Date(),
      },
    });

    jest
      .spyOn(linkedinLib, 'triggerLinkedInAutoPostForBlog')
      .mockResolvedValue([{ ok: true, sent: true, target: 'personal' }]);

    await publishBlogPostToLinkedIn(post);

    expect(prisma.linkedinConnection.update).not.toHaveBeenCalled();
  });

  it('passes a null connection when the author has no member/connection', async () => {
    (prisma.member.findUnique as jest.Mock).mockResolvedValue(null);
    jest.spyOn(linkedinLib, 'triggerLinkedInAutoPostForBlog').mockResolvedValue([]);

    await publishBlogPostToLinkedIn(post);

    expect(linkedinLib.triggerLinkedInAutoPostForBlog).toHaveBeenCalledWith(post, null);
    expect(prisma.linkedinConnection.update).not.toHaveBeenCalled();
  });
});
