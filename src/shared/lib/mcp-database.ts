import { Pool } from 'pg';

let pool: Pool | undefined;

/** Provider data is isolated in the mcp_oauth PostgreSQL schema. */
export function getMcpDatabase() {
  if (!process.env.DATABASE_URL) throw new Error('MCP_DATABASE_UNAVAILABLE');
  const url = new URL(process.env.DATABASE_URL);
  const sslmode = url.searchParams.get('sslmode');
  const requiresSsl = sslmode !== null && sslmode !== 'disable';
  if (requiresSsl) url.searchParams.delete('sslmode');
  pool ??= new Pool({
    connectionString: url.toString(),
    max: 5,
    ssl: requiresSsl
      ? {
          rejectUnauthorized: true,
          ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA } : {}),
        }
      : undefined,
  });
  return pool;
}
