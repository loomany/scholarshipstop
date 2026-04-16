import 'server-only';

import { cache } from 'react';

import type { ContentPostRow, ContentPostListFields } from '@/lib/content-hub/contentPostListTypes';
import { createPublicClient } from '@/utils/supabase/public';

export type { ContentPostRow, ContentPostListFields } from '@/lib/content-hub/contentPostListTypes';

const publishedWithSlugSelect =
  'id, title, slug, cover_image_url, meta_description, published_at' as const;

function publishedPostsWithSlugQuery() {
  const supabase = createPublicClient();
  return supabase
    .from('content_posts')
    .select(publishedWithSlugSelect)
    .eq('status', 'published')
    .not('slug', 'is', null)
    .neq('slug', '');
}

/** Total published posts that have a non-empty slug (listable on `/resources`). */
export async function countPublishedContentPostsWithSlug(): Promise<number> {
  const supabase = createPublicClient();
  const { count, error } = await supabase
    .from('content_posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .not('slug', 'is', null)
    .neq('slug', '');

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * One-based page index. Only posts with a slug are included (same as public index).
 */
export async function fetchPublishedContentPostsPage(
  page: number,
  pageSize: number
): Promise<ContentPostListFields[]> {
  const safePage = Math.max(1, Math.floor(page));
  const size = Math.max(1, Math.floor(pageSize));
  const from = (safePage - 1) * size;
  const to = from + size - 1;

  const { data, error } = await publishedPostsWithSlugQuery()
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  return (data ?? []) as ContentPostListFields[];
}

const RESOURCES_INDEX_FETCH_BATCH = 500;

/** All published posts with slug (for `/resources` filtering). Batched for large catalogs. */
export async function fetchAllPublishedContentPostsListFields(): Promise<
  ContentPostListFields[]
> {
  const out: ContentPostListFields[] = [];
  let page = 1;
  for (;;) {
    const batch = await fetchPublishedContentPostsPage(
      page,
      RESOURCES_INDEX_FETCH_BATCH
    );
    out.push(...batch);
    if (batch.length < RESOURCES_INDEX_FETCH_BATCH) break;
    page += 1;
  }
  return out;
}

/**
 * Published list fields for specific slugs, **in the same order as `slugs`**
 * (skips missing rows). Case-insensitive ordering key; DB must return matching slug rows.
 */
export async function fetchPublishedContentPostsBySlugsOrdered(
  slugs: string[]
): Promise<ContentPostListFields[]> {
  const ordered = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  if (ordered.length === 0) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('content_posts')
    .select(publishedWithSlugSelect)
    .eq('status', 'published')
    .not('slug', 'is', null)
    .neq('slug', '')
    .in('slug', ordered);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ContentPostListFields[];
  const map = new Map(rows.map((r) => [r.slug!.toLowerCase(), r]));
  return ordered
    .map((s) => map.get(s.toLowerCase()))
    .filter((x): x is ContentPostListFields => Boolean(x));
}

/** @deprecated Prefer `fetchPublishedContentPostsPage` for the resources index. */
export async function fetchPublishedContentPosts(
  limit = 12
): Promise<ContentPostListFields[]> {
  return fetchPublishedContentPostsPage(1, limit);
}

export const fetchPublishedContentPostBySlug = cache(
  async (slug: string): Promise<ContentPostRow | null> => {
    const raw = slug.trim();
    if (!raw) return null;

    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('content_posts')
      .select('*')
      .eq('slug', raw)
      .eq('status', 'published')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as ContentPostRow | null;
  }
);

export async function fetchRelatedPublishedContentPosts(
  excludeSlug: string,
  limit = 3
): Promise<ContentPostListFields[]> {
  const raw = excludeSlug.trim();
  const supabase = createPublicClient();
  let q = supabase
    .from('content_posts')
    .select(
      'id, title, slug, cover_image_url, meta_description, published_at'
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(limit + 1);

  if (raw) q = q.neq('slug', raw);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ContentPostListFields[];
  return rows.slice(0, limit);
}

const RELATED_ARTICLES_FOR_SCHOLARSHIP_MAX = 3;

function mergeContentPostListFieldsById(
  rows: ContentPostListFields[],
  more: ContentPostListFields[]
): ContentPostListFields[] {
  const byId = new Map<string, ContentPostListFields>();
  for (const row of rows) {
    if (row?.id) byId.set(row.id, row);
  }
  for (const row of more) {
    if (row?.id && !byId.has(row.id)) byId.set(row.id, row);
  }
  return Array.from(byId.values());
}

function sortContentPostsByRecency(rows: ContentPostListFields[]): ContentPostListFields[] {
  return [...rows].sort((a, b) => {
    const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
    const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
    return tb - ta;
  });
}

/**
 * Published articles that reference this catalog scholarship slug in either
 * `related_scholarships` (matching pipeline) or legacy `scholarship_links` (Connect Hub).
 */
export const fetchPublishedArticlesForScholarshipSlug = cache(
  async (
    scholarshipSlug: string,
    limit = RELATED_ARTICLES_FOR_SCHOLARSHIP_MAX
  ): Promise<ContentPostListFields[]> => {
    const raw = scholarshipSlug.trim();
    if (!raw) return [];

    const cap = Math.max(1, Math.min(6, Math.floor(limit)));
    try {
      const supabase = createPublicClient();
      /** `cs` = `@>` (JSON contains). */
      const slugProbe = JSON.stringify([{ slug: raw }]);

      const base = () =>
        supabase
          .from('content_posts')
          .select(publishedWithSlugSelect)
          .eq('status', 'published')
          .not('slug', 'is', null)
          .neq('slug', '');

      const [{ data: fromRelated, error: err1 }, { data: fromLinks, error: err2 }] =
        await Promise.all([
          base()
            .filter('related_scholarships', 'cs', slugProbe)
            .order('published_at', { ascending: false, nullsFirst: false })
            .order('updated_at', { ascending: false, nullsFirst: false })
            .limit(cap),
          base()
            .filter('scholarship_links', 'cs', slugProbe)
            .order('published_at', { ascending: false, nullsFirst: false })
            .order('updated_at', { ascending: false, nullsFirst: false })
            .limit(cap)
        ]);

      if (err1 || err2) return [];

      const merged = mergeContentPostListFieldsById(
        (fromRelated ?? []) as ContentPostListFields[],
        (fromLinks ?? []) as ContentPostListFields[]
      );
      return sortContentPostsByRecency(merged).slice(0, cap);
    } catch {
      return [];
    }
  }
);
