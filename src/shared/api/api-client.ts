'use client';

/**
 * Typed transport for the `/api/admin/*` routes.
 *
 * It exists because the API's response shapes are not uniform:
 *   - list:        `{ items, page, limit, total }`  (no envelope)
 *   - GET one:     the raw record
 *   - POST / PUT:  `{ success: true, data }`
 *   - DELETE:      `{ success: true }`
 *   - any error:   `{ error: { code, message } }`
 *
 * Callers get one shape back instead of re-deriving that in every form.
 *
 * Lives in `shared/api` rather than `shared/lib` on purpose: `shared/lib` is
 * inside the 70% coverage globs, and browser transport code is awkward to cover
 * there.
 */
export type ApiErrorBody = {
  error?: { code?: string; message?: string };
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; message: string };

const NETWORK_ERROR = 'Erro de conexão. Tente novamente.';
const UNKNOWN_ERROR = 'Não foi possível concluir a operação.';

function unwrap<T>(payload: unknown): T {
  // POST/PUT wrap the record in `{ success, data }`; GET returns it raw.
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

async function request<T>(
  path: string,
  init: RequestInit & { method: string },
): Promise<ApiResult<T>> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch {
    return { ok: false, status: 0, code: 'NETWORK', message: NETWORK_ERROR };
  }

  // 204 and empty bodies are valid successes.
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const body = (payload ?? {}) as ApiErrorBody;
    return {
      ok: false,
      status: response.status,
      code: body.error?.code ?? 'UNKNOWN',
      message: body.error?.message ?? UNKNOWN_ERROR,
    };
  }

  return { ok: true, data: unwrap<T>(payload) };
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
