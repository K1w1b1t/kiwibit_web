import { randomUUID } from 'node:crypto';
import { prisma } from '@/shared/lib/prisma';
import { extensionForType, sniffImageType } from '@/shared/lib/validate-image-file';
import { putObject } from '@/shared/lib/storage';
import { takeMcpRateLimit } from '@/shared/lib/mcp-rate-limit';
import { preparePostImageSchema, McpToolError, type McpPrincipal } from './tool-schemas';
import { recordMcpSecurityOutcome } from '@/shared/lib/mcp-security';

export async function preparePostImage(principal: McpPrincipal, raw: unknown) {
  const parsed = preparePostImageSchema.safeParse(raw);
  if (!parsed.success) throw new McpToolError('INVALID_IMAGE');
  const { mimeType, bytesBase64 } = parsed.data;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(bytesBase64)) throw new McpToolError('INVALID_IMAGE');
  const bytes = Buffer.from(bytesBase64, 'base64');
  if (
    bytes.toString('base64') !== bytesBase64 ||
    !bytes.length ||
    bytes.length > 3 * 1024 * 1024 ||
    sniffImageType(bytes) !== mimeType
  )
    throw new McpToolError('INVALID_IMAGE');
  if (!(await takeMcpRateLimit('image-user', principal.userId, 30, 3600)).allowed)
    throw new McpToolError('RATE_LIMITED');
  const key = `posts/mcp/${randomUUID()}.${extensionForType(mimeType)}`;
  const preparation = await prisma.mcpImagePreparation.create({
    data: {
      userId: principal.userId,
      connectionId: principal.connectionId,
      storagePath: key,
      url: '',
      mimeType,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    },
  });
  const upload = await putObject(key, bytes, mimeType);
  if (!upload.ok) throw new McpToolError('STORAGE_UNAVAILABLE');
  await prisma.$transaction(async (tx) => {
    const roots = await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM mcp_oauth."oauthRefreshToken" WHERE id = ${principal.connectionId} AND "familyRevokedAt" IS NULL AND "userId" = ${principal.userId} AND "expiresAt" > NOW() FOR UPDATE`;
    if (!roots.length) throw new McpToolError('CONNECTION_REVOKED');
    await tx.mcpImagePreparation.update({
      where: { id: preparation.id },
      data: { state: 'prepared', url: upload.url },
    });
  });
  recordMcpSecurityOutcome('IMAGE_PREPARED', principal);
  return {
    reference: preparation.id,
    url: upload.url,
    placeholder: `mcp-image:${preparation.id}`,
    expiresAt: preparation.expiresAt.toISOString(),
  };
}
