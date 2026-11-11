import { requirePanelSession } from '@/shared/lib/api-helpers';
import { prisma } from '@/shared/lib/prisma';
import { PANEL_ROLES } from '@/shared/lib/roles';
import {
  listMcpConnections,
  revokeMcpConnection,
  revokeAllMcpConnections,
} from './connection-store';
import { recordMcpSecurityOutcome } from '@/shared/lib/mcp-security';

function error(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

function isSameOrigin(request: Request) {
  try {
    const origin = new URL(process.env.MCP_CANONICAL_ORIGIN ?? request.url).origin;
    return request.headers.get('origin') === origin;
  } catch {
    return false;
  }
}

async function currentUser() {
  const guard = await requirePanelSession();
  if (!guard.session) return { user: null, response: guard.response };
  const user = await prisma.user.findUnique({
    where: { id: guard.session.user.id },
    select: { id: true, role: true },
  });
  if (!user || !PANEL_ROLES.has(user.role))
    return { user: null, response: error('FORBIDDEN', 'Acesso não permitido.', 403) };
  return { user, response: null };
}

export async function getConnections() {
  const { user, response } = await currentUser();
  if (!user) return response;
  try {
    return Response.json(
      {
        enabled: process.env.MCP_ENABLED === 'true',
        connections: await listMcpConnections(user.id),
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return error(
      'MCP_UNAVAILABLE',
      'Não foi possível consultar as conexões. Tente novamente.',
      503,
    );
  }
}

export async function deleteConnection(request: Request, id: string) {
  const { user, response } = await currentUser();
  if (!user) return response;
  if (!isSameOrigin(request)) return error('FORBIDDEN', 'Origem da solicitação inválida.', 403);
  if (id.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(id))
    return error('BAD_REQUEST', 'Conexão inválida.', 400);
  // Revocation remains available even when creation is disabled in the environment.
  try {
    if (!(await revokeMcpConnection(user.id, id)))
      return error('NOT_FOUND', 'Conexão não encontrada.', 404);
    recordMcpSecurityOutcome('CONNECTION_REVOKED', { userId: user.id, connectionId: id });
    return Response.json({ success: true });
  } catch {
    return error('MCP_UNAVAILABLE', 'Não foi possível revogar a conexão. Tente novamente.', 503);
  }
}

export async function deleteAllConnections(request: Request) {
  const { user, response } = await currentUser();
  if (!user) return response;
  if (!isSameOrigin(request)) return error('FORBIDDEN', 'Origem da solicitação inválida.', 403);
  try {
    const revoked = await revokeAllMcpConnections(user.id);
    recordMcpSecurityOutcome('ALL_CONNECTIONS_REVOKED', { userId: user.id });
    return Response.json({ success: true, revoked });
  } catch {
    return error('MCP_UNAVAILABLE', 'Não foi possível revogar as conexões.', 503);
  }
}
