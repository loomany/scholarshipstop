import type { MetadataRoute } from 'next';

import { canonicalPathAllowedInSeoSitemap } from '@/lib/seo/seoDripFeed';
import { listCrossCountrySitemapEntries } from '@/lib/scholarships/seoCrossCountryManifest';

/** Cross-country manifest URLs for the SEO sitemap bucket (drip-gated by canonical path). */
export function buildCrossCountrySeoSitemapEntries(base: string): MetadataRoute.Sitemap {
  return listCrossCountrySitemapEntries()
    .filter((entry) => canonicalPathAllowedInSeoSitemap(entry.canonicalPath))
    .map((entry) => ({
      url: `${base}${entry.href}`,
      lastModified: new Date()
    }));
}
