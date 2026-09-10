import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/shared/lib/seo';
import { isSearchIndexingEnabled } from '@/shared/lib/search-indexing';

export default function robots(): MetadataRoute.Robots {
  const robotsWithoutDiscovery: MetadataRoute.Robots = {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/login'],
    },
  };

  if (!isSearchIndexingEnabled()) {
    return robotsWithoutDiscovery;
  }

  return {
    ...robotsWithoutDiscovery,
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
