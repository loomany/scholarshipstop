import type { MetadataRoute } from 'next';

import { getURL } from '@/utils/helpers';

export default function robots(): MetadataRoute.Robots {
  const base = getURL().replace(/\/$/, '');
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/']
    },
    sitemap: [`${base}/sitemap.xml`, `${base}/sitemap`]
  };
}
