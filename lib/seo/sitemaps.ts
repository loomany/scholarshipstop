import { cache } from 'react';
import type { MetadataRoute } from 'next';

import { fetchAllPublishedContentPostsForSitemap } from '@/lib/content-hub/contentPostsServer';
import { fetchAllPublishedEssaySitemapRows } from '@/lib/essays/essaysServer';
import { essayHubArticlePath } from '@/lib/essays/essayHubSection';
import { resourcesArticlePath } from '@/lib/content-hub/resourcesSection';
import { createPublicClient } from '@/utils/supabase/public';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import type { Database } from '@/types_db';
import { SCHOLARSHIP_CATEGORY_ORDER } from '@/app/scholarships/scholarshipCategories';
import { getLongTailSitemapSlugs } from '@/app/scholarships/scholarshipLongTailPresets';
import { scholarshipPublicPath } from '@/app/scholarships/scholarshipsData';
import { SEO_ROUTE_STATE_CODE_TO_SLUG } from '@/lib/scholarships/seoTags/routeSegmentMaps';
import { getPromotedSeoCategorySlugs } from '@/lib/scholarships/categorySeoAllowlist';
import {
  canonicalPathAllowedInSeoSitemap,
  getVisibleSeoRoutes as getVisibleSeoRoutesFromDrip
} from '@/lib/seo/seoDripFeed';
import {
  getAllIndexableSeoManifestPathsForSitemap,
  getSeoManifestRoute,
  manifestEntryMeetsSitemapGrantThreshold
} from '@/lib/scholarships/seoScholarshipResolve';
import { getURL } from '@/utils/helpers';
import { tabToHubPath } from '@/app/scholarships/scholarshipHubPath';
import { allScholarshipCountrySeoRoutes } from '@/app/scholarships/scholarshipCountrySeo';

export { isSeoDripFeedActive } from '@/lib/seo/seoDripFeed';

type SitemapBucket =
  | 'core'
  | 'resources'
  | 'essays'
  | 'providers'
  | 'categories'
  | 'seo'
  | 'scholarships'
  | 'compare';

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

/** Google allows at most 50,000 URLs per sitemap file. */
export const SITEMAP_MAX_URLS_PER_FILE = 50_000;

/** Page size for Supabase `.range()` pagination (not a cap on total rows). */
export const SITEMAP_DB_PAGE_SIZE = 1000;

const IQ_SEO_BASE_URL = 'https://iq.scholarshiptop.com';
const IQ_SEO_SITEMAP_PATHS = [
  '/',
  '/scholarship-match',
  '/provider-research',
  '/college-fit',
  '/essay-prep',
  '/deadline-strategy',
  '/about',
  '/help',
  '/privacy-policy',
  '/terms',
  '/refund-policy',
  '/faq'
] as const;

/**
 * @deprecated Use {@link SITEMAP_DB_PAGE_SIZE} (DB batching) or {@link SITEMAP_MAX_URLS_PER_FILE} (XML chunking).
 */
export const SCHOLARSHIP_SITEMAP_CHUNK_SIZE = SITEMAP_DB_PAGE_SIZE;

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

type SitemapSlugMode = 'single-or-indexed' | 'always-indexed';

/** Split URL lists into multiple documents if needed (≤ {@link SITEMAP_MAX_URLS_PER_FILE} each). */
function buildDocumentsForBucket(
  bucket: SitemapBucket,
  slugBase: string,
  entries: MetadataRoute.Sitemap,
  slugMode: SitemapSlugMode
): SitemapDocument[] {
  const chunks = chunkSitemapEntries(entries, SITEMAP_MAX_URLS_PER_FILE);
  return chunks.map((chunk, index) => {
    const slug =
      slugMode === 'always-indexed'
        ? `${slugBase}-${index}`
        : chunks.length === 1
          ? slugBase
          : `${slugBase}-${index}`;
    return makeSitemapDocument(bucket, slug, chunk);
  });
}

type StateGrantCountRow = { state_code: string; grant_count: number };

type SeoGenerationSitemapRow = {
  canonical_path: string;
  updated_at: string;
};

type CompareSitemapRow = {
  slug: string;
  updated_at: string;
};

type UniversityHubSitemapRow = {
  state_slug: string;
  university_slug: string;
  updated_at: string;
};

function createSitemapReadClient() {
  return createServiceRoleSupabaseClient() ?? createPublicClient();
}

/** Published `/compare/universities/[slug]` pages. */
async function fetchCompareSitemapRows(): Promise<CompareSitemapRow[]> {
  const supabase = createSitemapReadClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('compare_pages_sitemap_rows', {});
  if (error) {
    console.error('[sitemap] compare_pages_sitemap_rows failed:', error);
    return [];
  }
  return (data ?? []) as CompareSitemapRow[];
}

