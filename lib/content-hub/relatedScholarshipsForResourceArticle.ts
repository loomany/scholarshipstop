import 'server-only';

import { unstable_cache } from 'next/cache';

import type { ContentPostRow } from '@/lib/content-hub/contentPostListTypes';
import { deduplicateQuickSummaryBlocksInHtml } from '@/lib/content-hub/deduplicateQuickSummaryInHtml';
import { resolveRelatedScholarshipsForContentPost } from '@/lib/content-hub/articleScholarshipMatching/parseRelatedScholarshipsJson';
import { extractArticleSignals } from '@/lib/content-hub/articleScholarshipMatching/extractArticleSignals';
import { fetchScholarshipsForArticleMatching } from '@/lib/content-hub/articleScholarshipMatching/fetchScholarshipsForArticleMatching';
import { findScholarshipsForArticle } from '@/lib/content-hub/articleScholarshipMatching/scoreScholarshipsForArticle';
import { selectRelatedScholarshipsForArticle } from '@/lib/content-hub/articleScholarshipMatching/selectRelatedForArticle';
import { stripDisallowedAnchorsFromHtml } from '@/lib/content-hub/articleScholarshipMatching/stripArticleAnchors';
import type { RelatedScholarshipStored } from '@/lib/content-hub/articleScholarshipMatching/types';
import { sortPreferDeadlineFirst } from '@/lib/content-hub/relatedScholarshipSort';
import { createPublicClient } from '@/utils/supabase/public';

/** Max scholarship cards at the bottom of `/resources/[slug]`. */
export const RESOURCE_ARTICLE_RELATED_SCHOLARSHIPS_MAX = 3;

async function enrichFromCatalog(
  items: RelatedScholarshipStored[]
): Promise<RelatedScholarshipStored[]> {
  if (items.length === 0) return items;
  const supabase = createPublicClient();
  const slugs = [...new Set(items.map((i) => i.slug.trim()).filter(Boolean))];
  const { data, error } = await supabase
    .from('scholarships')
    .select('slug, title, award_amount_text, deadline_text')
    .in('slug', slugs);

  if (error || !data?.length) return items;

  const bySlug = new Map<string, (typeof data)[number]>();
  for (const r of data) {
    const s = r.slug?.trim();
    if (s) bySlug.set(s, r);
  }

  return items.map((item) => {
    const r = bySlug.get(item.slug.trim());
    if (!r) return item;
    return {
      ...item,
      title: item.title?.trim() || r.title?.trim() || item.title,
      award_amount_text:
        item.award_amount_text ?? r.award_amount_text?.trim() ?? null,
      deadline_text: item.deadline_text ?? r.deadline_text?.trim() ?? null
    };
  });
}

/**
 * Deterministic catalog matches (same signals as `runArticleScholarshipMatchingPipeline`),
 * excluding slugs already chosen by Connect Hub / `related_scholarships`.
 */
async function relatedFromMatchingExcluding(
  post: ContentPostRow,
  exclude: Set<string>,
  maxAdd: number
): Promise<RelatedScholarshipStored[]> {
  if (maxAdd <= 0) return [];

  const bodyHtml = post.body_html?.trim() ?? '';
  if (!bodyHtml) return [];

  const supabase = createPublicClient();
  const strippedBody = deduplicateQuickSummaryBlocksInHtml(
    stripDisallowedAnchorsFromHtml(bodyHtml)
  );
  const title = post.title?.trim() || 'Article';
  const signals = extractArticleSignals({
    title,
    metaTitle: post.meta_title,
    metaDescription: post.meta_description,
    bodyHtml: strippedBody
  });

  const rows = await fetchScholarshipsForArticleMatching(supabase);
  const ranked = findScholarshipsForArticle(signals, title, rows);
  const picked = selectRelatedScholarshipsForArticle(ranked);

  const out: RelatedScholarshipStored[] = [];
  for (const p of picked) {
    const s = p.slug.trim();
    if (!s || exclude.has(s)) continue;
    exclude.add(s);
    out.push(p);
    if (out.length >= maxAdd) break;
  }
  return out;
}

async function computeRelatedScholarships(
  post: ContentPostRow
): Promise<RelatedScholarshipStored[]> {
  const base = resolveRelatedScholarshipsForContentPost(
    post.related_scholarships,
    post.scholarship_links
  );

  const seen = new Set(base.map((b) => b.slug.trim()));
  let merged: RelatedScholarshipStored[] = [...base];

  if (merged.length < RESOURCE_ARTICLE_RELATED_SCHOLARSHIPS_MAX) {
    const extra = await relatedFromMatchingExcluding(
      post,
      seen,
      RESOURCE_ARTICLE_RELATED_SCHOLARSHIPS_MAX - merged.length
    );
    merged = merged.concat(extra);
  }

  merged = await enrichFromCatalog(merged);
  return sortPreferDeadlineFirst(merged).slice(
    0,
    RESOURCE_ARTICLE_RELATED_SCHOLARSHIPS_MAX
  );
}

export async function getRelatedScholarshipsForResourceArticle(
  post: ContentPostRow
): Promise<RelatedScholarshipStored[]> {
  const updated = post.updated_at ?? '';
  return unstable_cache(
    () => computeRelatedScholarships(post),
    [
      'resource-article-related-v1',
      post.id,
      updated,
      String(RESOURCE_ARTICLE_RELATED_SCHOLARSHIPS_MAX)
    ],
    { revalidate: 300, tags: [`content-post-related:${post.id}`] }
  )();
}
