import type { MetadataRoute } from 'next';
import { buildSitemapBuckets, getVisibleSeoRoutes } from '@/lib/seo/sitemaps';

/** Revalidate merged sitemap hourly so drip-feed visibility can advance with wall-clock hours. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  void getVisibleSeoRoutes();
  const buckets = await buildSitemapBuckets();
  return [
    ...buckets.core,
    ...buckets.resources,
    ...buckets.categories,
    ...buckets.seo,
    ...buckets.scholarships
  ];
}
