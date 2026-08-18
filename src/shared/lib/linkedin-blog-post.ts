import { prisma } from '@/shared/lib/prisma';
import {
  triggerLinkedInAutoPostForBlog,
  type LinkedInAutoPostResult,
  type LinkedInBlogPost,
} from '@/shared/lib/linkedin';

/**
 * Bridges a freshly published blog post to the LinkedIn auto-post fan-out
 * (issue #81). Kept out of `linkedin.ts` so that module stays Prisma-free and
 * easy to unit-test; this is the thin layer that reads the author's connection
 * and reacts to the result.
 *
 * The personal profile posts from the POST AUTHOR's own connection: the author's
 * `User` links to a `Member`, which owns the `LinkedinConnection`. When the
 * stored token turns out to be expired, the opt-in is switched off so it stops
 * retrying until the member reconnects (the failure itself is already reported
 * to Discord inside the fan-out).
 *
 * Always called inside `runAfterResponse` — it must never throw into the request.
 */
export async function publishBlogPostToLinkedIn(
  post: LinkedInBlogPost & { authorId: string },
): Promise<LinkedInAutoPostResult[]> {
  const member = await prisma.member.findUnique({
    where: { userId: post.authorId },
    select: {
      id: true,
      linkedinConnection: {
        select: {
          linkedinSub: true,
          scope: true,
          autoPostEnabled: true,
          accessTokenEnc: true,
          accessTokenExpiry: true,
        },
      },
    },
  });

  const connection = member?.linkedinConnection ?? null;
  const results = await triggerLinkedInAutoPostForBlog(post, connection);

  // Disable the opt-in on an expired personal token so it stops trying until the
  // member reconnects with a fresh one.
  const personal = results.find((result) => result.target === 'personal');
  if (member && connection?.autoPostEnabled && personal?.expired) {
    await prisma.linkedinConnection
      .update({ where: { memberId: member.id }, data: { autoPostEnabled: false } })
      .catch(() => undefined);
  }

  return results;
}
