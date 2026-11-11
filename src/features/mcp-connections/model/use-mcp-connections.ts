'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/shared/api/api-client';
import type { McpConnectionStatus } from '@/entities/mcp-connection/model/mcp-connection';

export function useMcpConnections() {
  const [data, setData] = useState<McpConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    const result = await apiClient.get<McpConnectionStatus>('/api/admin/connections');
    if (current !== generation.current) return;
    if (result.ok) {
      setData(result.data);
      setError(false);
      setMessage('');
    } else {
      setError(true);
      setMessage(result.message);
    }
    setLoading(false);
    return result.ok;
  }, []);

  useEffect(() => {
    const onFocus = () => void refresh();
    onFocus();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  async function revoke(id?: string) {
    generation.current += 1;
    setRevoking(true);
    const result = await apiClient.delete(
      id ? `/api/admin/connections/${encodeURIComponent(id)}` : '/api/admin/connections',
    );
    if (result.ok) {
      if (await refresh())
        setMessage('Conexão revogada. Para autorizar novamente, siga o passo a passo.');
    } else {
      setError(true);
      setMessage(result.message);
    }
    setRevoking(false);
    return result.ok;
  }

  return { data, loading, revoking, message, error, refresh, revoke };
}
