import { classifyMcpClient } from '@/entities/mcp-connection/model/mcp-connection';
import type { McpConnection } from '@/entities/mcp-connection/model/mcp-connection';
import { getMcpDatabase } from '@/shared/lib/mcp-database';

type ConnectionRow = {
  id: string;
  clientId: string;
  name: string | null;
  createdAt: Date;
  expiresAt: Date;
};

async function hasConnectionTables() {
  const database = getMcpDatabase();
  const existing = await database.query<{ table: string | null }>(
    `SELECT to_regclass('mcp_oauth."oauthRefreshToken"')::text AS "table"`,
  );
  return Boolean(existing.rows[0]?.table);
}

export async function listMcpConnections(userId: string): Promise<McpConnection[]> {
  if (!(await hasConnectionTables())) return [];
  const { rows } = await getMcpDatabase().query<ConnectionRow>(
    `SELECT root.id, root."clientId", client.name, root."createdAt", root."expiresAt"
     FROM mcp_oauth."oauthRefreshToken" root
     JOIN mcp_oauth."oauthClient" client ON client."clientId" = root."clientId"
     WHERE root."userId" = $1 AND root."familyId" = root.id
       AND root."familyRevokedAt" IS NULL AND root."expiresAt" > NOW()
       AND EXISTS (
         SELECT 1 FROM mcp_oauth."oauthRefreshToken" active
         WHERE active."familyId" = root.id AND active.revoked IS NULL
           AND active."expiresAt" > NOW()
       )
     ORDER BY root."createdAt" DESC`,
    [userId],
  );
  return rows.map((row) => {
    let metadataOrigin: string | null = null;
    try {
      const url = new URL(row.clientId);
      if (url.protocol === 'https:' && !url.username && !url.password) metadataOrigin = url.origin;
    } catch {
      // Pre-registered clients need not use a URL as their identifier.
    }
    return {
      id: row.id,
      client: classifyMcpClient(row.clientId),
      name: row.name ?? 'Cliente MCP',
      metadataOrigin,
      connectedAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
    };
  });
}

/** Takes the same root row lock as provider refresh and replay handling. */
export async function revokeMcpConnection(userId: string, connectionId: string): Promise<boolean> {
  if (!(await hasConnectionTables())) return false;
  const client = await getMcpDatabase().connect();
  try {
    await client.query('BEGIN');
    const root = await client.query<{ id: string }>(
      `SELECT id FROM mcp_oauth."oauthRefreshToken"
       WHERE id = $1 AND "familyId" = id AND "userId" = $2 FOR UPDATE`,
      [connectionId, userId],
    );
    if (!root.rowCount) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query(
      `UPDATE mcp_oauth."oauthRefreshToken" SET "familyRevokedAt" = NOW() WHERE id = $1`,
      [connectionId],
    );
    await client.query(
      `UPDATE mcp_oauth."oauthAccessToken" SET revoked = NOW()
       WHERE "refreshId" IN (SELECT id FROM mcp_oauth."oauthRefreshToken" WHERE "familyId" = $1 AND "userId" = $2)`,
      [connectionId, userId],
    );
    await client.query(
      `UPDATE mcp_oauth."oauthRefreshToken" SET revoked = NOW() WHERE "familyId" = $1 AND "userId" = $2`,
      [connectionId, userId],
    );
    await client.query('COMMIT');
    return true;
  } catch {
    await client.query('ROLLBACK');
    throw new Error('MCP_REVOCATION_FAILED');
  } finally {
    client.release();
  }
}

export async function revokeAllMcpConnections(userId: string): Promise<number> {
  if (!(await hasConnectionTables())) return 0;
  const client = await getMcpDatabase().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM mcp_oauth."user" WHERE id = $1 FOR UPDATE', [userId]);
    const roots = await client.query<{ id: string }>(
      'SELECT id FROM mcp_oauth."oauthRefreshToken" WHERE "userId" = $1 AND "familyId" = id ORDER BY id FOR UPDATE',
      [userId],
    );
    await client.query(
      'UPDATE mcp_oauth."oauthRefreshToken" SET "familyRevokedAt" = NOW() WHERE "userId" = $1 AND "familyId" = id',
      [userId],
    );
    await client.query(
      'UPDATE mcp_oauth."oauthAccessToken" SET revoked = NOW() WHERE "userId" = $1',
      [userId],
    );
    await client.query(
      'UPDATE mcp_oauth."oauthRefreshToken" SET revoked = NOW() WHERE "userId" = $1',
      [userId],
    );
    await client.query('COMMIT');
    return roots.rowCount ?? 0;
  } catch {
    await client.query('ROLLBACK');
    throw new Error('MCP_REVOCATION_FAILED');
  } finally {
    client.release();
  }
}
