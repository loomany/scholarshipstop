import type { MetadataRoute } from 'next';

import { getURL } from '@/utils/helpers';

export const ROBOTS_PRIVATE_ROUTE_DISALLOW = [
  '/api/',
  '/account/',
  '/dashboard/',
  '/onboarding/',
  '/subscription/success'
] as const;

export const ROBOTS_QUERY_DUPLICATE_DISALLOW = [
  '/*?*return_to=',
  '/*?*sort=',
  '/*?*page=',
  '/*?*limit=',
  '/*?*tab=',
  '/*?*scope=',
  '/*?*listScope=',
  '/*?*utm_',
  '/*?*gclid=',
  '/*?*fbclid=',
  '/*?*msclkid='
] as const;

export default function robots(): MetadataRoute.Robots {
  const base = getURL().replace(/\/$/, '');
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        ...ROBOTS_PRIVATE_ROUTE_DISALLOW,
        ...ROBOTS_QUERY_DUPLICATE_DISALLOW
      ]
    },
    sitemap: [
      `${base}/sitemap.xml`,
      `${base}/rss.xml`,
      `${base}/rss/resources.xml`,
      `${base}/rss/essays.xml`
    ]
  };
}
