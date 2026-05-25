import 'server-only';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';

import { createPublicClient } from '@/utils/supabase/public';

export type EssayListFields = {
  id: string;
  slug: string;
  title: string;
  hero_image_url: string | null;
  hero_is_real: boolean;
  meta_description: string | null;
  hub_category_slug: string | null;
  hub_category_label: string | null;
  hub_distribution_group: string | null;
  hub_distribution_rank: number | null;
  created_at: string | null;
};

/** `/essays` index: list fields plus first linked scholarship category (for filters). */
export type EssayIndexRow = EssayListFields & {
  linkedCategorySlug: string | null;
  linkedCategoryLabel: string | null;
  /** 1 = real stored hero; 0 = missing URL or canonical gradient placeholder */
  heroListPriority: number;
};

export type EssayDetailRow = {
  id: string;
  slug: string;
  title: string;
  content_html: string;
  hero_image_url: string | null;
  hero_is_real: boolean;
  sources: unknown;
  faq: unknown;
  meta_description: string | null;
  hub_category_slug: string | null;
  hub_category_label: string | null;
  manual_topic: string | null;
  is_published: boolean;
  created_at: string | null;
  updated_at: string | null;
};

const listSelect =
  'id, slug, title, hero_image_url, hero_is_real, meta_description, hub_category_slug, hub_category_label, hub_distribution_group, hub_distribution_rank, created_at' as const;

/** `/essays` grid also renders two inline IQ promo slots (first + last), so keep rows+2 divisible by 3 on large screens. */
export const ESSAYS_INDEX_PAGE_SIZE = 10;

export type EssaysHubCategoryOption = {
  key: string;
  label: string;
  count: number;
};

/** Same fields as `EssaysIndexQueryState` (declared separately to avoid circular imports). */
export type EssaysHubIndexRequest = {
  q: string;
  categoryKey: string | null;
  sort: 'latest' | 'oldest';
  page: number;
};

type RpcEssaysHubRow = {
  id: string;
  slug: string;
  title: string;
  hero_image_url: string | null;
  hero_is_real: boolean;
  meta_description: string | null;
      hub_category_slug?: string | null;
      hub_category_label?: string | null;
      hub_distribution_group?: string | null;
      hub_distribution_rank?: number | null;
  created_at: string | null;
  linked_category_slug: string | null;
  linked_category_label: string | null;
  hero_list_priority: number;
};

function mapRpcEssayIndexRow(r: RpcEssaysHubRow): EssayIndexRow {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    hero_image_url: r.hero_image_url,
    hero_is_real: r.hero_is_real,
    meta_description: r.meta_description,
      hub_category_slug: r.hub_category_slug ?? null,
      hub_category_label: r.hub_category_label ?? null,
      hub_distribution_group: r.hub_distribution_group ?? null,
      hub_distribution_rank: r.hub_distribution_rank ?? null,
    created_at: r.created_at,
    linkedCategorySlug: r.linked_category_slug,
    linkedCategoryLabel: r.linked_category_label,
    heroListPriority: r.hero_list_priority
  };
}

/** Single RPC: paginated rows, totals, category facets — replaces full-table fetch + in-memory filter. */
export const fetchEssaysHubIndexPage = cache(
  async (
    state: EssaysHubIndexRequest
  ): Promise<{
    rows: EssayIndexRow[];
    total: number;
    categoryOptions: EssaysHubCategoryOption[];
    anyPublished: boolean;
  }> => {
    const supabase = createPublicClient();
    if (!supabase) {
      return {
        rows: [],
        total: 0,
        categoryOptions: [],
        anyPublished: false
      };
    }
    const { data, error } = await supabase.rpc('essays_hub_index_page', {
      p_q: state.q,
      p_category: state.categoryKey,
      p_sort: state.sort,
      p_page: state.page,
      p_page_size: ESSAYS_INDEX_PAGE_SIZE
    });

    if (error) throw new Error(error.message);

    const payload = data as {
      any_published?: boolean;
      total?: number;
      rows?: RpcEssaysHubRow[] | null;
      category_options?: { key: string; label: string; count: number }[] | null;
    };

    const rowsRaw = Array.isArray(payload.rows) ? payload.rows : [];
    const categoryRaw = Array.isArray(payload.category_options)
      ? payload.category_options
      : [];

    return {
      rows: rowsRaw.map(mapRpcEssayIndexRow),
      total: Number(payload.total ?? 0),
      categoryOptions: categoryRaw.map((o) => ({
        key: o.key,
        label: o.label,
        count: o.count
      })),
      anyPublished: Boolean(payload.any_published)
    };
  }
);

