import type { MetadataRoute } from 'next';

import { RESOURCE_GUIDE_SLUGS } from '@/lib/scholarships/resourceGuideRoutes';
import { SCHOLARSHIP_CATEGORY_ORDER } from '@/app/scholarships/scholarshipCategories';
import { getLongTailSitemapSlugs } from '@/app/scholarships/scholarshipLongTailPresets';
import { getPromotedSeoCategorySlugs } from '@/lib/scholarships/categorySeoAllowlist';
import {
  getAllIndexableSeoManifestPaths,
  getSeoManifestRoute
} from '@/lib/scholarships/seoScholarshipResolve';
import { scholarshipPublicPath } from '@/app/scholarships/scholarshipsData';
import { fetchActiveScholarships } from '@/lib/scholarships/supabase';

type SitemapBucket =
  | 'core'
  | 'resources'
  | 'categories'
  | 'seo'
  | 'scholarships';

export type SitemapBuckets = Record<SitemapBucket, MetadataRoute.Sitemap>;

function dedupeSitemapEntries(
  entries: MetadataRoute.Sitemap
): MetadataRoute.Sitemap {
  const byUrl = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const entry of entries) {
    const prev = byUrl.get(entry.url);
    if (!prev) {
      byUrl.set(entry.url, entry);
      continue;
    }
    const prevTs =
      prev.lastModified instanceof Date
        ? prev.lastModified.getTime()
        : new Date(prev.lastModified ?? 0).getTime();
    const nextTs =
      entry.lastModified instanceof Date
        ? entry.lastModified.getTime()
        : new Date(entry.lastModified ?? 0).getTime();
    if (nextTs >= prevTs) {
      byUrl.set(entry.url, entry);
    }
  }
  return Array.from(byUrl.values());
}

export function sitemapBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://scholarshiptop.com';
}

export async function buildSitemapBuckets(): Promise<SitemapBuckets> {
  const base = sitemapBaseUrl();

  const core: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/scholarships`, lastModified: new Date() },
    { url: `${base}/resources`, lastModified: new Date() }
  ];

  const resources: MetadataRoute.Sitemap = RESOURCE_GUIDE_SLUGS.map((slug) => ({
    url: `${base}/resources/${slug}`,
    lastModified: new Date()
  }));

  const promotedCategorySlugs = new Set(getPromotedSeoCategorySlugs());
  const categories: MetadataRoute.Sitemap = SCHOLARSHIP_CATEGORY_ORDER.filter((id) =>
    promotedCategorySlugs.has(id)
  ).map((id) => ({
    url: `${base}/scholarships/category/${id}`,
    lastModified: new Date()
  }));

  const manifestSeoPaths = getAllIndexableSeoManifestPaths();
  const manifestPathSet = new Set(manifestSeoPaths);
  const manifestSeoPages: MetadataRoute.Sitemap = manifestSeoPaths.map((path) => ({
    url: `${base}/scholarships/${path}`,
    lastModified: new Date()
  }));

  const longTailPages: MetadataRoute.Sitemap = getLongTailSitemapSlugs()
    .filter((slug) => {
      const manifestEntry = getSeoManifestRoute(slug);
      if (!manifestEntry) return true;
      if (manifestPathSet.has(slug)) return false;
      return manifestEntry.indexable === true;
    })
    .map((slug) => ({
      url: `${base}/scholarships/${slug}`,
      lastModified: new Date()
    }));

  const seo = dedupeSitemapEntries([...manifestSeoPages, ...longTailPages]);

  let scholarships: MetadataRoute.Sitemap = [];
  try {
    const list = await fetchActiveScholarships();
    scholarships = list
      .filter((s) => s.isIndexable !== false)
      .map((s) => ({
        url: `${base}${scholarshipPublicPath(s)}`,
        lastModified: s.updatedAt ? new Date(s.updatedAt) : new Date()
      }));
  } catch {
    scholarships = [];
  }

  return {
    core: dedupeSitemapEntries(core),
    resources: dedupeSitemapEntries(resources),
    categories: dedupeSitemapEntries(categories),
    seo,
    scholarships: dedupeSitemapEntries(scholarships)
  };
}
