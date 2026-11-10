import type { Prisma, Post } from '@prisma/client';
import { postImageReferences } from './post-image-references';
import { managedObjectKey } from '@/shared/lib/storage';

export async function trackPostImages(transaction: Prisma.TransactionClient, post: Post) {
  const references = [...postImageReferences(post)];
  const paths = [...new Set([post.coverImagePath, ...references.map(managedObjectKey)])];
  await Promise.all(
    paths.map(async (path) => {
      if (!path || !/^posts\/(?:mcp\/)?[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|avif)$/.test(path))
        return;
      const url =
        references.find((value) => managedObjectKey(value) === path) ?? post.coverImageUrl ?? '';
      await transaction.mcpImagePreparation.upsert({
        where: { storagePath: path },
        create: {
          storagePath: path,
          url,
          mimeType: 'application/octet-stream',
          connectionId: 'panel-cleanup',
          state: 'attached',
          expiresAt: new Date(),
        },
        update: {},
      });
    }),
  );
}

/** Shared database lock for media attachment, panel writes, and object cleanup. */
export async function lockPostMedia(transaction: Prisma.TransactionClient) {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(13820261110::bigint)`;
}

export async function syncPostMedia(transaction: Prisma.TransactionClient, post: Post) {
  const references = [...postImageReferences(post)];
  const keys = references.map(managedObjectKey).filter((key): key is string => key !== null);
  const preparations = await transaction.mcpImagePreparation.findMany({
    where: { OR: [{ url: { in: references } }, { storagePath: { in: keys } }] },
  });
  if (
    keys.some(
      (key) =>
        key.startsWith('posts/mcp/') && !preparations.some((image) => image.storagePath === key),
    ) ||
    (post.coverImagePath?.startsWith('posts/mcp/') && !keys.includes(post.coverImagePath)) ||
    preparations.some(
      (image) =>
        image.state === 'deleting' ||
        image.state === 'uploading' ||
        (image.state === 'prepared' && image.expiresAt <= new Date()) ||
        (image.userId !== null && image.userId !== post.authorId),
    )
  )
    throw new Error('POST_MEDIA_UNAVAILABLE');
  await transaction.mcpImagePreparation.updateMany({
    where: { id: { in: preparations.map((image) => image.id) }, state: 'prepared' },
    data: { state: 'attached' },
  });
  await transaction.postMedia.deleteMany({
    where: { postId: post.id, url: { notIn: references } },
  });
  await Promise.all(
    preparations.map((image) =>
      transaction.postMedia.upsert({
        where: { postId_storagePath: { postId: post.id, storagePath: image.storagePath } },
        create: {
          postId: post.id,
          preparationId: image.id,
          storagePath: image.storagePath,
          url: image.url,
        },
        update: {},
      }),
    ),
  );
}