/** Published `/compare/states/[slug]` pages. */
async function fetchStateCompareSitemapRows(): Promise<CompareSitemapRow[]> {
  const supabase = createSitemapReadClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('state_compare_pages_sitemap_rows', {});
  if (error) {
    console.error('[sitemap] state_compare_pages_sitemap_rows failed:', error);
    return [];
  }
  return (data ?? []) as CompareSitemapRow[];
}

/** `/scholarships/{state}/{university}` hubs backed by `provider_hub_listing` + `states` + `providers`. */
async function fetchUniversityHubSitemapRows(): Promise<UniversityHubSitemapRow[]> {
  const supabase = createSitemapReadClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('university_hub_sitemap_rows', {});
  if (error) {
    console.error('[sitemap] university_hub_sitemap_rows failed:', error);
    return [];
  }
  return (data ?? []) as UniversityHubSitemapRow[];
}

/** Programmatic hub URLs completed via `seo_generation_queue` (grant_count &gt; min). */
async function fetchSeoGenerationSitemapRows(
  minGrants = 3
): Promise<SeoGenerationSitemapRow[]> {
  const supabase = createSitemapReadClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('seo_generation_sitemap_paths', {
    p_min_grants: minGrants
  });
  if (error) {
    console.error('[sitemap] seo_generation_sitemap_paths failed:', error);
    return [];
  }
  return (data ?? []) as SeoGenerationSitemapRow[];
}

/** States with &gt;3 active grants (RPC); used alongside manifest SEO URLs. */
async function fetchStateGrantSitemapRows(): Promise<StateGrantCountRow[]> {
  const supabase = createSitemapReadClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc(
    'scholarship_active_counts_by_state_code'
  );
  if (error) {
    console.error(
      '[sitemap] scholarship_active_counts_by_state_code failed:',
      error
    );
    return [];
  }
  return (data ?? []) as StateGrantCountRow[];
}

