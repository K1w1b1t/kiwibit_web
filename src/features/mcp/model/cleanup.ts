import { prisma } from '@/shared/lib/prisma';
import { getMcpDatabase } from '@/shared/lib/mcp-database';
import { deleteUnreferencedPostImage } from '@/entities/post/model/delete-unreferenced-image';

export async function cleanupMcp() {
  const deadline = Date.now() + 240000;
  const inspected = new Set<string>();
  let deleted = 0;
  while (Date.now() < deadline && inspected.size < 1000) {
    const candidates = await prisma.mcpImagePreparation.findMany({
      where: {
        storagePath: { notIn: [...inspected] },
        OR: [
          { state: { in: ['prepared', 'uploading'] }, expiresAt: { lt: new Date() } },
          { state: 'deleting' },
          { state: 'attached', media: { none: {} } },
        ],
      },
      take: 20,
      orderBy: { expiresAt: 'asc' },
      select: { storagePath: true },
    });
    if (!candidates.length) break;
    for (const image of candidates) {
      if (Date.now() >= deadline) break;
      inspected.add(image.storagePath);
      if (await deleteUnreferencedPostImage(image.storagePath)) deleted += 1;
    }
  }
  await prisma.mcpBrowserTransaction.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.mcpRateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await getMcpDatabase().query('DELETE FROM mcp_oauth.session WHERE "expiresAt" < NOW()');
  // Consumed refresh rows remain until their immutable family expiry.
  await getMcpDatabase().query(
    'DELETE FROM mcp_oauth."oauthAccessToken" WHERE "expiresAt" < NOW()',
  );
  await getMcpDatabase().query(
    'DELETE FROM mcp_oauth."oauthRefreshToken" consumed USING mcp_oauth."oauthRefreshToken" root WHERE root.id = consumed."familyId" AND root."familyId" = root.id AND root."expiresAt" < NOW()',
  );
  await getMcpDatabase().query(
    'DELETE FROM mcp_oauth."oauthRefreshToken" WHERE "familyId" IS NULL AND "expiresAt" < NOW()',
  );
  await getMcpDatabase().query('DELETE FROM mcp_oauth.verification WHERE "expiresAt" < NOW()');
  await getMcpDatabase().query(
    'DELETE FROM mcp_oauth."oauthClientAssertion" WHERE "expiresAt" < NOW()',
  );
  await getMcpDatabase().query('DELETE FROM mcp_oauth."rateLimit" WHERE "lastRequest" < $1', [
    Date.now() - 86400000,
  ]);
  return { inspected: inspected.size, deleted };
}
