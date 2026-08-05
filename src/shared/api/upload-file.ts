'use client';

import type { UploadScope } from '@/shared/lib/validate-image-file';

export type UploadedImage = { url: string; path: string };

export type UploadResult = { ok: true; data: UploadedImage } | { ok: false; message: string };

/**
 * Uploads one image to `POST /api/admin/uploads`.
 *
 * Uses `fetch` with FormData rather than the JSON `apiClient`, and deliberately
 * does not set Content-Type — the browser must add the multipart boundary.
 */
export async function uploadImage(file: File, scope: UploadScope): Promise<UploadResult> {
  const body = new FormData();
  body.append('file', file);
  body.append('scope', scope);

  let response: Response;
  try {
    response = await fetch('/api/admin/uploads', { method: 'POST', body });
  } catch {
    return { ok: false, message: 'Erro de conexão durante o upload.' };
  }

  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
    data?: UploadedImage;
    error?: { message?: string };
  } | null;

  if (!response.ok || !payload?.data) {
    return { ok: false, message: payload?.error?.message ?? 'Falha no upload.' };
  }

  return { ok: true, data: payload.data };
}

/** Discards an uploaded object that was never attached to a row. */
export async function discardUpload(path: string): Promise<void> {
  try {
    await fetch(`/api/admin/uploads?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
  } catch {
    // Best effort: an orphaned object is harmless and gets reported server-side.
  }
}
