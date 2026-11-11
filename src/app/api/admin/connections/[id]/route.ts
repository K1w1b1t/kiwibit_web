import { deleteConnection } from '@/features/mcp-connections/model/connection-handlers';

export const runtime = 'nodejs';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return deleteConnection(request, (await params).id);
}
