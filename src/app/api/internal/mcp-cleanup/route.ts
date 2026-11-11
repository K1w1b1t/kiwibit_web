import { constantTimeEqual } from '@/shared/lib/constant-time-equal';
import { cleanupMcp } from '@/features/mcp/model/cleanup';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret ?? ''}`;
  if (!secret || secret.length < 32 || !constantTimeEqual(actual, expected))
    return new Response(null, { status: 401 });
  try {
    return Response.json(await cleanupMcp());
  } catch {
    return Response.json(
      { error: { code: 'CLEANUP_UNAVAILABLE', message: 'Cleanup will retry on the next run.' } },
      { status: 503 },
    );
  }
}
