import 'server-only';

import { cache } from 'react';

import { createPublicClient } from '@/utils/supabase/public';

export type EssayListFields = {
  id: string;
  slug: string;
  title: string;
  hero_image_url: string | null;
  meta_description: string | null;
  created_at: string | null;
};

/** `/essays` index: list fields plus first linked scholarship category (for filters). */
export type EssayIndexRow = EssayListFields & {
  linkedCategorySlug: string | null;
  linkedCategoryLabel: string | null;
};

export type EssayDetailRow = {
  id: string;
  slug: string;
  title: string;
  content_html: string;
  hero_image_url: string | null;
  sources: unknown;
  faq: unknown;
  meta_description: string | null;
  is_published: boolean;
  created_at: string | null;
  updated_at: string | null;
};

const listSelect =
  'id, slug, title, hero_image_url, meta_description, created_at' as const;

export const ESSAYS_INDEX_PAGE_SIZE = 12;

export async function countPublishedEssays(): Promise<number> {
  const supabase = createPublicClient();
  const { count, error } = await supabase
    .from('essays')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

const ESSAYS_INDEX_FETCH_BATCH = 500;

function pickFirstCategoryPerEssay(
  links: {
    essay_id: string;
    scholarship_id: string;
    scholarships: {
      category: string | null;
      category_slug: string | null;
    } | null;
  }[]
): Map<string, { slug: string | null; label: string | null }> {
  const sorted = [...links].sort((a, b) => {
    const c = a.essay_id.localeCompare(b.essay_id);
    if (c !== 0) return c;
    return a.scholarship_id.localeCompare(b.scholarship_id);
  });
  const map = new Map<string, { slug: string | null; label: string | null }>();
  for (const row of sorted) {
    if (map.has(row.essay_id)) continue;
    const s = row.scholarships;
    map.set(row.essay_id, {
      slug: s?.category_slug?.trim() || null,
      label: s?.category?.trim() || null
    });
  }
  return map;
}

/** All published essays with slug + first linked scholarship category (batched). */
export async function fetchAllPublishedEssaysForIndex(): Promise<EssayIndexRow[]> {
  const supabase = createPublicClient();
  const essays: EssayListFields[] = [];
  let page = 1;
  for (;;) {
    const batch = await fetchPublishedEssaysPage(page, ESSAYS_INDEX_FETCH_BATCH);
    essays.push(...batch);
    if (batch.length < ESSAYS_INDEX_FETCH_BATCH) break;
    page += 1;
  }

  const withSlug = essays.filter((e) => e.slug?.trim());
  if (withSlug.length === 0) return [];

  const essayIds = withSlug.map((e) => e.id);
  const categoryByEssay = new Map<
    string,
    { slug: string | null; label: string | null }
  >();

  const chunkSize = 200;
  for (let i = 0; i < essayIds.length; i += chunkSize) {
    const chunk = essayIds.slice(i, i + chunkSize);
    const { data: links, error } = await supabase
      .from('scholarship_essays')
      .select(
        'essay_id, scholarship_id, scholarships(category, category_slug)'
      )
      .in('essay_id', chunk);

    if (error) throw new Error(error.message);
    const rows = (links ?? []) as {
      essay_id: string;
      scholarship_id: string;
      scholarships: {
        category: string | null;
        category_slug: string | null;
      } | null;
    }[];
    const picked = pickFirstCategoryPerEssay(rows);
    for (const [id, cat] of picked) {
      if (!categoryByEssay.has(id)) categoryByEssay.set(id, cat);
    }
  }

  return withSlug.map((e) => {
    const cat = categoryByEssay.get(e.id);
    return {
      ...e,
      linkedCategorySlug: cat?.slug ?? null,
      linkedCategoryLabel: cat?.label ?? null
    };
  });
}

export async function fetchPublishedEssaysPage(
  page: number,
  pageSize: number
): Promise<EssayListFields[]> {
  const safePage = Math.max(1, Math.floor(page));
  const size = Math.max(1, Math.floor(pageSize));
  const from = (safePage - 1) * size;
  const to = from + size - 1;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('essays')
    .select(listSelect)
    .eq('is_published', true)
    .order('created_at', { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  return (data ?? []) as EssayListFields[];
}

export const fetchPublishedEssayBySlug = cache(
  async (slug: string): Promise<EssayDetailRow | null> => {
    const raw = slug.trim();
    if (!raw) return null;

    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('essays')
      .select(
        'id, slug, title, content_html, hero_image_url, sources, faq, meta_description, is_published, created_at, updated_at'
      )
      .eq('slug', raw)
      .eq('is_published', true)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as EssayDetailRow | null;
  }
);

export async function fetchScholarshipRowsForEssay(
  essayId: string,
  limit = 8
): Promise<
  { id: string; slug: string | null; title: string | null }[]
> {
  const supabase = createPublicClient();
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

  const { data: rows, error: e2 } = await supabase
    .from('scholarships')
    .select('id, slug, title')
    .in('id', ids)
    .eq('is_active', true)
    .limit(limit);

  if (e2) throw new Error(e2.message);
  return (rows ?? []) as { id: string; slug: string | null; title: string | null }[];
}

const ESSAYS_SITEMAP_BATCH = 500;

/** All published essay slugs for sitemap generation. */
export async function fetchAllPublishedEssaySitemapRows(): Promise<
  { slug: string; updated_at: string | null }[]
> {
  const out: { slug: string; updated_at: string | null }[] = [];
  let from = 0;
  for (;;) {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('essays')
      .select('slug, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .range(from, from + ESSAYS_SITEMAP_BATCH - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as { slug: string; updated_at: string | null }[];
    const withSlug = batch.filter((r) => Boolean(r.slug?.trim()));
    out.push(...withSlug);
    if (batch.length < ESSAYS_SITEMAP_BATCH) break;
    from += ESSAYS_SITEMAP_BATCH;
  }
  return out;
}

export async function fetchPublishedEssaysForScholarship(
  scholarshipId: string,
  limit = 4
): Promise<EssayListFields[]> {
  const supabase = createPublicClient();
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
