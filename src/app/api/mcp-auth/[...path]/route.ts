import { handleMcpOAuth } from '@/features/mcp-auth/model/oauth-handler';

export const runtime = 'nodejs';
export const GET = handleMcpOAuth;
export const POST = handleMcpOAuth;
