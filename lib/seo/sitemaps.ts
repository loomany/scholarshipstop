import { cache } from 'react';
import type { MetadataRoute } from 'next';

import { fetchAllPublishedContentPostsListFields } from '@/lib/content-hub/contentPostsServer';
import { fetchAllPublishedEssaySitemapRows } from '@/lib/essays/essaysServer';
import { essayHubArticlePath } from '@/lib/essays/essayHubSection';
import { resourcesArticlePath } from '@/lib/content-hub/resourcesSection';
import { createPublicClient } from '@/utils/supabase/public';
import type { Database } from '@/types_db';
import { SCHOLARSHIP_CATEGORY_ORDER } from '@/app/scholarships/scholarshipCategories';
import { getLongTailSitemapSlugs } from '@/app/scholarships/scholarshipLongTailPresets';
import { scholarshipPublicPath } from '@/app/scholarships/scholarshipsData';
import { getPromotedSeoCategorySlugs } from '@/lib/scholarships/categorySeoAllowlist';
import {
  canonicalPathAllowedInSeoSitemap,
  getVisibleSeoRoutes as getVisibleSeoRoutesFromDrip
} from '@/lib/seo/seoDripFeed';
import {
  getAllIndexableSeoManifestPaths,
  getSeoManifestRoute
} from '@/lib/scholarships/seoScholarshipResolve';
import { getURL } from '@/utils/helpers';

export { isSeoDripFeedActive } from '@/lib/seo/seoDripFeed';

type SitemapBucket =
  | 'core'
  | 'resources'
  | 'essays'
  | 'providers'
  | 'categories'
  | 'seo'
  | 'scholarships';

type ScholarshipSitemapRow = Pick<
  Database['public']['Tables']['scholarships']['Row'],
  'id' | 'slug' | 'updated_at' | 'is_indexable'
>;

type ProviderSitemapRow = Pick<
  Database['public']['Tables']['providers']['Row'],
  'slug' | 'updated_at' | 'created_at'
>;

export type SitemapBuckets = Record<SitemapBucket, MetadataRoute.Sitemap>;
export type SitemapDocument = {
  slug: string;
  path: string;
  bucket: SitemapBucket;
  lastModified: string;
  entries: MetadataRoute.Sitemap;
};

export const SITEMAP_REVALIDATE_SECONDS = 3600;
export const SCHOLARSHIP_SITEMAP_CHUNK_SIZE = 1000;

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

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function normalizeEntryDate(value: Date | string | null | undefined): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function latestLastModified(entries: MetadataRoute.Sitemap): string {
  if (entries.length === 0) return new Date().toISOString();
  const latest = entries.reduce((max, entry) => {
    const next = normalizeEntryDate(entry.lastModified);
    return next.getTime() > max.getTime() ? next : max;
  }, normalizeEntryDate(entries[0]?.lastModified));
  return latest.toISOString();
}

function chunkSitemapEntries(
  entries: MetadataRoute.Sitemap,
  chunkSize: number
): MetadataRoute.Sitemap[] {
  if (entries.length === 0) return [[]];
  const chunks: MetadataRoute.Sitemap[] = [];
  for (let i = 0; i < entries.length; i += chunkSize) {
    chunks.push(entries.slice(i, i + chunkSize));
  }
  return chunks;
}

function buildSitemapDocumentPath(slug: string): string {
  return `/sitemaps/${slug}.xml`;
}

function makeSitemapDocument(
  bucket: SitemapBucket,
  slug: string,
  entries: MetadataRoute.Sitemap
): SitemapDocument {
  const deduped = dedupeSitemapEntries(entries);
  return {
    slug,
    path: buildSitemapDocumentPath(slug),
    bucket,
    lastModified: latestLastModified(deduped),
    entries: deduped
  };
}

async function fetchScholarshipSitemapEntries(
  base: string
): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();
  const rows: ScholarshipSitemapRow[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select('id, slug, updated_at, is_indexable')
      .eq('is_active', true)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + SCHOLARSHIP_SITEMAP_CHUNK_SIZE - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as ScholarshipSitemapRow[];
    rows.push(...batch);
    if (batch.length < SCHOLARSHIP_SITEMAP_CHUNK_SIZE) break;
    offset += SCHOLARSHIP_SITEMAP_CHUNK_SIZE;
  }

  return rows
    .filter((row) => row.is_indexable !== false)
    .map((row) => ({
      url: `${base}${scholarshipPublicPath(row)}`,
      lastModified: row.updated_at ? new Date(row.updated_at) : new Date()
    }));
}

async function fetchProviderSitemapEntries(
  base: string
): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();
  const rows: ProviderSitemapRow[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('providers')
      .select('slug, updated_at, created_at')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + SCHOLARSHIP_SITEMAP_CHUNK_SIZE - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as ProviderSitemapRow[];
    rows.push(...batch);
    if (batch.length < SCHOLARSHIP_SITEMAP_CHUNK_SIZE) break;
    offset += SCHOLARSHIP_SITEMAP_CHUNK_SIZE;
  }

  return rows
    .filter((row) => Boolean(row.slug?.trim()))
    .map((row) => ({
      url: `${base}/providers/${encodeURIComponent(row.slug.trim())}`,
      lastModified: row.updated_at || row.created_at
    }));
}

export function sitemapBaseUrl(): string {
  return getURL().replace(/\/$/, '');
}

