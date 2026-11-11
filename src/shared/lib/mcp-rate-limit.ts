import { createHash } from 'node:crypto';
import { getMcpDatabase } from '@/shared/lib/mcp-database';
import type { Prisma } from '@prisma/client';

export async function takeMcpRateLimit(
  category: string,
  subject: string,
  maximum: number,
  seconds: number,
  transaction?: Prisma.TransactionClient,
) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const key = createHash('sha256').update(`${category}:${subject}:${bucket}`).digest('hex');
  const expiry = new Date((bucket + 1) * seconds * 1000);
  if (transaction) {
    const rows = await transaction.$queryRaw<
      Array<{ count: number }>
    >`INSERT INTO mcp_rate_limits (key, count, expires_at) VALUES (${key}, 1, ${expiry}) ON CONFLICT (key) DO UPDATE SET count = mcp_rate_limits.count + 1 WHERE mcp_rate_limits.count < ${maximum} RETURNING count`;
    return {
      allowed: rows.length === 1,
      retryAfter: Math.max(1, Math.ceil((expiry.getTime() - Date.now()) / 1000)),
    };
  }
  const result = await getMcpDatabase().query(
    `INSERT INTO mcp_rate_limits (key, count, expires_at) VALUES ($1, 1, $2)
     ON CONFLICT (key) DO UPDATE SET count = mcp_rate_limits.count + 1
     WHERE mcp_rate_limits.count < $3 RETURNING count`,
    [key, expiry, maximum],
  );
  return {
    allowed: result.rowCount === 1,
    retryAfter: Math.max(1, Math.ceil((expiry.getTime() - Date.now()) / 1000)),
  };
}

export function mcpRequestIp(request: Request) {
  // Only Vercel's ingress owns this header; arbitrary client headers are untrusted.
  const address = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for') : null;
  return (address ?? 'local').split(',')[0].trim().slice(0, 128);
}
