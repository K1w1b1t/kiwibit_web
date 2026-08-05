import https from 'node:https';
import { AwsClient } from 'aws4fetch';
import { reportServerError } from '@/shared/lib/discord';

/**
 * Object storage on OCI, through its S3-compatible endpoint.
 *
 * SERVER ONLY. `OCI_S3_SECRET_ACCESS_KEY` must never reach the browser, which is
 * why nothing here is prefixed `NEXT_PUBLIC_` and this module is imported solely
 * from route handlers.
 *
 * We sign requests with `aws4fetch` instead of pulling `@aws-sdk/client-s3`:
 * only PUT and DELETE of a single object are needed, and the repo already
 * prefers thin `fetch` wrappers (see `discord.ts`).
 */
type StorageConfig = {
  namespace: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function readConfig(): StorageConfig | null {
  const namespace = process.env.OCI_STORAGE_NAMESPACE;
  const bucket = process.env.OCI_STORAGE_BUCKET;
  const region = process.env.OCI_STORAGE_REGION;
  const accessKeyId = process.env.OCI_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.OCI_S3_SECRET_ACCESS_KEY;

  if (!namespace || !bucket || !region || !accessKeyId || !secretAccessKey) return null;

  return { namespace, bucket, region, accessKeyId, secretAccessKey };
}

/** True when the app has everything needed to talk to the bucket. */
export function isStorageConfigured(): boolean {
  return readConfig() !== null;
}

/** S3-compatible endpoint, used for writes. Path-style addressing. */
function writeUrl(config: StorageConfig, key: string): string {
  const host = `${config.namespace}.compat.objectstorage.${config.region}.oraclecloud.com`;
  return `https://${host}/${config.bucket}/${encodeURI(key)}`;
}

/**
 * Public read URL, served by the native Object Storage endpoint. Works without
 * credentials because the bucket is created with `access_type = ObjectRead`
 * (public objects, private listing).
 */
export function publicUrl(key: string): string {
  const config = readConfig();
  if (!config) return '';
  const { region, namespace, bucket } = config;
  return `https://objectstorage.${region}.oraclecloud.com/n/${namespace}/b/${bucket}/o/${encodeURI(key)}`;
}

/** Hostname that `next.config.ts` must allow for `next/image`. */
export function publicImageHost(): string | null {
  const region = process.env.OCI_STORAGE_REGION;
  return region ? `objectstorage.${region}.oraclecloud.com` : null;
}

function makeClient(config: StorageConfig): AwsClient {
  return new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: config.region,
    service: 's3',
  });
}

export type PutResult = { ok: true; url: string; key: string } | { ok: false; message: string };

/**
 * Sends a signed request with Node's own `https` module instead of `fetch`.
 *
 * Vercel's Node runtime wraps the global `fetch` in an instrumentation layer
 * that, for this route, drops the `Content-Length` header and streams the
 * body as chunked transfer encoding — which OCI's S3 endpoint rejects with
 * `411 Length Required`. This was reproducible only in that runtime, not
 * locally, since the wrapper is what's responsible for it. Going straight to
 * `https.request()` bypasses that layer entirely, so the `Content-Length` we
 * set below is the one that reaches the socket.
 */
function sendSigned(url: URL, method: string, headers: Headers, body: Uint8Array | null) {
  return new Promise<number>((resolve, reject) => {
    const headerObject: Record<string, string> = {};
    headers.forEach((value, name) => {
      headerObject[name] = value;
    });

    const req = https.request(url, { method, headers: headerObject }, (res) => {
      res.resume(); // Drain the response body; only the status matters here.
      res.on('end', () => resolve(res.statusCode ?? 0));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end(body ? Buffer.from(body.buffer, body.byteOffset, body.byteLength) : undefined);
  });
}

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<PutResult> {
  const config = readConfig();
  if (!config) return { ok: false, message: 'Storage is not configured.' };

  try {
    const signed = await makeClient(config).sign(writeUrl(config, key), {
      method: 'PUT',
      headers: {
        'content-type': contentType,
        'content-length': String(body.byteLength),
        // Uploaded objects are immutable: the key embeds a UUID, so a new file
        // is always a new key and can be cached hard.
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });

    const status = await sendSigned(new URL(signed.url), 'PUT', signed.headers, body);

    if (status < 200 || status >= 300) {
      return { ok: false, message: `Storage rejected the upload (${status}).` };
    }

    return { ok: true, url: publicUrl(key), key };
  } catch {
    return { ok: false, message: 'Could not reach the storage service.' };
  }
}

/**
 * Best-effort delete. Never throws and never fails a request: the DB row is the
 * source of truth, so an orphaned object is a few invisible KB, while a row
 * pointing at a 404 is user-facing breakage.
 *
 * Returns false when something was left behind, and reports it to the existing
 * Discord error channel so orphans are discoverable.
 */
export async function deleteObjects(keys: readonly string[]): Promise<boolean> {
  const usable = keys.filter((key) => key && key.trim() !== '');
  if (usable.length === 0) return true;

  const config = readConfig();
  if (!config) return false;

  const client = makeClient(config);
  let allOk = true;

  for (const key of usable) {
    try {
      const response = await client.fetch(writeUrl(config, key), { method: 'DELETE' });
      // 404 means it is already gone, which satisfies the intent.
      if (!response.ok && response.status !== 404) allOk = false;
    } catch {
      allOk = false;
    }
  }

  if (!allOk) {
    void reportServerError({
      source: 'storage.deleteObjects',
      code: 'ORPHANED_OBJECT',
      message: `Failed to delete storage object(s): ${usable.join(', ')}`,
    });
  }

  return allOk;
}
