import { NextResponse } from 'next/server';
import { requireAdminSession, apiError } from '@/shared/lib/api-helpers';
import { deleteObjects, isStorageConfigured, putObject } from '@/shared/lib/storage';
import {
  checkImageFile,
  extensionForType,
  isUploadScope,
  sniffImageType,
} from '@/shared/lib/validate-image-file';

/**
 * POST /api/admin/uploads — multipart image upload proxied to object storage.
 *
 * The only route in the app that reads `formData()`. The response gives back
 * both the public URL (stored on the row and rendered) and the bucket key
 * (stored so the object can be deleted later).
 */
export async function POST(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  if (!isStorageConfigured()) {
    return apiError('STORAGE_UNAVAILABLE', 'Storage is not configured on this environment.', 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError('BAD_REQUEST', 'Expected multipart/form-data.', 400);
  }

  const file = form.get('file');
  const scope = form.get('scope');

  if (!(file instanceof File)) {
    return apiError('BAD_REQUEST', 'file is required.', 400);
  }
  if (!isUploadScope(scope)) {
    return apiError('BAD_REQUEST', 'scope must be projects, posts or members.', 400);
  }

  const check = checkImageFile({ type: file.type, size: file.size });
  if (!check.valid) {
    return apiError('BAD_REQUEST', check.message, 400);
  }

  const buffer = new Uint8Array(await file.arrayBuffer());

  // The declared Content-Type is attacker-controlled; trust the bytes instead.
  const sniffed = sniffImageType(buffer);
  if (sniffed === null) {
    return apiError('BAD_REQUEST', 'O conteúdo do arquivo não é uma imagem suportada.', 400);
  }
  if (sniffed !== check.type) {
    return apiError('BAD_REQUEST', 'O tipo declarado não corresponde ao conteúdo do arquivo.', 400);
  }

  // Key embeds a UUID, so collisions are impossible and objects are immutable.
  const key = `${scope}/${crypto.randomUUID()}.${extensionForType(sniffed)}`;

  const result = await putObject(key, buffer, sniffed);
  if (!result.ok) {
    return apiError('STORAGE_ERROR', result.message, 502);
  }

  return NextResponse.json(
    { success: true, data: { url: result.url, path: result.key } },
    { status: 201 },
  );
}

/**
 * DELETE /api/admin/uploads?path=... — discards an object that was uploaded but
 * never attached to a row (the form was abandoned).
 */
export async function DELETE(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const path = new URL(request.url).searchParams.get('path');
  if (!path) {
    return apiError('BAD_REQUEST', 'path is required.', 400);
  }

  const scope = path.split('/')[0];
  // Without this, `path` could address any object in the bucket.
  if (!isUploadScope(scope) || path.includes('..')) {
    return apiError('BAD_REQUEST', 'path is outside the managed prefixes.', 400);
  }

  const ok = await deleteObjects([path]);
  // Reported to Discord by `deleteObjects`; the caller does not need to retry.
  return NextResponse.json({ success: ok });
}
