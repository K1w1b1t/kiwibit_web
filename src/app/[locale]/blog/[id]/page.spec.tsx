import PostDetailPage, { generateMetadata } from './page';
import { prisma } from '@/shared/lib/prisma';
import { notFound } from 'next/navigation';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404');
  }),
}));

const validId = '70f06119-6343-440b-a337-4e6976850180';
const malformedIds = [
  '70f06119-6343-440b-a337-4e697685018',
  'not-a-uuid',
  validId + '\n',
  ' ' + validId,
  '70f06119-6343-440b-a337-4e697685018g',
  '70f06119-6343-440b-a3377-4e6976850180',
  '70f061196343440ba3374e6976850180',
];
const publishedPost = {
  id: validId,
  title: 'Published article',
  content: 'Article body',
  contentFormat: 'text',
  status: 'published',
  publishedAt: new Date('2026-11-01T00:00:00Z'),
  updatedAt: new Date('2026-11-01T00:00:00Z'),
  author: null,
  coverImageUrl: null,
  coverImageAlt: null,
};

describe.each(['pt', 'en'])('Public blog detail (%s)', (locale) => {
  const props = (id: string) => ({ params: Promise.resolve({ locale, id }) });

  beforeEach(() => {
    (prisma.post.findUnique as jest.Mock).mockReset();
    (prisma.post.findMany as jest.Mock).mockReset().mockResolvedValue([]);
  });

  it.each(malformedIds)('rejects malformed ID %s before any database lookup', async (id) => {
    expect(await generateMetadata(props(id))).toEqual({});
    expect(prisma.post.findUnique).not.toHaveBeenCalled();
    await expect(PostDetailPage(props(id))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(notFound).toHaveBeenCalledTimes(1);
    expect(prisma.post.findUnique).not.toHaveBeenCalled();
    expect(prisma.post.findMany).not.toHaveBeenCalled();
  });

  it.each([null, { ...publishedPost, status: 'draft' }])(
    'preserves missing-post handling for %j',
    async (post) => {
      (prisma.post.findUnique as jest.Mock).mockResolvedValue(post);
      expect(await generateMetadata(props(validId))).toEqual({});
      await expect(PostDetailPage(props(validId))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
      expect(prisma.post.findMany).not.toHaveBeenCalled();
    },
  );

  it.each([validId, validId.toUpperCase()])('renders published post %s', async (id) => {
    (prisma.post.findUnique as jest.Mock).mockResolvedValue(publishedPost);
    expect(await generateMetadata(props(id))).toMatchObject({ title: publishedPost.title });
    expect((await PostDetailPage(props(id)))?.type).toBe('main');
    expect(prisma.post.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id } }));
    expect(prisma.post.findMany).toHaveBeenCalled();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('propagates genuine database failures from metadata and rendering', async () => {
    const failure = new Error('Database unavailable');
    (prisma.post.findUnique as jest.Mock).mockRejectedValue(failure);
    await expect(generateMetadata(props(validId))).rejects.toBe(failure);
    await expect(PostDetailPage(props(validId))).rejects.toBe(failure);
    expect(notFound).not.toHaveBeenCalled();
  });
});
