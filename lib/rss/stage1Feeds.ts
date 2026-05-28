import 'server-only';

import { STATIC_COMPARE_GUIDES } from '@/lib/compare/staticCompareGuides';
import { resourcesArticlePath } from '@/lib/content-hub/resourcesSection';
import { essayHubArticlePath } from '@/lib/essays/essayHubSection';
import { STATIC_ESSAY_GUIDES } from '@/lib/essays/staticEssayGuides';
import { getEssaySeoQualityPolicy } from '@/lib/seo/essaySeoQualityPolicy';
import {
  countVisibleWordsUpTo,
  hasRawPlaceholderText
} from '@/lib/seo/visibleText';
import {
  categoryListingMetaDescription,
  categoryListingMetaTitle
} from '@/app/scholarships/category/categoryListingSeoCopy';
import { getPromotedSeoCategorySlugs } from '@/lib/scholarships/categorySeoAllowlist';
import { normalizeCategoryId } from '@/app/scholarships/scholarshipCategories';
import { STATIC_SCHOLARSHIP_GUIDES } from '@/lib/resources/staticScholarshipGuides';
import { createPublicClient } from '@/utils/supabase/public';

import {
  absoluteSiteUrl,
  cleanRssText,
  dedupeRssItems,
  filterValidRssItems,
  sortRssItemsByDate,
  type RssItem
} from './rssXml';

export const MASTER_RSS_ITEM_LIMIT = 500;
export const MASTER_RESOURCE_ITEM_LIMIT = 500;
export const MASTER_ESSAY_ITEM_LIMIT = 175;

const STATIC_RESOURCE_GUIDE_UPDATED_AT = '2026-05-16T00:00:00.000Z';
const CATEGORY_RSS_UPDATED_AT = '2026-05-28T00:00:00.000Z';
const RESOURCES_HUB_UPDATED_AT = '2026-05-28T00:00:00.000Z';
const ESSAYS_HUB_UPDATED_AT = '2026-05-28T00:00:00.000Z';
const COMPARE_HUB_UPDATED_AT = '2026-05-17T00:00:00.000Z';
const RSS_DB_BATCH_SIZE = 500;
const RSS_DB_QUERY_TIMEOUT_MS = 8000;

type ResourceRssRow = {
  title: string | null;
  slug: string | null;
  meta_description: string | null;
  published_at: string | null;
  updated_at: string | null;
};

type EssayRssRow = {
  slug: string | null;
  title: string | null;
  content_html: string | null;
  meta_description: string | null;
  updated_at: string | null;
};

function item(
  path: string,
  title: string,
  description: string,
  pubDate: string | Date,
  category: string
): RssItem {
  const link = absoluteSiteUrl(path);
  return {
    title: cleanRssText(title, 'ScholarshipTop'),
    link,
    description: cleanRssText(description, title),
    pubDate,
    guid: link,
    category
  };
}

async function fetchResourceRows(): Promise<ResourceRssRow[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const rows: ResourceRssRow[] = [];
  for (let from = 0; ; from += RSS_DB_BATCH_SIZE) {
    const { data, error } = await supabase
      .from('content_posts')
      .select('title, slug, meta_description, published_at, updated_at')
      .eq('status', 'published')
      .not('slug', 'is', null)
      .neq('slug', '')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false, nullsFirst: false })
      .range(from, from + RSS_DB_BATCH_SIZE - 1)
      .abortSignal(AbortSignal.timeout(RSS_DB_QUERY_TIMEOUT_MS));

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as ResourceRssRow[];
    rows.push(...batch);
    if (batch.length < RSS_DB_BATCH_SIZE) break;
  }
  return rows;
}

export async function buildResourcesRssItems(): Promise<RssItem[]> {
  const dbRows = await fetchResourceRows().catch(() => []);
  const dbItems = dbRows
    .filter((row) => row.slug?.trim() && (row.published_at || row.updated_at))
    .map((row) =>
      item(
        resourcesArticlePath(row.slug!.trim()),
        row.title?.trim() || 'ScholarshipTop resource',
        row.meta_description?.trim() ||
          `Read this ScholarshipTop guide: ${row.title?.trim() || 'scholarship planning resource'}.`,
        row.published_at || row.updated_at!,
        'Resources'
      )
    );

  const staticItems = STATIC_SCHOLARSHIP_GUIDES.map((guide) =>
    item(
      resourcesArticlePath(guide.slug),
      guide.title,
      guide.description,
      STATIC_RESOURCE_GUIDE_UPDATED_AT,
      'Resources'
    )
  );

  const hubItem = item(
    '/resources',
    'Scholarship Resources - Guides & Tips',
    'Guides and expert tips to help you find scholarships, write stronger applications, and stay organized.',
    RESOURCES_HUB_UPDATED_AT,
    'Resources'
  );

  return sortRssItemsByDate(filterValidRssItems([hubItem, ...dbItems, ...staticItems]));
}

