import { mcpDiscovery } from '@/features/mcp-auth/model/discovery';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return mcpDiscovery(request, (await params).path.join('/'));
}