export async function countPublishedEssays(): Promise<number> {
  const supabase = createPublicClient();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('essays')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Latest published essay hub guides (same table/fields as `/essays` index cards). */
export async function fetchLatestPublishedEssayHubList(
  limit: number
): Promise<EssayListFields[]> {
  const size = Math.max(1, Math.min(200, Math.floor(limit)));
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('essays')
    .select(listSelect)
    .eq('is_published', true)
    .not('slug', 'is', null)
    .neq('slug', '')
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(size);

  if (error) throw new Error(error.message);
  return (data ?? []) as EssayListFields[];
}

/**
 * Published essay hub rows for specific slugs, **in the same order as `slugs`**
 * (skips missing rows). Case-insensitive ordering key.
 */
export async function fetchPublishedEssaysBySlugsOrdered(
  slugs: string[]
): Promise<EssayListFields[]> {
  const ordered = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  if (ordered.length === 0) return [];

  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('essays')
    .select(listSelect)
    .eq('is_published', true)
    .not('slug', 'is', null)
    .neq('slug', '')
    .in('slug', ordered);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as EssayListFields[];
  const map = new Map(rows.map((r) => [r.slug.toLowerCase(), r]));
  return ordered
    .map((s) => map.get(s.toLowerCase()))
    .filter((x): x is EssayListFields => Boolean(x));
}

async function fetchPublishedEssayBySlugUncached(
  slug: string
): Promise<EssayDetailRow | null> {
  const raw = slug.trim();
  if (!raw) return null;

  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('essays')
    .select(
      'id, slug, title, content_html, hero_image_url, hero_is_real, sources, faq, meta_description, hub_category_slug, hub_category_label, manual_topic, is_published, created_at, updated_at'
    )
    .eq('slug', raw)
    .eq('is_published', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as EssayDetailRow | null;
}

const fetchPublishedEssayBySlugCached = unstable_cache(
  fetchPublishedEssayBySlugUncached,
  ['published-essay-by-slug-v2'],
  { revalidate: 300 }
);

export const fetchPublishedEssayBySlug = cache(fetchPublishedEssayBySlugCached);

async function fetchScholarshipRowsForEssayUncached(
  essayId: string,
  limit = 8
): Promise<
  { id: string; slug: string | null; title: string | null }[]
> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data: links, error: e1 } = await supabase
    .from('scholarship_essays')
    .select('scholarship_id')
    .eq('essay_id', essayId)
    .limit(limit);

  if (e1) throw new Error(e1.message);
  const ids = (links ?? [])
    .map((r) => r.scholarship_id)
    .filter(Boolean) as string[];
  if (ids.length === 0) return [];

  const { data: rows, error: e2 } = await (supabase as any)
    .from('scholarships_safe_listing')
    .select('id, slug, title')
    .in('id', ids)
    .eq('is_active', true)
    .limit(limit);

  if (e2) throw new Error(e2.message);
  return (rows ?? []) as { id: string; slug: string | null; title: string | null }[];
}

const fetchScholarshipRowsForEssayCached = unstable_cache(
  fetchScholarshipRowsForEssayUncached,
  ['scholarship-rows-for-essay-v2'],
  { revalidate: 300 }
);

export const fetchScholarshipRowsForEssay = cache(fetchScholarshipRowsForEssayCached);

const ESSAYS_SITEMAP_BATCH = 500;
const ESSAYS_SITEMAP_MIN_PARALLEL_PAGES = 1;

export type EssaySitemapRow = {
  slug: string;
  title: string | null;
  content_html: string | null;
  meta_description: string | null;
  updated_at: string | null;
};

function applyPublishedEssaySitemapFilters(query: any) {
  return query
    .eq('is_published', true)
    .not('slug', 'is', null)
    .neq('slug', '')
    .not('content_html', 'is', null)
    .neq('content_html', '');
}

export async function countPublishedEssaySitemapRows(): Promise<number> {
  const supabase = createPublicClient();
  if (!supabase) return 0;

  const { count, error } = await applyPublishedEssaySitemapFilters(
    supabase.from('essays').select('id', { count: 'exact', head: true })
  );

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function fetchPublishedEssaySitemapRowsRange(
  from: number,
  to: number
): Promise<EssaySitemapRow[]> {
  const start = Math.max(0, Math.floor(from));
  const end = Math.max(start, Math.floor(to));
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await applyPublishedEssaySitemapFilters(
    supabase
      .from('essays')
      .select('slug, title, content_html, meta_description, updated_at')
  )
    .order('updated_at', { ascending: false, nullsFirst: false })
    .range(start, end);

  if (error) throw new Error(error.message);
  return (data ?? []) as EssaySitemapRow[];
}

/** All published essay slugs for sitemap generation. */
export async function fetchAllPublishedEssaySitemapRows(): Promise<
  EssaySitemapRow[]
> {
  const out: EssaySitemapRow[] = [];
  const count = await countPublishedEssaySitemapRows();
  const ranges = Array.from(
    {
      length: Math.max(
        Math.ceil(count / ESSAYS_SITEMAP_BATCH),
        ESSAYS_SITEMAP_MIN_PARALLEL_PAGES
      )
    },
    (_unused, index) => {
      const from = index * ESSAYS_SITEMAP_BATCH;
      return [from, from + ESSAYS_SITEMAP_BATCH - 1] as const;
    }
  );

  const pages = await Promise.all(
    ranges.map(([from, to]) => fetchPublishedEssaySitemapRowsRange(from, to))
  );

  for (const batch of pages) {
    out.push(...batch);
  }
  return out;
}

export async function fetchPublishedEssaysForScholarship(
  scholarshipId: string,
  limit = 4
): Promise<EssayListFields[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data: links, error: e1 } = await supabase
    .from('scholarship_essays')
    .select('essay_id')
    .eq('scholarship_id', scholarshipId)
    .limit(32);

  if (e1) throw new Error(e1.message);
  const essayIds = (links ?? [])
    .map((r) => r.essay_id)
    .filter(Boolean) as string[];
  if (essayIds.length === 0) return [];

  const { data: essays, error: e2 } = await supabase
    .from('essays')
    .select(listSelect)
    .in('id', essayIds)
    .eq('is_published', true)
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (e2) throw new Error(e2.message);
  return (essays ?? []) as EssayListFields[];
}
