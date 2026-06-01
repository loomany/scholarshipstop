import { cache } from 'react';
import type { MetadataRoute } from 'next';

import { fetchAllPublishedContentPostsForSitemap } from '@/lib/content-hub/contentPostsServer';
import { STATIC_SCHOLARSHIP_GUIDES } from '@/lib/resources/staticScholarshipGuides';
import { buildDedicatedResourceGuideSitemapEntries } from '@/lib/seo/dedicatedResourceGuideSitemap';
import { STATIC_ESSAY_GUIDES } from '@/lib/essays/staticEssayGuides';
import { STATIC_COMPARE_GUIDES } from '@/lib/compare/staticCompareGuides';
import {
  countPublishedEssaySitemapRows,
  fetchAllPublishedEssaySitemapRows,
  fetchPublishedEssaySitemapRowsRange,
  type EssaySitemapRow
} from '@/lib/essays/essaysServer';
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
import { buildCrossCountrySeoSitemapEntries } from '@/lib/seo/crossCountrySitemapEntries';
import { isCompareHubSeoGenerationCanonicalPath } from '@/lib/seo/sitemapProgrammaticHubPath';
import { getProviderSeoQualityPolicy } from '@/lib/seo/providerSeoQualityPolicy';
import {
  getCompareSeoQualityPolicy,
  MIN_DYNAMIC_COMPARE_VISIBLE_WORDS,
  MIN_LOCALIZED_COMPARE_VISIBLE_WORDS
} from '@/lib/seo/compareSeoQualityPolicy';
import {
  getEssaySeoQualityPolicy,
  MIN_LOCALIZED_ESSAY_VISIBLE_WORDS
} from '@/lib/seo/essaySeoQualityPolicy';
import { getScholarshipSeoRouteQualityPolicy } from '@/lib/seo/scholarshipSeoQualityPolicy';
import {
  getSitemapDocumentSlugPlan,
  normalizeSitemapSlug,
  slugMatchesSitemapGroup,
  type SitemapSlugMode
} from '@/lib/seo/sitemapSlugDispatcher';
import {
  countVisibleWords,
  countVisibleWordsUpTo,
  hasRawPlaceholderText
} from '@/lib/seo/visibleText';
import { listPublishedCategoryTranslations } from '@/lib/i18n/categoryPilot/listPublishedCategoryTranslations';
import { listPublishedResourceArticleTranslations } from '@/lib/i18n/resourcePilot/listPublishedResourceArticleTranslations';
import { listPublishedProviderProfileTranslations } from '@/lib/i18n/providerPilot/listPublishedProviderProfileTranslations';
import { listPublishedScholarshipDetailTranslations } from '@/lib/i18n/scholarshipPilot/listPublishedScholarshipDetailTranslations';
import { listPublishedEssayGuideTranslations } from '@/lib/i18n/essayPilot/listPublishedEssayGuideTranslations';
import { listPublishedCompareTranslations } from '@/lib/i18n/comparePilot/listPublishedCompareTranslations';
import { isResourcePilotSlug } from '@/lib/i18n/resourcePilot/resourcePilotSlugs';
import { buildLocalizedSitemapEntry } from '@/lib/i18n/localizedSitemaps';
import {
  listLocalizedPilotPages,
  type LocalizedPilotPageBucket
} from '@/lib/i18n/staticTranslations';

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
  | 'id'
  | 'slug'
  | 'updated_at'
  | 'is_indexable'
  | 'deadline_date'
  | 'is_recurring'
>;

type ProviderHubSitemapRow = {
  slug: string;
  display_name: string | null;
  scholarship_count: number | string | null;
  ai_description: string | null;
};

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

/** Row-range shard size for the large essay sitemap surface. */
export const ESSAY_SITEMAP_ROWS_PER_DOCUMENT = 250;

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

const TRUST_SEO_CORE_PATHS = [
  '/about',
  '/editorial-policy',
  '/scholarship-verification-methodology',
  '/how-we-rank-scholarships',
  '/how-scholarshiptop-works',
  '/contact',
  '/financial-aid-disclaimer',
  '/corrections',
  '/scholarship-scam-warning',
  '/how-we-make-money'
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

function isExpiredScholarshipSitemapRow(row: ScholarshipSitemapRow): boolean {
  if (row.is_recurring === true) return false;
  const deadline = row.deadline_date?.trim();
  if (!deadline) return false;
  return deadline < new Date().toISOString().slice(0, 10);
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

function makeSitemapIndexDocument(
  bucket: SitemapBucket,
  slug: string
): SitemapDocument {
  return {
    slug,
    path: buildSitemapDocumentPath(slug),
    bucket,
    lastModified: new Date().toISOString(),
    entries: []
  };
}

function stripSitemapEntriesForIndex(
  document: SitemapDocument
): SitemapDocument {
  return {
    ...document,
    entries: []
  };
}

/** Split URL lists into multiple documents if needed (<= {@link SITEMAP_MAX_URLS_PER_FILE} each). */
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
  content_json?: unknown | null;
  ai_verdict?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
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
  const out: CompareSitemapRow[] = [];
  for (let offset = 0; ; offset += SITEMAP_DB_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('compare_pages')
      .select(
        'slug, updated_at, content_json, ai_verdict, meta_title, meta_description'
      )
      .eq('status', 'published')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + SITEMAP_DB_PAGE_SIZE - 1);
    if (error) {
      console.error('[sitemap] compare_pages sitemap query failed:', error);
      return out;
    }
    const batch = (data ?? []) as CompareSitemapRow[];
    out.push(...batch);
    if (batch.length < SITEMAP_DB_PAGE_SIZE) break;
  }
  return out;
}

