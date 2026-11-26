import type { Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import {
  composeLinkedInBlogPost,
  scopeAllowsAutoPost,
  triggerPersonalAutoPost,
  type LinkedInAutoPostResult,
} from '@/shared/lib/linkedin';
import { DEFAULT_LINKEDIN_BLOG_HASHTAGS } from '@/shared/lib/linkedin-commentary';
import { composeLinkedInReview } from './linkedin-review';

const siteBase = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.kiwibit.com.br';
const personalTarget = 'personal';
const personalDeliveries = { where: { target: personalTarget } };

async function lockReview(tx: Prisma.TransactionClient, postId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${postId}, 144))`;
  await tx.$queryRaw`SELECT id FROM posts WHERE id = ${postId}::uuid FOR UPDATE`;
}

async function connectionFor(authorId: string | null) {
  if (!authorId) return null;
  const member = await prisma.member.findUnique({
    where: { userId: authorId },
    select: { id: true, linkedinConnection: true },
  });
  return member;
}

function personalOwner(connection: Awaited<ReturnType<typeof connectionFor>>) {
  const value = connection?.linkedinConnection;
  return value?.autoPostEnabled &&
    value.linkedinPersonId &&
    scopeAllowsAutoPost(value.scope) &&
    value.accessTokenExpiry.getTime() > Date.now()
    ? `urn:li:person:${value.linkedinPersonId}`
    : null;
}

export async function hasLinkedInPublicationProfile(authorId: string | null): Promise<boolean> {
  return Boolean(personalOwner(await connectionFor(authorId)));
}

export async function getLinkedInReview(postId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.status !== 'published') return null;
  const [review, member] = await Promise.all([
    prisma.linkedinBlogReview.findUnique({
      where: { postId },
      include: { deliveries: personalDeliveries },
    }),
    connectionFor(post.authorId),
  ]);
  const suggestion = composeLinkedInBlogPost(post, siteBase());
  return {
    text: review?.text ?? suggestion?.commentary ?? '',
    suggestedText: suggestion?.commentary ?? '',
    hashtags: review?.hashtags ?? DEFAULT_LINKEDIN_BLOG_HASHTAGS,
    version: review?.version ?? 0,
    postUpdatedAt: post.updatedAt.toISOString(),
    stale: review ? review.postUpdatedAt.getTime() !== post.updatedAt.getTime() : false,
    coverImageUrl: post.coverImageUrl,
    coverImageAlt:
      post.coverImageAltPt || post.coverImageAlt || post.coverImageAltEn || 'Capa do artigo',
    destinations: { personal: Boolean(personalOwner(member)) },
    deliveries: (review?.deliveries ?? []).map(({ target, status, errorCode, updatedAt }) => ({
      target,
      status:
        status === 'sending' && Date.now() - updatedAt.getTime() > 120000 ? 'unknown' : status,
      errorCode,
    })),
  };
}

export type LinkedInReview = NonNullable<Awaited<ReturnType<typeof getLinkedInReview>>>;

export async function saveLinkedInReview(
  postId: string,
  version: number,
  text: string,
  hashtags: string,
  postUpdatedAt: string,
) {
  const composed = composeLinkedInReview(text, hashtags);
  return prisma.$transaction(async (tx) => {
    await lockReview(tx, postId);
    const post = await tx.post.findUnique({ where: { id: postId } });
    if (!post || post.status !== 'published')
      return { error: 'Post publicado não encontrado.', status: 404 } as const;
    if (post.updatedAt.toISOString() !== postUpdatedAt)
      return {
        error: 'O artigo mudou. Reabra a revisão e confira a capa e o texto.',
        status: 409,
      } as const;
    const existing = await tx.linkedinBlogReview.findUnique({
      where: { postId },
      include: { deliveries: personalDeliveries },
    });
    if ((existing?.version ?? 0) !== version)
      return {
        error: 'A revisão foi alterada em outra sessão. Atualize a página.',
        status: 409,
      } as const;
    if (
      existing?.deliveries.some((item) => item.status === 'sending' || item.status === 'unknown')
    ) {
      return { error: 'Há um envio em andamento ou com resultado incerto.', status: 409 } as const;
    }
    const review = await tx.linkedinBlogReview.upsert({
      where: { postId },
      create: {
        postId,
        text,
        hashtags: composed.valid ? composed.hashtags : hashtags,
        postUpdatedAt: post.updatedAt,
      },
      update: {
        text,
        hashtags: composed.valid ? composed.hashtags : hashtags,
        postUpdatedAt: post.updatedAt,
        version: { increment: 1 },
      },
    });
    return { version: review.version } as const;
  });
}

export async function confirmLinkedInReview(
  postId: string,
  version: number,
  acknowledged: boolean,
) {
  if (!acknowledged)
    return {
      error: 'Confirme que verificou possíveis publicações anteriores.',
      status: 400,
    } as const;
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.status !== 'published')
    return { error: 'Post publicado não encontrado.', status: 404 } as const;
  const member = await connectionFor(post.authorId);
  const connection = member?.linkedinConnection;
  if (
    member &&
    connection?.autoPostEnabled &&
    (!connection.linkedinPersonId || connection.accessTokenExpiry.getTime() <= Date.now())
  ) {
    await prisma.linkedinConnection.updateMany({
      where: { memberId: member.id, accessTokenEnc: connection.accessTokenEnc },
      data: { autoPostEnabled: false },
    });
  }
  const owner = personalOwner(member);
  const claimed = await prisma.$transaction(async (tx) => {
    await lockReview(tx, postId);
    const currentPost = await tx.post.findUnique({ where: { id: postId } });
    const review = await tx.linkedinBlogReview.findUnique({
      where: { postId },
      include: { deliveries: personalDeliveries },
    });
    if (
      !currentPost ||
      currentPost.status !== 'published' ||
      !review ||
      review.version !== version ||
      currentPost.updatedAt.getTime() !== review.postUpdatedAt.getTime()
    ) {
      return {
        error: 'O post ou a revisão mudou. Atualize e confirme novamente.',
        status: 409,
      } as const;
    }
    const composed = composeLinkedInReview(review.text, review.hashtags);
    const base = composeLinkedInBlogPost(currentPost, siteBase());
    if (!composed.valid || !base)
      return { error: 'Texto inválido para publicação.', status: 400 } as const;
    if (review.deliveries.some((item) => item.status === 'sending' || item.status === 'unknown')) {
      return { error: 'Há um envio em andamento ou com resultado incerto.', status: 409 } as const;
    }
    if (review.deliveries.some((item) => item.status === 'succeeded'))
      return { error: 'A publicação já foi enviada ao perfil do autor.', status: 409 } as const;
    if (!owner)
      return { error: 'O perfil do autor está indisponível para envio.', status: 409 } as const;

    const snapshot = {
      ownerUrn: owner,
      version,
      status: 'sending',
      phase: 'preparing',
      snapshotText: composed.text,
      snapshotImageUrl: currentPost.coverImageUrl,
    } as const;
    await tx.linkedinBlogDelivery.upsert({
      where: { postId_target: { postId, target: personalTarget } },
      create: { postId, target: personalTarget, ...snapshot },
      update: { ...snapshot, errorCode: null },
    });
    return { owner, input: { ...base, commentary: composed.text } } as const;
  });
  if ('error' in claimed) return claimed;

  let result: LinkedInAutoPostResult;
  try {
    const latestMember = await connectionFor(post.authorId);
    const latestConnection = latestMember?.linkedinConnection;
    if (!latestConnection || personalOwner(latestMember) !== claimed.owner) {
      result = { ok: false, code: 'LINKEDIN_DESTINATION_CHANGED' };
    } else {
      result = await triggerPersonalAutoPost(latestConnection, claimed.input);
      if ((result.expired || result.reconnectRequired) && latestConnection.autoPostEnabled) {
        await prisma.linkedinConnection.updateMany({
          where: { memberId: latestMember.id, accessTokenEnc: latestConnection.accessTokenEnc },
          data: { autoPostEnabled: false },
        });
      }
    }
  } catch {
    result = { ok: false, uncertain: true, code: 'LINKEDIN_RESULT_UNKNOWN' };
  }
  await prisma.linkedinBlogDelivery.updateMany({
    where: { postId, target: personalTarget, status: 'sending', version },
    data: {
      status: result.ok && result.sent ? 'succeeded' : result.uncertain ? 'unknown' : 'failed',
      phase: 'finished',
      errorCode: result.code ?? null,
      postUrn: result.postUrn ?? null,
      imageUrn: result.imageUrn ?? null,
    },
  });
  return { review: await getLinkedInReview(postId) } as const;
}
