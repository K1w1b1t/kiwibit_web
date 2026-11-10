import { prisma } from '@/shared/lib/prisma';
import { deleteObjects } from '@/shared/lib/storage';
import { deleteUnreferencedPostImage } from './delete-unreferenced-image';

jest.mock('@/shared/lib/storage', () => ({
  deleteObjects: jest.fn(),
  publicUrl: (path: string) => `https://media.example/${path}`,
  managedObjectKey: (url: string) =>
    url.startsWith('https://media.example/') ? url.slice('https://media.example/'.length) : null,
}));
const database = prisma as unknown as typeof import('@/shared/test-utils/prisma.mock').prisma;
const path = 'posts/mcp/synthetic.png';
const image = { id: 'preparation', url: `https://media.example/${path}` };

beforeEach(() => {
  database.post.findMany.mockResolvedValue([]);
  database.mcpImagePreparation.findUnique.mockResolvedValue(null);
  database.mcpImagePreparation.upsert.mockResolvedValue(image);
  jest.mocked(deleteObjects).mockResolvedValue(true);
});

it('retains the committed deletion claim after a storage failure and retries it', async () => {
  jest.mocked(deleteObjects).mockResolvedValueOnce(false);
  expect(await deleteUnreferencedPostImage(path)).toBe(false);
  expect(database.mcpImagePreparation.upsert).toHaveBeenCalledWith(
    expect.objectContaining({ update: { state: 'deleting' } }),
  );
  expect(database.mcpImagePreparation.deleteMany).not.toHaveBeenCalled();
  expect(await deleteUnreferencedPostImage(path)).toBe(true);
  expect(database.mcpImagePreparation.deleteMany).toHaveBeenCalledWith({
    where: { storagePath: path, state: 'deleting' },
  });
});

it('repairs legacy media relations and preserves an image used only by the English translation', async () => {
  database.post.findMany.mockResolvedValue([
    {
      id: 'post',
      contentFormat: 'html',
      content: '<p>Body</p>',
      contentEn: `<img src="${image.url}">`,
    },
  ]);
  expect(await deleteUnreferencedPostImage(path)).toBe(false);
  expect(deleteObjects).not.toHaveBeenCalled();
  expect(database.postMedia.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      create: expect.objectContaining({ postId: 'post', preparationId: image.id }),
    }),
  );
});

it('protects unexpired preparations and never deletes arbitrary storage paths', async () => {
  database.mcpImagePreparation.findUnique.mockResolvedValue({
    state: 'prepared',
    expiresAt: new Date(Date.now() + 60000),
  });
  expect(await deleteUnreferencedPostImage(path)).toBe(false);
  expect(await deleteUnreferencedPostImage('team/private.png')).toBe(false);
  expect(deleteObjects).not.toHaveBeenCalled();
});
