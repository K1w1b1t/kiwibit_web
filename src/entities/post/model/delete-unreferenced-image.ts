import { prisma } from '@/shared/lib/prisma';
import { deleteObjects, managedObjectKey, publicUrl } from '@/shared/lib/storage';
import { postImageReferences } from '@/entities/post/model/post-image-references';
import { lockPostMedia } from '@/entities/post/model/post-media';
import { recordMcpSecurityOutcome } from '@/shared/lib/mcp-security';

/** Persist the deletion claim before storage I/O; attaching it then fails closed. */
export async function deleteUnreferencedPostImage(path: string) {
  if (!/^posts\/(?:mcp\/)?[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|avif)$/.test(path)) return false;
  try {
    const claimed = await prisma.$transaction(async (tx) => {
      await lockPostMedia(tx);
      const posts = await tx.post.findMany({
        select: {
          id: true,
          coverImagePath: true,
          coverImageUrl: true,
          content: true,
          contentPt: true,
          contentEn: true,
          contentFormat: true,
        },
      });
      const referenced = posts.filter(
        (post) =>
          post.coverImagePath === path ||
          [...postImageReferences(post)].some((url) => managedObjectKey(url) === path),
      );
      if (referenced.length) {
        const image = await tx.mcpImagePreparation.upsert({
          where: { storagePath: path },
          create: {
            storagePath: path,
            url: publicUrl(path),
            mimeType: 'application/octet-stream',
            connectionId: 'panel-cleanup',
            state: 'attached',
            expiresAt: new Date(),
          },
          update: { state: 'attached' },
        });
        for (const post of referenced)
          await tx.postMedia.upsert({
            where: { postId_storagePath: { postId: post.id, storagePath: path } },
            create: { postId: post.id, storagePath: path, url: image.url, preparationId: image.id },
            update: { preparationId: image.id },
          });
        return false;
      }
      const existing = await tx.mcpImagePreparation.findUnique({ where: { storagePath: path } });
      // A prepared/uploading image belongs to an uncompleted MCP operation.
      if (
        existing &&
        ['prepared', 'uploading'].includes(existing.state) &&
        existing.expiresAt > new Date()
      )
        return false;
      await tx.mcpImagePreparation.upsert({
        where: { storagePath: path },
        create: {
          storagePath: path,
          url: publicUrl(path),
          mimeType: 'application/octet-stream',
          connectionId: 'panel-cleanup',
          state: 'deleting',
          expiresAt: new Date(),
        },
        update: { state: 'deleting' },
      });
      return true;
    });
    if (!claimed || !(await deleteObjects([path]))) return false;
    await prisma.mcpImagePreparation.deleteMany({
      where: { storagePath: path, state: 'deleting' },
    });
    return true;
  } catch {
    recordMcpSecurityOutcome('CLEANUP_RETRY');
    return false;
  }
}