const STATIC_ESSAY_SLUGS = new Set(
  STATIC_ESSAY_GUIDES.map((guide) => guide.slug.trim().toLowerCase())
);

async function fetchEssayRows(): Promise<EssayRssRow[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const rows: EssayRssRow[] = [];
  for (let from = 0; ; from += RSS_DB_BATCH_SIZE) {
    const { data, error } = await supabase
      .from('essays')
      .select('slug, title, content_html, meta_description, updated_at')
      .eq('is_published', true)
      .not('slug', 'is', null)
      .neq('slug', '')
      .not('content_html', 'is', null)
      .neq('content_html', '')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .range(from, from + RSS_DB_BATCH_SIZE - 1)
      .abortSignal(AbortSignal.timeout(RSS_DB_QUERY_TIMEOUT_MS));

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as EssayRssRow[];
    rows.push(...batch);
    if (batch.length < RSS_DB_BATCH_SIZE) break;
  }

  return rows;
}

function essayRowPassesQuality(row: EssayRssRow): boolean {
  if (!row.slug?.trim()) return false;
  if (STATIC_ESSAY_SLUGS.has(row.slug.trim().toLowerCase())) return false;
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

export async function buildEssaysRssItems(): Promise<RssItem[]> {
  const essayRows = await fetchEssayRows().catch(() => []);
  const generatedItems = essayRows
    .filter((row) => row.updated_at && essayRowPassesQuality(row))
    .map((row) =>
      item(
        essayHubArticlePath(row.slug!.trim()),
        row.title?.trim() || 'Scholarship essay guide',
        row.meta_description?.trim() ||
          `Plan and revise a stronger scholarship essay with this ScholarshipTop guide.`,
        row.updated_at!,
        'Essays'
      )
    );

  const staticItems = STATIC_ESSAY_GUIDES.map((guide) =>
    item(
      essayHubArticlePath(guide.slug),
      guide.title,
      guide.description,
      guide.updatedAt,
      'Essays'
    )
  );

  const hubItem = item(
    '/essays',
    'Scholarship Essay Guides & Examples',
    'Use ScholarshipTop essay guides, examples, outlines, checklists, and prompt-specific advice to plan stronger scholarship applications.',
    ESSAYS_HUB_UPDATED_AT,
    'Essays'
  );

  return sortRssItemsByDate(
    filterValidRssItems([hubItem, ...generatedItems, ...staticItems])
  );
}

export function buildCompareRssItems(): RssItem[] {
  const hubItem = item(
    '/compare',
    'Compare Scholarships, Grants, and Award Types',
    'Compare scholarships, grants, award types, state scholarship markets, and university scholarship matchups with practical decision guides.',
    COMPARE_HUB_UPDATED_AT,
    'Comparison'
  );

  const guideItems = STATIC_COMPARE_GUIDES.map((guide) =>
    item(
      `/compare/${encodeURIComponent(guide.slug)}`,
      guide.title,
      guide.description,
      guide.updatedAt,
      'Comparison'
    )
  );

  return sortRssItemsByDate(filterValidRssItems([hubItem, ...guideItems]));
}

export function buildCategoriesRssItems(): RssItem[] {
  const items = getPromotedSeoCategorySlugs().map((slug) => {
    const categoryId = normalizeCategoryId(slug);
    return item(
      `/scholarships/category/${slug}`,
      categoryListingMetaTitle(categoryId, slug),
      categoryListingMetaDescription(categoryId, slug),
      CATEGORY_RSS_UPDATED_AT,
      'Scholarship categories'
    );
  });

  return sortRssItemsByDate(filterValidRssItems(items));
}

export async function buildMasterRssItems(): Promise<RssItem[]> {
  const [resources, essays] = await Promise.all([
    buildResourcesRssItems(),
    buildEssaysRssItems()
  ]);
  const compare = buildCompareRssItems();
  const categories = buildCategoriesRssItems();
  const essayItems = essays.slice(0, MASTER_ESSAY_ITEM_LIMIT);
  const fixedItemCount = essayItems.length + compare.length + categories.length;
  const resourceLimit = Math.max(
    0,
    Math.min(MASTER_RESOURCE_ITEM_LIMIT, MASTER_RSS_ITEM_LIMIT - fixedItemCount)
  );

  return sortRssItemsByDate(
    dedupeRssItems([
      ...resources.slice(0, resourceLimit),
      ...essayItems,
      ...compare,
      ...categories
    ])
  ).slice(0, MASTER_RSS_ITEM_LIMIT);
}