/** Published `/compare/states/[slug]` pages. */
async function fetchStateCompareSitemapRows(): Promise<CompareSitemapRow[]> {
  const supabase = createSitemapReadClient();
  if (!supabase) return [];
  const out: CompareSitemapRow[] = [];
  for (let offset = 0; ; offset += SITEMAP_DB_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('state_compare_pages')
      .select(
        'slug, updated_at, content_json, ai_verdict, meta_title, meta_description'
      )
      .eq('status', 'published')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + SITEMAP_DB_PAGE_SIZE - 1);
    if (error) {
      console.error(
        '[sitemap] state_compare_pages sitemap query failed:',
        error
      );
      return out;
    }
    const batch = (data ?? []) as CompareSitemapRow[];
    out.push(...batch);
    if (batch.length < SITEMAP_DB_PAGE_SIZE) break;
  }
  return out;
}

function compareSitemapRowPassesQuality(row: CompareSitemapRow): boolean {
  const content =
    row.content_json && typeof row.content_json === 'object'
      ? (row.content_json as Record<string, unknown>)
      : {};
  const faq = content['faq'];
  const hasFaq = Array.isArray(faq) && faq.length > 0;
  const quality = getCompareSeoQualityPolicy({
    stablePublicRoute: Boolean(row.slug?.trim()),
    hasQueryParams: false,
    hasSearchIntent: true,
    hasUniqueComparisonTable: true,
    hasVisibleFaq: hasFaq,
    hasRelatedInternalLinks: true,
    meaningfulFactCount: Object.keys(content).length,
    visibleWordCount: countVisibleWords(
      row.meta_title,
      row.meta_description,
      row.ai_verdict,
      content
    ),
    minimumVisibleWords: MIN_DYNAMIC_COMPARE_VISIBLE_WORDS
  });
  return quality.includeInSitemap;
}

/** `/scholarships/{state}/{university}` hubs backed by `provider_hub_listing` + `states` + `providers`. */
async function fetchUniversityHubSitemapRows(): Promise<
  UniversityHubSitemapRow[]
