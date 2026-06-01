import type { MetadataRoute } from 'next';

import { resourcesArticlePath } from '@/lib/content-hub/resourcesSection';
import { STATIC_SCHOLARSHIP_GUIDES } from '@/lib/resources/staticScholarshipGuides';
import { RESOURCE_GUIDE_SLUGS } from '@/lib/scholarships/resourceGuideRoutes';

const STATIC_SCHOLARSHIP_GUIDE_SLUGS = new Set(
  STATIC_SCHOLARSHIP_GUIDES.map((guide) => guide.slug.trim().toLowerCase())
);

/** Dedicated `/resources/[slug]` app routes not listed in `STATIC_SCHOLARSHIP_GUIDES`. */
export function buildDedicatedResourceGuideSitemapEntries(
  base: string
): MetadataRoute.Sitemap {
  return RESOURCE_GUIDE_SLUGS.filter(
    (slug) => !STATIC_SCHOLARSHIP_GUIDE_SLUGS.has(slug.toLowerCase())
  ).map((slug) => ({
    url: `${base}${resourcesArticlePath(slug)}`,
    lastModified: new Date('2026-05-16T00:00:00.000Z')
  }));
}
