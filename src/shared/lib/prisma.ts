import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

/**
 * Builds a pg Pool that works against Supabase.
 *
 * Supabase's pooler serves a self-signed certificate. Recent `pg` versions treat
 * `sslmode=require` (in the connection string) as `verify-full`, which rejects it.
 * We strip `sslmode` from the URL and configure SSL explicitly instead:
 * - If `DATABASE_SSL_CA` is set, verify the chain against that CA (secure).
 * - Otherwise keep the connection encrypted but skip CA verification.
 */
function createPool(): Pool {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    return new Pool();
  }

  const url = new URL(rawUrl);
  const sslmode = url.searchParams.get('sslmode');
  const requiresSsl = sslmode !== null && sslmode !== 'disable';
  if (requiresSsl) {
    url.searchParams.delete('sslmode');
  }

  const ca = process.env.DATABASE_SSL_CA;

  return new Pool({
    connectionString: url.toString(),
    ssl: requiresSsl
      ? ca
        ? { ca, rejectUnauthorized: true }
        : { rejectUnauthorized: false }
      : undefined,
  });
}

const pool = globalForPrisma.pool ?? createPool();

const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
