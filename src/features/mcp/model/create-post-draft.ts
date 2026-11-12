import type { McpImagePreparation } from '@prisma/client';
import type { z } from 'zod';
import { createHash } from 'node:crypto';
import { prisma } from '@/shared/lib/prisma';
import { getMcpSettings } from '@/shared/config/mcp';
import { managedStorageOrigins } from '@/shared/lib/storage';
import { normalizePostContent } from '@/entities/post/model/normalize-post-content';
import { parsePostTranslations } from '@/entities/post/model/post-translations';
import { postImageReferences } from '@/entities/post/model/post-image-references';
import { lockPostMedia } from '@/entities/post/model/post-media';
import { createPostWithMedia } from '@/entities/post/model/create-post-with-media';
import { takeMcpRateLimit } from '@/shared/lib/mcp-rate-limit';
import { createPostDraftSchema, McpToolError, type McpPrincipal } from './tool-schemas';
import { recordMcpSecurityOutcome } from '@/shared/lib/mcp-security';

function validateManagedImageUrls(usedUrls: ReadonlySet<string>, allowed: ReadonlySet<string>) {
  const origins = managedStorageOrigins();
  for (const url of usedUrls) {
    let origin: string;
    try {
      origin = new URL(url, getMcpSettings().origin).origin;
    } catch {
      throw new McpToolError('INVALID_IMAGE_REFERENCE');
    }
    if (origins.includes(origin) && !allowed.has(url))
      throw new McpToolError('FOREIGN_IMAGE_REFERENCE');
  }
}

function resolveDraftImages(
  input: z.infer<typeof createPostDraftSchema>,
  images: McpImagePreparation[],
) {
  const body: Record<string, unknown> = { ...input };
  for (const field of ['contentPt', 'contentEn'] as const) {
    let content = input[field];
    if (content === undefined) continue;
    for (const image of images) content = content.replaceAll(`mcp-image:${image.id}`, image.url);
    if (content.includes('mcp-image:')) throw new McpToolError('INVALID_IMAGE_REFERENCE');
    body[field] = content;
  }
  const normalized = normalizePostContent(body);
  const translated = parsePostTranslations(normalized.body);
  if (normalized.error || translated.error) throw new McpToolError('INVALID_DRAFT');
  const cover = images.find((image) => image.id === input.coverImageRef);
  const postData = {
    ...translated.data,
    linkedinIntroPt: input.linkedinIntroPt?.trim() || null,
    linkedinIntroEn: input.linkedinIntroEn?.trim() || null,
    contentFormat: input.contentFormat,
    coverImageUrl: cover?.url ?? null,
    coverImagePath: cover?.storagePath ?? null,
  };
  const usedUrls = postImageReferences(postData);
  validateManagedImageUrls(usedUrls, new Set(images.map((image) => image.url)));
  const consumed = images.filter((image) => usedUrls.has(image.url));
  return { postData, consumed };
}

export async function createPostDraft(principal: McpPrincipal, raw: unknown) {
  const parsed = createPostDraftSchema.safeParse(raw);
  if (!parsed.success) throw new McpToolError('INVALID_DRAFT');
  const input = parsed.data;
  const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const result = await prisma.$transaction(
    async (tx) => {
      await lockPostMedia(tx);
      const roots = await tx.$queryRaw<
        Array<{ id: string }>
      >`SELECT id FROM mcp_oauth."oauthRefreshToken" WHERE id = ${principal.connectionId} AND "familyId" = id AND "userId" = ${principal.userId} AND "familyRevokedAt" IS NULL AND "expiresAt" > NOW() FOR UPDATE`;
      if (!roots.length) throw new McpToolError('CONNECTION_REVOKED');
      const previous = await tx.mcpDraftRequest.findUnique({
        where: {
          connectionId_key: { connectionId: principal.connectionId, key: input.idempotencyKey },
        },
      });
      if (previous) {
        if (previous.requestHash !== requestHash || !previous.postId)
          throw new McpToolError('IDEMPOTENCY_CONFLICT');
        return { postId: previous.postId, created: false };
      }
      if (!(await takeMcpRateLimit('draft-user', principal.userId, 10, 3600, tx)).allowed)
        throw new McpToolError('RATE_LIMITED');
      const references = [
        ...new Set([...input.imageRefs, ...(input.coverImageRef ? [input.coverImageRef] : [])]),
      ];
      const images = await tx.mcpImagePreparation.findMany({
        where: {
          id: { in: references },
          userId: principal.userId,
          connectionId: principal.connectionId,
          state: 'prepared',
          expiresAt: { gt: new Date() },
        },
      });
      if (images.length !== references.length) throw new McpToolError('INVALID_IMAGE_REFERENCE');
      const { postData, consumed } = resolveDraftImages(input, images);
      const changed = await tx.mcpImagePreparation.updateMany({
        where: {
          id: { in: consumed.map((image) => image.id) },
          state: 'prepared',
          expiresAt: { gt: new Date() },
        },
        data: { state: 'attached' },
      });
      if (changed.count !== consumed.length) throw new McpToolError('INVALID_IMAGE_REFERENCE');
      const post = await createPostWithMedia(tx, {
        ...postData,
        authorId: principal.userId,
        status: 'draft',
        publishedAt: null,
      });
      await tx.mcpDraftRequest.create({
        data: {
          connectionId: principal.connectionId,
          key: input.idempotencyKey,
          requestHash,
          postId: post.id,
        },
      });
      return { postId: post.id, created: true };
    },
    { timeout: 15000 },
  );
  if (result.created) recordMcpSecurityOutcome('DRAFT_CREATED', principal);
  return {
    id: result.postId,
    status: 'draft',
    panelUrl: `${getMcpSettings().origin}/admin/posts/${result.postId}/edit`,
  };
}
