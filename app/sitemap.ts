import type { MetadataRoute } from 'next';
import { buildSitemapBuckets } from '@/lib/seo/sitemaps';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const buckets = await buildSitemapBuckets();
  return [
    ...buckets.core,
    ...buckets.resources,
    ...buckets.categories,
    ...buckets.seo,
    ...buckets.scholarships
  ];
}
