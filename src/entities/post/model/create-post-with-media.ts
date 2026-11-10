import type { Prisma } from '@prisma/client';
import { syncPostMedia } from './post-media';

export async function createPostWithMedia(
  transaction: Prisma.TransactionClient,
  data: Prisma.PostUncheckedCreateInput,
) {
  const post = await transaction.post.create({ data });
  await syncPostMedia(transaction, post);
  return post;
}
