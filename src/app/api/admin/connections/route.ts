import {
  getConnections,
  deleteAllConnections,
} from '@/features/mcp-connections/model/connection-handlers';

export const runtime = 'nodejs';
export const GET = getConnections;
export const DELETE = deleteAllConnections;
