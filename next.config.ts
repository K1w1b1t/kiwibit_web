import type { NextConfig } from 'next';

/**
 * Allows `next/image` to optimize objects from our OCI bucket, and only those.
 *
 * Two reasons this must stay narrow:
 *  - `hostname: '**'` would turn the Vercel image optimizer into an open proxy
 *    (arbitrary-origin fetches billed to us, plus SSRF-flavoured surface);
 *  - going through the optimizer is what keeps us inside the Always Free cap of
 *    50k Object Storage requests/month, since Vercel caches at the edge.
 *
 * The guarded fallback matters: a missing env var must not fail `npm run build`
 * locally or in CI.
 */
function ociImagePatterns(): NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> {
  const region = process.env.OCI_STORAGE_REGION;
  const namespace = process.env.OCI_STORAGE_NAMESPACE;
  const bucket = process.env.OCI_STORAGE_BUCKET;

  if (!region || !namespace || !bucket) return [];

  return [
    {
      protocol: 'https',
      hostname: `objectstorage.${region}.oraclecloud.com`,
      pathname: `/n/${namespace}/b/${bucket}/o/**`,
    },
  ];
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: ociImagePatterns(),
  },
};

export default nextConfig;