> {
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
      .select('id, slug, updated_at, is_indexable, deadline_date, is_recurring')
      .eq('is_active', true)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + SITEMAP_DB_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as ScholarshipSitemapRow[];
    for (const row of batch) {
      if (row.is_indexable === false) continue;
      if (isExpiredScholarshipSitemapRow(row)) continue;
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
  const rows: ProviderHubSitemapRow[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('provider_hub_listing' as unknown as 'scholarships')
      .select('slug, display_name, scholarship_count, ai_description')
      .order('scholarship_count', { ascending: false })
      .range(offset, offset + SITEMAP_DB_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as unknown as ProviderHubSitemapRow[];
    rows.push(...batch);
    if (batch.length < SITEMAP_DB_PAGE_SIZE) break;
    offset += SITEMAP_DB_PAGE_SIZE;
  }

  return rows
    .filter((row) => {
      const count = Number(row.scholarship_count ?? 0);
      const quality = getProviderSeoQualityPolicy({
        slug: row.slug,
        displayName: row.display_name,
        activeScholarshipCount: Number.isFinite(count) ? count : 0,
        hasDescription: Boolean(row.ai_description?.trim()),
        hasPublicScholarshipList: count > 0,
        hasSourceTrustContext: true,
        routeResolves: true
      });
      return quality.includeInSitemap;
    })
    .map((row) => ({
      url: `${base}/providers/${encodeURIComponent(row.slug.trim())}`,
      lastModified: new Date()
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

function buildCoreSitemapEntries(base: string): MetadataRoute.Sitemap {
  return dedupeSitemapEntries([
    { url: `${base}/`, lastModified: new Date() },
    ...IQ_SEO_SITEMAP_PATHS.map((path) => ({
      url: `${IQ_SEO_BASE_URL}${path === '/' ? '' : path}`,
      lastModified: new Date()
    })),
    ...TRUST_SEO_CORE_PATHS.map((path) => ({
      url: `${base}${path}`,
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
  ]);
}

async function buildResourcesSitemapEntries(
  base: string
): Promise<MetadataRoute.Sitemap> {
  const resourcePosts = await fetchAllPublishedContentPostsForSitemap();
  return dedupeSitemapEntries([
    ...resourcePosts
      .filter((post) => Boolean(post.slug?.trim()))
      .map((post) => ({
        url: `${base}${resourcesArticlePath(post.slug!.trim())}`,
        lastModified: post.published_at || new Date()
      })),
    ...STATIC_SCHOLARSHIP_GUIDES.map((guide) => ({
      url: `${base}${resourcesArticlePath(guide.slug)}`,
      lastModified: new Date('2026-05-16T00:00:00.000Z')
    })),
    ...buildDedicatedResourceGuideSitemapEntries(base)
  ]);
}

type EssaySitemapRowRange = {
  from: number;
  to: number;
  includeStaticGuides?: boolean;
};

const STATIC_ESSAY_GUIDE_SLUGS = new Set(
  STATIC_ESSAY_GUIDES.map((guide) => guide.slug.trim().toLowerCase())
);

function essaySitemapRowPassesQuality(row: EssaySitemapRow): boolean {
  if (!row.slug?.trim()) return false;
  if (STATIC_ESSAY_GUIDE_SLUGS.has(row.slug.trim().toLowerCase())) {
    return false;
  }

  const title = row.title?.trim() || row.slug.trim();
  const quality = getEssaySeoQualityPolicy({
    stablePublicRoute: true,
    hasQueryParams: false,
    hasTitle: Boolean(title),
    hasH1: Boolean(title),
    hasBody: Boolean(row.content_html?.trim()),
    visibleWordCount: countVisibleWordsUpTo(
      600,
      title,
      row.meta_description,
      row.content_html
    ),
    hasRawPlaceholder: hasRawPlaceholderText(title, row.content_html)
  });
  return quality.includeInSitemap;
}

async function buildEssaysSitemapEntries(
  base: string,
  rowRange?: EssaySitemapRowRange
): Promise<MetadataRoute.Sitemap> {
  const essayRows = await (
    rowRange
      ? fetchPublishedEssaySitemapRowsRange(rowRange.from, rowRange.to)
      : fetchAllPublishedEssaySitemapRows()
  ).catch(() => []);
  const includeStaticGuides = rowRange?.includeStaticGuides ?? true;
  return dedupeSitemapEntries(
    essayRows
      .filter(essaySitemapRowPassesQuality)
      .map((row) => ({
        url: `${base}${essayHubArticlePath(row.slug.trim())}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date()
      }))
      .concat(
        includeStaticGuides
          ? STATIC_ESSAY_GUIDES.map((guide) => ({
              url: `${base}${essayHubArticlePath(guide.slug)}`,
              lastModified: new Date(guide.updatedAt)
            }))
          : []
      )
  );
}

function buildCategoriesSitemapEntries(base: string): MetadataRoute.Sitemap {
  const promotedCategorySlugs = new Set(getPromotedSeoCategorySlugs());
  return dedupeSitemapEntries(
    SCHOLARSHIP_CATEGORY_ORDER.filter((id) =>
      promotedCategorySlugs.has(id)
    ).map((id) => ({
      url: `${base}/scholarships/category/${id}`,
      lastModified: new Date()
    }))
  );
}

function scholarshipSeoPathPassesRouteQuality(
  canonicalPath: string,
  routeFamily?: Parameters<
    typeof getScholarshipSeoRouteQualityPolicy
  >[0]['routeFamily']
): boolean {
  const entry = getSeoManifestRoute(canonicalPath);
  return getScholarshipSeoRouteQualityPolicy({
    canonicalPath,
    entry,
    routeFamily,
    stablePublicRoute: true,
    routeResolves: true,
    hasQueryParams: false
  }).shouldIncludeInSitemap;
}

/**
 * SEO listing URLs use {@link canonicalPathAllowedInSeoSitemap}, which matches the drip window when active
 * ({@link getVisibleSeoRoutes} / `SEO_DRIP_START_DATE` + `SEO_PAGES_PER_HOUR`; disabled via `SEO_DRIP_ENABLED=false`).
 * Sitemap builders call `getVisibleSeoRoutes()` so the drip module runs on each sitemap build.
 */
async function buildSeoSitemapEntries(
  base: string
): Promise<MetadataRoute.Sitemap> {
  void getVisibleSeoRoutes();
  const manifestSeoPaths = getAllIndexableSeoManifestPathsForSitemap(3)
    .filter((p) => canonicalPathAllowedInSeoSitemap(p))
    .filter((p) => scholarshipSeoPathPassesRouteQuality(p));
  const manifestPathSet = new Set(manifestSeoPaths);
  const manifestSeoPages: MetadataRoute.Sitemap = manifestSeoPaths.map(
    (path) => ({
      url: `${base}/scholarships/${path}`,
      lastModified: new Date()
    })
  );

  const longTailPages: MetadataRoute.Sitemap = getLongTailSitemapSlugs()
    .filter((slug) => {
      if (!canonicalPathAllowedInSeoSitemap(slug)) return false;
      const manifestEntry = getSeoManifestRoute(slug);
      if (manifestEntry) {
        if (!manifestEntryMeetsSitemapGrantThreshold(manifestEntry, 3))
          return false;
        if (manifestPathSet.has(slug)) return false;
        return scholarshipSeoPathPassesRouteQuality(slug);
      }
      return scholarshipSeoPathPassesRouteQuality(slug, 'legacy_long_tail');
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
    if (!scholarshipSeoPathPassesRouteQuality(slug, 'dynamic_state')) continue;
    stateListingPages.push({
      url: `${base}/scholarships/${slug}`,
      lastModified: new Date()
    });
  }

  const generatedHubRows = await fetchSeoGenerationSitemapRows(3).catch(
    () => []
  );
  // Compare battle paths in the queue use `compare/states/...` or `compare/universities/...`.
  // They must not be prefixed with `/scholarships/`; canonical URLs live in `compare.xml`.
  const programmaticHubPages: MetadataRoute.Sitemap = generatedHubRows
    .filter((row) => canonicalPathAllowedInSeoSitemap(row.canonical_path))
    .filter(
      (row) => !isCompareHubSeoGenerationCanonicalPath(row.canonical_path)
    )
    .filter((row) => scholarshipSeoPathPassesRouteQuality(row.canonical_path))
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

  const countrySeoPages: MetadataRoute.Sitemap =
    allScholarshipCountrySeoRoutes()
      .filter((route) => canonicalPathAllowedInSeoSitemap(route.canonicalPath))
      .map((route) => ({
        url: `${base}${route.href}`,
        lastModified: new Date()
      }));

  const crossCountrySeoPages = buildCrossCountrySeoSitemapEntries(base);

  return dedupeSitemapEntries([
    ...manifestSeoPages,
    ...longTailPages,
    ...stateListingPages,
    ...programmaticHubPages,
    ...universityHubPages,
    ...countrySeoPages,
    ...crossCountrySeoPages
  ]);
}

async function buildScholarshipsSitemapEntries(
  base: string
): Promise<MetadataRoute.Sitemap> {
  return fetchScholarshipSitemapEntries(base).catch((err) => {
    console.error('[sitemap] fetchScholarshipSitemapEntries failed:', err);
    return [];
  });
}

async function buildProvidersSitemapEntries(
  base: string
): Promise<MetadataRoute.Sitemap> {
  return fetchProviderSitemapEntries(base).catch((err) => {
    console.error('[sitemap] fetchProviderSitemapEntries failed:', err);
    return [];
  });
}

async function buildCompareSitemapEntries(
  base: string
): Promise<MetadataRoute.Sitemap> {
  const [compareRows, stateCompareRows] = await Promise.all([
    fetchCompareSitemapRows().catch((err) => {
      console.error('[sitemap] fetchCompareSitemapRows failed:', err);
      return [];
    }),
    fetchStateCompareSitemapRows().catch((err) => {
      console.error('[sitemap] fetchStateCompareSitemapRows failed:', err);
      return [];
    })
  ]);

  return dedupeSitemapEntries([
    ...STATIC_COMPARE_GUIDES.filter((guide) => {
      const quality = getCompareSeoQualityPolicy({
        stablePublicRoute: true,
        hasQueryParams: false,
        hasSearchIntent: true,
        hasUniqueComparisonTable: guide.rows.length > 0,
        hasVisibleFaq: guide.faq.length > 0,
        hasRelatedInternalLinks: guide.links.length > 0,
        meaningfulFactCount: guide.rows.length
      });
      return quality.includeInSitemap;
    }).map((guide) => ({
      url: `${base}/compare/${encodeURIComponent(guide.slug)}`,
      lastModified: new Date(guide.updatedAt)
    })),
    ...compareRows
      .filter((row) => Boolean(row.slug?.trim()))
      .filter(compareSitemapRowPassesQuality)
      .map((row) => ({
        url: `${base}/compare/universities/${encodeURIComponent(row.slug.trim())}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date()
      })),
    ...stateCompareRows
      .filter((row) => Boolean(row.slug?.trim()))
      .filter(compareSitemapRowPassesQuality)
      .map((row) => ({
        url: `${base}/compare/states/${encodeURIComponent(row.slug.trim())}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date()
      }))
  ]);
}

export const buildSitemapBuckets = cache(async (): Promise<SitemapBuckets> => {
  const base = sitemapBaseUrl();

  const [resources, essays, seo, scholarships, providers, compare] =
    await Promise.all([
      buildResourcesSitemapEntries(base),
      buildEssaysSitemapEntries(base),
      buildSeoSitemapEntries(base),
      buildScholarshipsSitemapEntries(base),
      buildProvidersSitemapEntries(base),
      buildCompareSitemapEntries(base)
    ]);

  return {
    core: buildCoreSitemapEntries(base),
    resources,
    essays,
    providers,
    categories: buildCategoriesSitemapEntries(base),
    seo,
    scholarships: dedupeSitemapEntries(scholarships),
    compare
  };
});

export const buildSitemapDocuments = cache(
  async (): Promise<SitemapDocument[]> => {
    void getVisibleSeoRoutes();
    const buckets = await buildSitemapBuckets();
    const localizedPilotDocs = buildLocalizedPilotSitemapDocuments();

    return [
      ...buildDocumentsForBucket(
        'core',
        'core',
        buckets.core,
        'single-or-indexed'
      ),
      ...buildDocumentsForBucket(
        'resources',
        'resources',
        buckets.resources,
        'single-or-indexed'
      ),
      ...buildDocumentsForBucket(
        'essays',
        'essays',
        buckets.essays,
        'always-indexed'
      ),
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
      ...buildDocumentsForBucket(
        'seo',
        'seo',
        buckets.seo,
        'single-or-indexed'
      ),
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
      ),
      ...localizedPilotDocs,
      ...(await buildLocalizedCategorySitemapDocuments()),
      ...(await buildLocalizedResourceArticleSitemapDocuments()),
      ...(await buildLocalizedProviderProfileSitemapDocuments()),
      ...(await buildLocalizedScholarshipDetailSitemapDocuments()),
      ...(await buildLocalizedEssayGuideSitemapDocuments()),
      ...(await buildLocalizedCompareSitemapDocuments())
    ];
  }
);

async function fetchScholarshipSitemapDocumentCount(): Promise<number> {
  const supabase = createSitemapReadClient();
  if (!supabase) return 1;

  const { count, error } = await supabase
    .from('scholarships')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .or('is_indexable.is.null,is_indexable.eq.true')
    .or(
      `deadline_date.is.null,deadline_date.gte.${new Date().toISOString().slice(0, 10)},is_recurring.eq.true`
    );

  if (error) {
    console.error('[sitemap] scholarship sitemap count failed:', error);
    return 1;
  }

  return Math.max(1, Math.ceil((count ?? 0) / SITEMAP_MAX_URLS_PER_FILE));
}

async function buildScholarshipSitemapIndexDocuments(): Promise<
  SitemapDocument[]
> {
  const documentCount = await fetchScholarshipSitemapDocumentCount();
  return Array.from({ length: documentCount }, (_unused, index) =>
    makeSitemapIndexDocument('scholarships', `scholarships-${index}`)
  );
}

async function fetchEssaySitemapDocumentCount(): Promise<number> {
  const count = await countPublishedEssaySitemapRows().catch((error) => {
    console.error('[sitemap] essay sitemap count failed:', error);
    return 0;
  });

  return Math.max(1, Math.ceil(count / ESSAY_SITEMAP_ROWS_PER_DOCUMENT));
}

async function buildEssaySitemapIndexDocuments(): Promise<SitemapDocument[]> {
  const documentCount = await fetchEssaySitemapDocumentCount();
  return Array.from({ length: documentCount }, (_unused, index) =>
    makeSitemapIndexDocument('essays', `essays-${index}`)
  );
}

function buildLocalizedDbSitemapIndexDocuments(): SitemapDocument[] {
  const docs: SitemapDocument[] = [];
  const dbShards: Array<{ bucket: SitemapBucket; suffix: string }> = [
    { bucket: 'categories', suffix: 'categories' },
    { bucket: 'resources', suffix: 'resources-db' },
    { bucket: 'providers', suffix: 'providers-db' },
    { bucket: 'scholarships', suffix: 'scholarships-detail-db' }
  ];

  for (const locale of ['es', 'fr'] as const) {
    for (const shard of dbShards) {
      docs.push(
        makeSitemapIndexDocument(
          shard.bucket,
          `locale-${locale}-${shard.suffix}`
        )
      );
    }
  }

  return docs;
}

export const buildSitemapIndexDocuments = cache(
  async (): Promise<SitemapDocument[]> => {
    void getVisibleSeoRoutes();

    const [essayDocs, scholarshipDocs] = await Promise.all([
      buildEssaySitemapIndexDocuments(),
      buildScholarshipSitemapIndexDocuments()
    ]);

    return [
      makeSitemapIndexDocument('core', 'core'),
      makeSitemapIndexDocument('resources', 'resources'),
      ...essayDocs,
      makeSitemapIndexDocument('providers', 'providers'),
      makeSitemapIndexDocument('categories', 'categories'),
      makeSitemapIndexDocument('seo', 'seo'),
      ...scholarshipDocs,
      makeSitemapIndexDocument('compare', 'compare'),
      ...buildLocalizedPilotSitemapDocuments().map(stripSitemapEntriesForIndex),
      ...buildLocalizedDbSitemapIndexDocuments()
    ];
  }
);

function buildLocalizedPilotSitemapDocuments(): SitemapDocument[] {
  const docs: SitemapDocument[] = [];
  const buckets: LocalizedPilotPageBucket[] = [
    'core',
    'essays',
    'compare',
    'resources'
  ];

  for (const locale of ['es', 'fr'] as const) {
    for (const bucket of buckets) {
      const entries = listLocalizedPilotPages({ locale, bucket })
        .map((page) =>
          buildLocalizedSitemapEntry({
            locale: page.locale,
            canonicalPath: page.canonicalPath,
            sourceIndexable: true,
            translationStatus: page.status,
            qualityScore: page.qualityScore,
            hasLocalizedTitle: Boolean(page.title.trim()),
            hasLocalizedH1: Boolean(page.h1.trim()),
            hasLocalizedBody: Boolean(page.intro.trim()),
            hasMixedLanguageRisk: false,
            lastModified: page.updatedAt
          })
        )
        .filter((entry): entry is MetadataRoute.Sitemap[number] =>
          Boolean(entry)
        );
      if (entries.length === 0) continue;
      docs.push(
        makeSitemapDocument(bucket, `locale-${locale}-${bucket}`, entries)
      );
    }
  }

  return docs;
}

type LocalizedSitemapLocale = 'es' | 'fr';
const LOCALIZED_SITEMAP_LOCALES = ['es', 'fr'] as const;

function localizedSitemapLocales(
  locale?: LocalizedSitemapLocale
): readonly LocalizedSitemapLocale[] {
  return locale ? [locale] : LOCALIZED_SITEMAP_LOCALES;
}

async function buildLocalizedCategorySitemapDocuments(
  locale?: LocalizedSitemapLocale
): Promise<SitemapDocument[]> {
  const rows = await listPublishedCategoryTranslations({ locale });
  if (rows.length === 0) return [];

  const byLocale = new Map<'es' | 'fr', MetadataRoute.Sitemap>();
  for (const row of rows) {
    const canonicalPath = `/scholarships/category/${row.sourceId}`;
    const entry = buildLocalizedSitemapEntry({
      locale: row.locale,
      canonicalPath,
      sourceIndexable: true,
      translationStatus: 'published',
      qualityScore: row.qualityScore ?? 90,
      hasLocalizedTitle: Boolean(row.translatedTitle?.trim()),
      hasLocalizedH1: Boolean(row.translatedTitle?.trim()),
      hasLocalizedBody: true,
      hasMixedLanguageRisk: false,
      lastModified: row.lastModified
    });
    if (!entry) continue;
    const bucket = byLocale.get(row.locale) ?? [];
    bucket.push(entry);
    byLocale.set(row.locale, bucket);
  }

  const docs: SitemapDocument[] = [];
  for (const currentLocale of localizedSitemapLocales(locale)) {
    const entries = byLocale.get(currentLocale);
    if (!entries?.length) continue;
    docs.push(
      makeSitemapDocument(
        'categories',
        `locale-${currentLocale}-categories`,
        entries
      )
    );
  }
  return docs;
}

async function buildLocalizedResourceArticleSitemapDocuments(
  locale?: LocalizedSitemapLocale
): Promise<SitemapDocument[]> {
  const rows = await listPublishedResourceArticleTranslations({ locale });
  if (rows.length === 0) return [];

  const supabase = createPublicClient();
  if (!supabase) return [];

  const ids = [...new Set(rows.map((r) => r.sourceId))];
  const { data: posts, error } = await supabase
    .from('content_posts')
    .select('id, slug')
    .in('id', ids)
    .eq('status', 'published');

  if (error || !posts?.length) return [];

  const slugById = new Map(
    posts.map((p) => [
      String(p.id),
      String(p.slug ?? '')
        .trim()
        .toLowerCase()
    ])
  );

  const byLocale = new Map<'es' | 'fr', MetadataRoute.Sitemap>();
  for (const row of rows) {
    const slug = slugById.get(row.sourceId);
    if (!slug || !isResourcePilotSlug(slug)) continue;
    const canonicalPath = resourcesArticlePath(slug);
    const entry = buildLocalizedSitemapEntry({
      locale: row.locale,
      canonicalPath,
      sourceIndexable: true,
      translationStatus: 'published',
      qualityScore: row.qualityScore ?? 90,
      hasLocalizedTitle: Boolean(row.translatedTitle?.trim()),
      hasLocalizedH1: Boolean(row.translatedTitle?.trim()),
      hasLocalizedBody: Boolean(row.translatedBody?.trim()),
      hasMixedLanguageRisk: false,
      lastModified: row.lastModified
    });
    if (!entry) continue;
    const bucket = byLocale.get(row.locale) ?? [];
    bucket.push(entry);
    byLocale.set(row.locale, bucket);
  }

  const docs: SitemapDocument[] = [];
  for (const currentLocale of localizedSitemapLocales(locale)) {
    const entries = byLocale.get(currentLocale);
    if (!entries?.length) continue;
    docs.push(
      makeSitemapDocument(
        'resources',
        `locale-${currentLocale}-resources-db`,
        entries
      )
    );
  }
  return docs;
}

async function buildLocalizedProviderProfileSitemapDocuments(
  locale?: LocalizedSitemapLocale
): Promise<SitemapDocument[]> {
  const rows = await listPublishedProviderProfileTranslations({ locale });
  if (rows.length === 0) return [];

  const supabase = createPublicClient();
  if (!supabase) return [];

  const slugs = [...new Set(rows.map((r) => r.providerSlug))];
  const { data: hubRows, error } = await supabase
    .from('provider_hub_listing' as unknown as 'scholarships')
    .select('slug, display_name, scholarship_count, ai_description')
    .in('slug', slugs);

  if (error || !hubRows?.length) return [];

  const indexableSlugs = new Set<string>();
  for (const row of hubRows as unknown as ProviderHubSitemapRow[]) {
    const slug = String(row.slug ?? '')
      .trim()
      .toLowerCase();
    if (!slug) continue;
    const count = Number(row.scholarship_count ?? 0);
    const quality = getProviderSeoQualityPolicy({
      slug,
      displayName: row.display_name,
      activeScholarshipCount: Number.isFinite(count) ? count : 0,
      hasDescription: Boolean(row.ai_description?.trim()),
      hasPublicScholarshipList: count > 0,
      hasSourceTrustContext: true,
      routeResolves: true
    });
    if (quality.includeInSitemap) indexableSlugs.add(slug);
  }

  const byLocale = new Map<'es' | 'fr', MetadataRoute.Sitemap>();
  for (const row of rows) {
    if (!indexableSlugs.has(row.providerSlug)) continue;
    const canonicalPath = `/providers/${row.providerSlug}`;
    const entry = buildLocalizedSitemapEntry({
      locale: row.locale,
      canonicalPath,
      sourceIndexable: true,
      translationStatus: 'published',
      qualityScore: row.qualityScore ?? 90,
      hasLocalizedTitle: Boolean(row.translatedTitle?.trim()),
      hasLocalizedH1: Boolean(row.translatedTitle?.trim()),
      hasLocalizedBody: Boolean(row.translatedBody?.trim()),
      hasMixedLanguageRisk: false,
      lastModified: row.lastModified
    });
    if (!entry) continue;
    const bucket = byLocale.get(row.locale) ?? [];
    bucket.push(entry);
    byLocale.set(row.locale, bucket);
  }

  const docs: SitemapDocument[] = [];
  for (const currentLocale of localizedSitemapLocales(locale)) {
    const entries = byLocale.get(currentLocale);
    if (!entries?.length) continue;
    docs.push(
      makeSitemapDocument(
        'providers',
        `locale-${currentLocale}-providers-db`,
        entries
      )
    );
  }
  return docs;
}

async function buildLocalizedScholarshipDetailSitemapDocuments(
  locale?: LocalizedSitemapLocale
): Promise<SitemapDocument[]> {
  const rows = await listPublishedScholarshipDetailTranslations({ locale });
  if (rows.length === 0) return [];

  const byLocale = new Map<'es' | 'fr', MetadataRoute.Sitemap>();
  for (const row of rows) {
    const canonicalPath = `/scholarships/${row.scholarshipSlug}`;
    const entry = buildLocalizedSitemapEntry({
      locale: row.locale,
      canonicalPath,
      sourceIndexable: true,
      translationStatus: 'published',
      qualityScore: row.qualityScore ?? 90,
      hasLocalizedTitle: Boolean(row.translatedTitle?.trim()),
      hasLocalizedH1: Boolean(row.translatedTitle?.trim()),
      hasLocalizedBody: Boolean(
        row.translatedBody?.trim() || row.translatedSummary?.trim()
      ),
      hasMixedLanguageRisk: false,
      lastModified: row.lastModified
    });
    if (!entry) continue;
    const bucket = byLocale.get(row.locale) ?? [];
    bucket.push(entry);
    byLocale.set(row.locale, bucket);
  }

  const docs: SitemapDocument[] = [];
  for (const currentLocale of localizedSitemapLocales(locale)) {
    const entries = byLocale.get(currentLocale);
    if (!entries?.length) continue;
    docs.push(
      makeSitemapDocument(
        'scholarships',
        `locale-${currentLocale}-scholarships-detail-db`,
        entries
      )
    );
  }
  return docs;
}

async function buildLocalizedEssayGuideSitemapDocuments(
  locale?: LocalizedSitemapLocale
): Promise<SitemapDocument[]> {
  const rows = await listPublishedEssayGuideTranslations({ locale });
  if (rows.length === 0) return [];

  const byLocale = new Map<'es' | 'fr', MetadataRoute.Sitemap>();
  for (const row of rows) {
    const canonicalPath = `/essays/${row.essaySlug}`;
    const quality = getEssaySeoQualityPolicy({
      stablePublicRoute: true,
      hasQueryParams: false,
      hasTitle: Boolean(row.translatedTitle?.trim()),
      hasH1: Boolean(row.translatedTitle?.trim()),
      hasBody: Boolean(row.translatedBody?.trim()),
      localized: true,
      hasLocalizedTitle: Boolean(row.translatedTitle?.trim()),
      hasLocalizedH1: Boolean(row.translatedTitle?.trim()),
      hasLocalizedBody: Boolean(row.translatedBody?.trim()),
      visibleWordCount: countVisibleWords(
        row.translatedTitle,
        row.translatedSummary,
        row.translatedBody
      ),
      minimumVisibleWords: MIN_LOCALIZED_ESSAY_VISIBLE_WORDS,
      hasRawPlaceholder: hasRawPlaceholderText(
        row.translatedTitle,
        row.translatedBody
      )
    });
    if (!quality.includeInSitemap) continue;
    const entry = buildLocalizedSitemapEntry({
      locale: row.locale,
      canonicalPath,
      sourceIndexable: quality.indexable,
      translationStatus: 'published',
      qualityScore: row.qualityScore ?? 90,
      hasLocalizedTitle: Boolean(row.translatedTitle?.trim()),
      hasLocalizedH1: Boolean(row.translatedTitle?.trim()),
      hasLocalizedBody: Boolean(row.translatedBody?.trim()),
      hasMixedLanguageRisk: false,
      lastModified: row.lastModified
    });
    if (!entry) continue;
    const bucket = byLocale.get(row.locale) ?? [];
    bucket.push(entry);
    byLocale.set(row.locale, bucket);
  }

  const docs: SitemapDocument[] = [];
  for (const currentLocale of localizedSitemapLocales(locale)) {
    const entries = byLocale.get(currentLocale);
    if (!entries?.length) continue;
    docs.push(
      makeSitemapDocument(
        'essays',
        `locale-${currentLocale}-essays-guide-db`,
        entries
      )
    );
  }
  return docs;
}

async function buildLocalizedCompareSitemapDocuments(
  locale?: LocalizedSitemapLocale
): Promise<SitemapDocument[]> {
  const rows = await listPublishedCompareTranslations({ locale });
  if (rows.length === 0) return [];

  const byLocale = new Map<'es' | 'fr', MetadataRoute.Sitemap>();
  for (const row of rows) {
    const canonicalPath =
      row.sourceType === 'compare_university'
        ? `/compare/universities/${row.slug}`
        : `/compare/states/${row.slug}`;
    const quality = getCompareSeoQualityPolicy({
      stablePublicRoute: true,
      hasQueryParams: false,
      hasSearchIntent: true,
      hasUniqueComparisonTable: false,
      hasVisibleFaq: false,
      hasRelatedInternalLinks: true,
      meaningfulFactCount: 1,
      localized: true,
      hasLocalizedTitle: Boolean(row.translatedTitle?.trim()),
      hasLocalizedH1: Boolean(row.translatedTitle?.trim()),
      hasLocalizedBody: Boolean(row.translatedBody?.trim()),
      visibleWordCount: countVisibleWords(
        row.translatedTitle,
        row.translatedSummary,
        row.translatedBody
      ),
      minimumVisibleWords: MIN_LOCALIZED_COMPARE_VISIBLE_WORDS
    });
    if (!quality.includeInSitemap) continue;
    const entry = buildLocalizedSitemapEntry({
      locale: row.locale,
      canonicalPath,
      sourceIndexable: quality.indexable,
      translationStatus: 'published',
      qualityScore: row.qualityScore ?? 90,
      hasLocalizedTitle: Boolean(row.translatedTitle?.trim()),
      hasLocalizedH1: Boolean(row.translatedTitle?.trim()),
      hasLocalizedBody: Boolean(row.translatedBody?.trim()),
      hasMixedLanguageRisk: false,
      lastModified: row.lastModified
    });
    if (!entry) continue;
    const bucket = byLocale.get(row.locale) ?? [];
    bucket.push(entry);
    byLocale.set(row.locale, bucket);
  }

  const docs: SitemapDocument[] = [];
  for (const currentLocale of localizedSitemapLocales(locale)) {
    const entries = byLocale.get(currentLocale);
    if (!entries?.length) continue;
    docs.push(
      makeSitemapDocument(
        'compare',
        `locale-${currentLocale}-compare-detail-db`,
        entries
      )
    );
  }
  return docs;
}

type SitemapEntriesBuilder = (
  base: string
) => MetadataRoute.Sitemap | Promise<MetadataRoute.Sitemap>;

type EnglishSitemapDocumentPlan = {
  bucket: SitemapBucket;
  slugBase: string;
  slugMode: SitemapSlugMode;
  buildEntries: SitemapEntriesBuilder;
};

const ENGLISH_SITEMAP_DOCUMENT_PLANS: readonly EnglishSitemapDocumentPlan[] = [
  {
    bucket: 'core',
    slugBase: 'core',
    slugMode: 'single-or-indexed',
    buildEntries: buildCoreSitemapEntries
  },
  {
    bucket: 'resources',
    slugBase: 'resources',
    slugMode: 'single-or-indexed',
    buildEntries: buildResourcesSitemapEntries
  },
  {
    bucket: 'essays',
    slugBase: 'essays',
    slugMode: 'always-indexed',
    buildEntries: buildEssaysSitemapEntries
  },
  {
    bucket: 'providers',
    slugBase: 'providers',
    slugMode: 'single-or-indexed',
    buildEntries: buildProvidersSitemapEntries
  },
  {
    bucket: 'categories',
    slugBase: 'categories',
    slugMode: 'single-or-indexed',
    buildEntries: buildCategoriesSitemapEntries
  },
  {
    bucket: 'seo',
    slugBase: 'seo',
    slugMode: 'single-or-indexed',
    buildEntries: buildSeoSitemapEntries
  },
  {
    bucket: 'scholarships',
    slugBase: 'scholarships',
    slugMode: 'always-indexed',
    buildEntries: buildScholarshipsSitemapEntries
  },
  {
    bucket: 'compare',
    slugBase: 'compare',
    slugMode: 'single-or-indexed',
    buildEntries: buildCompareSitemapEntries
  }
] as const;

function slugMatchesDocumentPlan(
  slug: string,
  plan: EnglishSitemapDocumentPlan
): boolean {
  return slugMatchesSitemapGroup(slug, plan.slugBase, plan.slugMode);
}

async function buildEssaySitemapDocumentBySlug(
  slug: string
): Promise<SitemapDocument | null> {
  const match = /^essays-(\d+)$/.exec(slug);
  if (!match) return null;

  const index = Number.parseInt(match[1], 10);
  if (!Number.isSafeInteger(index) || index < 0) return null;

  const from = index * ESSAY_SITEMAP_ROWS_PER_DOCUMENT;
  const to = from + ESSAY_SITEMAP_ROWS_PER_DOCUMENT - 1;
  const entries = await buildEssaysSitemapEntries(sitemapBaseUrl(), {
    from,
    to,
    includeStaticGuides: index === 0
  });

  return makeSitemapDocument('essays', slug, entries);
}

async function buildEnglishSitemapDocumentBySlug(
  slug: string
): Promise<SitemapDocument | null> {
  const essayDocument = await buildEssaySitemapDocumentBySlug(slug);
  if (essayDocument) return essayDocument;

  const plan = ENGLISH_SITEMAP_DOCUMENT_PLANS.find((candidate) =>
    slugMatchesDocumentPlan(slug, candidate)
  );
  if (!plan) return null;

  const entries = await plan.buildEntries(sitemapBaseUrl());
  const documents = buildDocumentsForBucket(
    plan.bucket,
    plan.slugBase,
    entries,
    plan.slugMode
  );
  return documents.find((doc) => doc.slug === slug) ?? null;
}

function buildLocalizedPilotSitemapDocumentBySlug(
  slug: string
): SitemapDocument | null {
  const match = /^locale-(es|fr)-(core|essays|compare|resources)$/.exec(slug);
  if (!match) return null;

  const locale = match[1] as 'es' | 'fr';
  const bucket = match[2] as LocalizedPilotPageBucket;
  const entries = listLocalizedPilotPages({ locale, bucket })
    .map((page) =>
      buildLocalizedSitemapEntry({
        locale: page.locale,
        canonicalPath: page.canonicalPath,
        sourceIndexable: true,
        translationStatus: page.status,
        qualityScore: page.qualityScore,
        hasLocalizedTitle: Boolean(page.title.trim()),
        hasLocalizedH1: Boolean(page.h1.trim()),
        hasLocalizedBody: Boolean(page.intro.trim()),
        hasMixedLanguageRisk: false,
        lastModified: page.updatedAt
      })
    )
    .filter((entry): entry is MetadataRoute.Sitemap[number] => Boolean(entry));

  if (entries.length === 0) return null;
  return makeSitemapDocument(bucket, slug, entries);
}

async function buildLocalizedDbSitemapDocumentBySlug(
  slug: string
): Promise<SitemapDocument | null> {
  const match =
    /^locale-(es|fr)-(categories|resources-db|providers-db|scholarships-detail-db|essays-guide-db|compare-detail-db)$/.exec(
      slug
    );
  if (!match) return null;

  const locale = match[1] as LocalizedSitemapLocale;
  const suffix = match[2];
  const documents =
    suffix === 'categories'
      ? await buildLocalizedCategorySitemapDocuments(locale)
      : suffix === 'resources-db'
        ? await buildLocalizedResourceArticleSitemapDocuments(locale)
        : suffix === 'providers-db'
          ? await buildLocalizedProviderProfileSitemapDocuments(locale)
          : suffix === 'scholarships-detail-db'
            ? await buildLocalizedScholarshipDetailSitemapDocuments(locale)
            : suffix === 'essays-guide-db'
              ? await buildLocalizedEssayGuideSitemapDocuments(locale)
              : await buildLocalizedCompareSitemapDocuments(locale);
  return documents.find((doc) => doc.slug === slug) ?? null;
}

export { getSitemapDocumentSlugPlan };

export const getSitemapDocumentBySlug = cache(
  async (slug: string): Promise<SitemapDocument | null> => {
    const normalizedSlug = normalizeSitemapSlug(slug);
    if (!normalizedSlug) return null;

    const englishDocument =
      await buildEnglishSitemapDocumentBySlug(normalizedSlug);
    if (englishDocument) return englishDocument;

    const localizedPilotDocument =
      buildLocalizedPilotSitemapDocumentBySlug(normalizedSlug);
    if (localizedPilotDocument) return localizedPilotDocument;

    return buildLocalizedDbSitemapDocumentBySlug(normalizedSlug);
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