async function fetchScholarshipSitemapEntries(
  base: string
): Promise<MetadataRoute.Sitemap> {
  const supabase = createSitemapReadClient();
  if (!supabase) return [];
  const out: MetadataRoute.Sitemap = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select('id, slug, updated_at, is_indexable')
      .eq('is_active', true)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + SITEMAP_DB_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as ScholarshipSitemapRow[];
    for (const row of batch) {
      if (row.is_indexable === false) continue;
      out.push({
        url: `${base}${scholarshipPublicPath(row)}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date()
      });
    }
    if (batch.length < SITEMAP_DB_PAGE_SIZE) break;
    offset += SITEMAP_DB_PAGE_SIZE;
  }

  return out;
}

async function fetchProviderSitemapEntries(
  base: string
): Promise<MetadataRoute.Sitemap> {
  const supabase = createSitemapReadClient();
  if (!supabase) return [];
  const rows: ProviderSitemapRow[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('providers')
      .select('slug, updated_at, created_at')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + SITEMAP_DB_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as ProviderSitemapRow[];
    rows.push(...batch);
    if (batch.length < SITEMAP_DB_PAGE_SIZE) break;
    offset += SITEMAP_DB_PAGE_SIZE;
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
    ...IQ_SEO_SITEMAP_PATHS.map((path) => ({
      url: `${IQ_SEO_BASE_URL}${path === '/' ? '' : path}`,
      lastModified: new Date()
    })),
    { url: `${base}/scholarships`, lastModified: new Date() },
    { url: `${base}/compare`, lastModified: new Date() },
    { url: `${base}/compare/universities`, lastModified: new Date() },
    { url: `${base}/compare/states`, lastModified: new Date() },
    { url: `${base}/resources`, lastModified: new Date() },
    { url: `${base}/essays`, lastModified: new Date() },
    { url: `${base}/providers`, lastModified: new Date() },
    ...Object.values(SEO_ROUTE_STATE_CODE_TO_SLUG).map((stateSlug) => ({
      url: `${base}/providers/${stateSlug}`,
      lastModified: new Date()
    })),
    { url: `${base}${tabToHubPath('matches')}`, lastModified: new Date() },
    { url: `${base}${tabToHubPath('easy-apply')}`, lastModified: new Date() },
    {
      url: `${base}${tabToHubPath('international-friendly')}`,
      lastModified: new Date()
    },
    { url: `${base}${tabToHubPath('hot-deadlines')}`, lastModified: new Date() }
  ];

  const resourcePosts = await fetchAllPublishedContentPostsForSitemap();
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

  const manifestSeoPaths = getAllIndexableSeoManifestPathsForSitemap(3).filter(
    (p) => canonicalPathAllowedInSeoSitemap(p)
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
      if (manifestEntry) {
        if (!manifestEntryMeetsSitemapGrantThreshold(manifestEntry, 3))
          return false;
        if (manifestPathSet.has(slug)) return false;
        return manifestEntry.indexable === true;
      }
      return true;
    })
    .map((slug) => ({
      url: `${base}/scholarships/${slug}`,
      lastModified: new Date()
    }));

  const stateGrantRows = await fetchStateGrantSitemapRows().catch(() => []);
  const stateListingPages: MetadataRoute.Sitemap = [];
  for (const row of stateGrantRows) {
    const slug = SEO_ROUTE_STATE_CODE_TO_SLUG[row.state_code.toUpperCase()];
    if (!slug) continue;
    stateListingPages.push({
      url: `${base}/scholarships/${slug}`,
      lastModified: new Date()
    });
  }

  const generatedHubRows = await fetchSeoGenerationSitemapRows(3).catch(
    () => []
  );
  const programmaticHubPages: MetadataRoute.Sitemap = generatedHubRows
    .filter((row) => canonicalPathAllowedInSeoSitemap(row.canonical_path))
    .map((row) => ({
      url: `${base}/scholarships/${row.canonical_path}`,
      lastModified: row.updated_at ? new Date(row.updated_at) : new Date()
    }));

  const universityHubRows = await fetchUniversityHubSitemapRows().catch(
    () => []
  );
  const universityHubPages: MetadataRoute.Sitemap = universityHubRows
    .filter((row) => {
      const state = row.state_slug?.trim().toLowerCase();
      const uni = row.university_slug?.trim().toLowerCase();
      if (!state || !uni) return false;
      return canonicalPathAllowedInSeoSitemap(`${state}/${uni}`);
    })
    .map((row) => {
      const state = row.state_slug.trim().toLowerCase();
      const uni = row.university_slug.trim().toLowerCase();
      return {
        url: `${base}/scholarships/${encodeURIComponent(state)}/${encodeURIComponent(uni)}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date()
      };
    });

  const countrySeoPages: MetadataRoute.Sitemap = allScholarshipCountrySeoRoutes()
    .filter((route) => canonicalPathAllowedInSeoSitemap(route.canonicalPath))
    .map((route) => ({
      url: `${base}${route.href}`,
      lastModified: new Date()
    }));

  const seo = dedupeSitemapEntries([
    ...manifestSeoPages,
    ...longTailPages,
    ...stateListingPages,
    ...programmaticHubPages,
    ...universityHubPages,
    ...countrySeoPages
  ]);

  const [scholarships, providers, compareRows, stateCompareRows] = await Promise.all([
    fetchScholarshipSitemapEntries(base).catch((err) => {
      console.error('[sitemap] fetchScholarshipSitemapEntries failed:', err);
      return [];
    }),
    fetchProviderSitemapEntries(base).catch((err) => {
      console.error('[sitemap] fetchProviderSitemapEntries failed:', err);
      return [];
    }),
    fetchCompareSitemapRows().catch((err) => {
      console.error('[sitemap] fetchCompareSitemapRows failed:', err);
      return [];
    }),
    fetchStateCompareSitemapRows().catch((err) => {
      console.error('[sitemap] fetchStateCompareSitemapRows failed:', err);
      return [];
    })
  ]);

  const compare: MetadataRoute.Sitemap = [
    ...compareRows
      .filter((row) => Boolean(row.slug?.trim()))
      .map((row) => ({
        url: `${base}/compare/universities/${encodeURIComponent(row.slug.trim())}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date()
      })),
    ...stateCompareRows
      .filter((row) => Boolean(row.slug?.trim()))
      .map((row) => ({
        url: `${base}/compare/states/${encodeURIComponent(row.slug.trim())}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date()
      }))
  ];

  return {
    core: dedupeSitemapEntries(core),
    resources: dedupeSitemapEntries(resources),
    essays: dedupeSitemapEntries(essays),
    providers: dedupeSitemapEntries(providers),
    categories: dedupeSitemapEntries(categories),
    seo,
    scholarships: dedupeSitemapEntries(scholarships),
    compare: dedupeSitemapEntries(compare)
  };
});

export const buildSitemapDocuments = cache(async (): Promise<SitemapDocument[]> => {
  void getVisibleSeoRoutes();
  const buckets = await buildSitemapBuckets();

  return [
    ...buildDocumentsForBucket('core', 'core', buckets.core, 'single-or-indexed'),
    ...buildDocumentsForBucket(
      'resources',
      'resources',
      buckets.resources,
      'single-or-indexed'
    ),
    ...buildDocumentsForBucket('essays', 'essays', buckets.essays, 'single-or-indexed'),
    ...buildDocumentsForBucket(
      'providers',
      'providers',
      buckets.providers,
      'single-or-indexed'
    ),
    ...buildDocumentsForBucket(
      'categories',
      'categories',
      buckets.categories,
      'single-or-indexed'
    ),
    ...buildDocumentsForBucket('seo', 'seo', buckets.seo, 'single-or-indexed'),
    ...buildDocumentsForBucket(
      'scholarships',
      'scholarships',
      buckets.scholarships,
      'always-indexed'
    ),
    ...buildDocumentsForBucket(
      'compare',
      'compare',
      buckets.compare,
      'single-or-indexed'
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