/**
 * Drip-feed SEO: canonical listing paths (under `/scholarships/`) allowed this hour when drip is on.
 * Empty when drip is off (`SEO_DRIP_ENABLED=false`, or start/rate unset) — callers treat that as “no drip gating”.
 */
export function getVisibleSeoRoutes(): string[] {
  return getVisibleSeoRoutesFromDrip();
}

/**
 * SEO listing URLs use {@link canonicalPathAllowedInSeoSitemap}, which matches the drip window when active
 * ({@link getVisibleSeoRoutes} / `SEO_DRIP_START_DATE` + `SEO_PAGES_PER_HOUR`; disabled via `SEO_DRIP_ENABLED=false`).
 * Sitemap builders call `getVisibleSeoRoutes()` so the drip module runs on each sitemap build.
 */
export const buildSitemapBuckets = cache(async (): Promise<SitemapBuckets> => {
  const base = sitemapBaseUrl();

  const core: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/scholarships`, lastModified: new Date() },
    { url: `${base}/resources`, lastModified: new Date() },
    { url: `${base}/essays`, lastModified: new Date() },
    { url: `${base}/providers`, lastModified: new Date() }
  ];

  const resourcePosts = await fetchAllPublishedContentPostsListFields();
  const resources: MetadataRoute.Sitemap = resourcePosts
    .filter((post) => Boolean(post.slug?.trim()))
    .map((post) => ({
      url: `${base}${resourcesArticlePath(post.slug!.trim())}`,
      lastModified: post.published_at || new Date()
    }));

  const essayRows = await fetchAllPublishedEssaySitemapRows().catch(() => []);
  const essays: MetadataRoute.Sitemap = essayRows
    .filter((row) => Boolean(row.slug?.trim()))
    .map((row) => ({
      url: `${base}${essayHubArticlePath(row.slug.trim())}`,
      lastModified: row.updated_at ? new Date(row.updated_at) : new Date()
    }));

  const promotedCategorySlugs = new Set(getPromotedSeoCategorySlugs());
  const categories: MetadataRoute.Sitemap = SCHOLARSHIP_CATEGORY_ORDER.filter((id) =>
    promotedCategorySlugs.has(id)
  ).map((id) => ({
    url: `${base}/scholarships/category/${id}`,
    lastModified: new Date()
  }));

  const manifestSeoPaths = getAllIndexableSeoManifestPaths().filter((p) =>
    canonicalPathAllowedInSeoSitemap(p)
  );
  const manifestPathSet = new Set(manifestSeoPaths);
  const manifestSeoPages: MetadataRoute.Sitemap = manifestSeoPaths.map((path) => ({
    url: `${base}/scholarships/${path}`,
    lastModified: new Date()
  }));

  const longTailPages: MetadataRoute.Sitemap = getLongTailSitemapSlugs()
    .filter((slug) => {
      if (!canonicalPathAllowedInSeoSitemap(slug)) return false;
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

  const [scholarships, providers] = await Promise.all([
    fetchScholarshipSitemapEntries(base).catch(() => []),
    fetchProviderSitemapEntries(base).catch(() => [])
  ]);

  return {
    core: dedupeSitemapEntries(core),
    resources: dedupeSitemapEntries(resources),
    essays: dedupeSitemapEntries(essays),
    providers: dedupeSitemapEntries(providers),
    categories: dedupeSitemapEntries(categories),
    seo,
    scholarships: dedupeSitemapEntries(scholarships)
  };
});

export const buildSitemapDocuments = cache(async (): Promise<SitemapDocument[]> => {
  void getVisibleSeoRoutes();
  const buckets = await buildSitemapBuckets();
  const scholarshipChunks = chunkSitemapEntries(
    buckets.scholarships,
    SCHOLARSHIP_SITEMAP_CHUNK_SIZE
  );

  return [
    makeSitemapDocument('core', 'core', buckets.core),
    makeSitemapDocument('resources', 'resources', buckets.resources),
    makeSitemapDocument('essays', 'essays', buckets.essays),
    makeSitemapDocument('providers', 'providers', buckets.providers),
    makeSitemapDocument('categories', 'categories', buckets.categories),
    makeSitemapDocument('seo', 'seo', buckets.seo),
    ...scholarshipChunks.map((entries, index) =>
      makeSitemapDocument('scholarships', `scholarships-${index}`, entries)
    )
  ];
});

export const getSitemapDocumentBySlug = cache(
  async (slug: string): Promise<SitemapDocument | null> => {
    const docs = await buildSitemapDocuments();
    return docs.find((doc) => doc.slug === slug) ?? null;
  }
);

export function renderSitemapIndexXml(documents: SitemapDocument[]): string {
  const base = sitemapBaseUrl();
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...documents.map(
      (doc) =>
        `<sitemap><loc>${escapeXml(
          `${base}${doc.path}`
        )}</loc><lastmod>${doc.lastModified}</lastmod></sitemap>`
    ),
    '</sitemapindex>'
  ].join('');
}

export function renderSitemapUrlSetXml(entries: MetadataRoute.Sitemap): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) => {
      const lastModified = normalizeEntryDate(entry.lastModified).toISOString();
      return `<url><loc>${escapeXml(
        entry.url
      )}</loc><lastmod>${lastModified}</lastmod></url>`;
    }),
    '</urlset>'
  ].join('');
}

