import { lookup } from 'node:dns/promises';
import https from 'node:https';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';
import sharp from 'sharp';
import { MAX_IMAGE_BYTES, sniffImageType } from '@/shared/lib/validate-image-file';

const MAX_PIXELS = 36_152_319;
const VERSION = '202610';

/** Resolve once and connect to that address to prevent DNS rebinding and redirects. */
async function downloadCover(rawUrl: string): Promise<Buffer> {
  const url = new URL(rawUrl);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443')
  ) {
    throw new Error('LINKEDIN_IMAGE_URL_INVALID');
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) => {
      try {
        return ipaddr.process(address).range() !== 'unicast';
      } catch {
        return true;
      }
    })
  ) {
    throw new Error('LINKEDIN_IMAGE_URL_INVALID');
  }
  const selected = addresses[0];
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: selected.address,
        family: selected.family,
        servername: hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'GET',
        headers: { host: url.host },
      },
      (res) => {
        if (
          res.statusCode !== 200 ||
          Number(res.headers['content-length'] ?? 0) > MAX_IMAGE_BYTES
        ) {
          res.resume();
          reject(new Error('LINKEDIN_IMAGE_DOWNLOAD_FAILED'));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_IMAGE_BYTES) {
            res.destroy(new Error('LINKEDIN_IMAGE_TOO_LARGE'));
          } else chunks.push(chunk);
        });
        res.on('error', reject);
        res.on('end', () => resolve(Buffer.concat(chunks)));
      },
    );
    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy(new Error('LINKEDIN_IMAGE_DOWNLOAD_TIMEOUT')));
    req.end();
  });
}

export async function prepareLinkedInCover(url: string): Promise<Buffer> {
  const bytes = await downloadCover(url);
  const type = sniffImageType(bytes);
  if (!type || !bytes.length) throw new Error('LINKEDIN_IMAGE_FORMAT_INVALID');
  const image = sharp(bytes, { limitInputPixels: MAX_PIXELS, failOn: 'error' });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_PIXELS) {
    throw new Error('LINKEDIN_IMAGE_DIMENSIONS_INVALID');
  }
  return type === 'image/jpeg' || type === 'image/png' ? bytes : image.jpeg().toBuffer();
}

function trustedUploadUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('LINKEDIN_IMAGE_INITIALIZE_FAILED');
  const parsed = new URL(value);
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    (parsed.port && parsed.port !== '443') ||
    !(parsed.hostname === 'linkedin.com' || parsed.hostname.endsWith('.linkedin.com'))
  ) {
    throw new Error('LINKEDIN_IMAGE_INITIALIZE_FAILED');
  }
  return value;
}

export async function uploadLinkedInCover(
  token: string,
  owner: string,
  company: boolean,
  bytes: Buffer,
): Promise<string> {
  const response = await fetch(
    company
      ? 'https://api.linkedin.com/rest/images?action=initializeUpload'
      : 'https://api.linkedin.com/v2/assets?action=registerUpload',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        ...(company && { 'Linkedin-Version': VERSION }),
      },
      body: JSON.stringify(
        company
          ? { initializeUploadRequest: { owner } }
          : {
              registerUploadRequest: {
                recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                owner,
                supportedUploadMechanism: ['SYNCHRONOUS_UPLOAD'],
                serviceRelationships: [
                  { relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' },
                ],
              },
            },
      ),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok)
    throw new Error(
      response.status === 401 ? 'LINKEDIN_TOKEN_EXPIRED' : 'LINKEDIN_IMAGE_INITIALIZE_FAILED',
    );
  const json: unknown = await response.json();
  if (!json || typeof json !== 'object' || !('value' in json))
    throw new Error('LINKEDIN_IMAGE_INITIALIZE_FAILED');
  const value = (json as { value: Record<string, unknown> }).value;
  const mechanism = value.uploadMechanism as Record<string, { uploadUrl?: unknown }> | undefined;
  const uploadUrl = trustedUploadUrl(
    company
      ? value.uploadUrl
      : mechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl,
  );
  const urn = company ? value.image : value.asset;
  if (
    typeof urn !== 'string' ||
    !urn.startsWith(company ? 'urn:li:image:' : 'urn:li:digitalmediaAsset:')
  ) {
    throw new Error('LINKEDIN_IMAGE_INITIALIZE_FAILED');
  }
  const uploaded = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
    body: new Uint8Array(bytes),
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  if (!uploaded.ok)
    throw new Error(
      uploaded.status === 401 ? 'LINKEDIN_TOKEN_EXPIRED' : 'LINKEDIN_IMAGE_UPLOAD_FAILED',
    );
  if (company) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const status = await fetch(
        `https://api.linkedin.com/rest/images/${encodeURIComponent(urn)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Linkedin-Version': VERSION,
          },
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!status.ok) {
        throw new Error(
          status.status === 401 ? 'LINKEDIN_TOKEN_EXPIRED' : 'LINKEDIN_IMAGE_STATUS_FAILED',
        );
      }
      const image = (await status.json()) as { status?: unknown };
      if (image.status === 'AVAILABLE') return urn;
      if (image.status !== 'PROCESSING' && image.status !== 'WAITING_UPLOAD') {
        throw new Error('LINKEDIN_IMAGE_PROCESSING_FAILED');
      }
      if (attempt < 7) await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error('LINKEDIN_IMAGE_PROCESSING_TIMEOUT');
  }
  return urn;
}
