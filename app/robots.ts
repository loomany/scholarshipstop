import type { MetadataRoute } from 'next';

import { getURL } from '@/utils/helpers';

export const ROBOTS_PRIVATE_ROUTE_DISALLOW = [
  '/api/',
  '/account/',
  '/dashboard/',
  '/onboarding/',
  '/subscription/success'
] as const;

export const ROBOTS_AI_CRAWLER_USER_AGENTS = [
  'OAI-SearchBot',
  'GPTBot',
  'ChatGPT-User',
  'OAI-AdsBot'
] as const;

const ROBOTS_PUBLIC_DISALLOW = [...ROBOTS_PRIVATE_ROUTE_DISALLOW] as const;

export default function robots(): MetadataRoute.Robots {
  const base = getURL().replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: [...ROBOTS_AI_CRAWLER_USER_AGENTS],
        allow: '/',
        disallow: [...ROBOTS_PUBLIC_DISALLOW]
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: [...ROBOTS_PUBLIC_DISALLOW]
      }
    ],
    sitemap: [
      `${base}/sitemap.xml`,
      `${base}/rss.xml`,
      `${base}/rss/resources.xml`,
      `${base}/rss/essays.xml`
    ]
  };
}
