import 'server-only';

import { unstable_cache } from 'next/cache';

import { deduplicateQuickSummaryBlocksInHtml } from '@/lib/content-hub/deduplicateQuickSummaryInHtml';
import { extractArticleSignals } from '@/lib/content-hub/articleScholarshipMatching/extractArticleSignals';
import { fetchScholarshipsForArticleMatching } from '@/lib/content-hub/articleScholarshipMatching/fetchScholarshipsForArticleMatching';
import { findScholarshipsForArticle } from '@/lib/content-hub/articleScholarshipMatching/scoreScholarshipsForArticle';
import { selectRelatedScholarshipsForArticle } from '@/lib/content-hub/articleScholarshipMatching/selectRelatedForArticle';
import { stripDisallowedAnchorsFromHtml } from '@/lib/content-hub/articleScholarshipMatching/stripArticleAnchors';
import type { RelatedScholarshipStored } from '@/lib/content-hub/articleScholarshipMatching/types';
import { sortPreferDeadlineFirst } from '@/lib/content-hub/relatedScholarshipSort';
import type { EssayDetailRow } from '@/lib/essays/essaysServer';
import { fetchScholarshipRowsForEssay } from '@/lib/essays/essaysServer';
import { createPublicClient } from '@/utils/supabase/public';

export const ESSAY_GUIDE_RELATED_SCHOLARSHIPS_MAX = 5;

async function fetchInternationalMatchingCatalogCached() {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      if (!supabase) return [];
      return fetchScholarshipsForArticleMatching(supabase, {
        onlyInternationalFriendly: true
      });
    },
    ['essay-guide-international-matching-catalog-v1'],
    { revalidate: 300, tags: ['scholarships:essay-guide-international'] }
  )();
}

async function enrichLinkedEssayScholarships(
  essayId: string,
  exclude: Set<string>
): Promise<RelatedScholarshipStored[]> {
  const linked = await fetchScholarshipRowsForEssay(essayId, 12);
  if (linked.length === 0) return [];
  const supabase = createPublicClient();
  if (!supabase) return [];
  const ids = linked.map((row) => row.id).filter(Boolean);
  const { data, error } = await supabase
    .from('scholarships')
    .select(
      'id, slug, title, award_amount_text, deadline_text, international_friendly_listing'
    )
    .in('id', ids)
    .eq('is_active', true)
    .eq('international_friendly_listing', true)
    .limit(ESSAY_GUIDE_RELATED_SCHOLARSHIPS_MAX);
  if (error) throw new Error(error.message);

  const out: RelatedScholarshipStored[] = [];
  for (const row of data ?? []) {
    const slug = row.slug?.trim() || row.id;
    if (!slug || exclude.has(slug)) continue;
    exclude.add(slug);
    out.push({
      slug,
      title: row.title?.trim() || 'Scholarship',
      score: 100,
      reason: 'International-friendly scholarship related to this guide',
      award_amount_text: row.award_amount_text?.trim() || null,
      deadline_text: row.deadline_text?.trim() || null
    });
  }
  return out;
}

async function computeRelatedScholarshipsForEssayGuide(
  essay: EssayDetailRow
): Promise<RelatedScholarshipStored[]> {
  const seen = new Set<string>();
  const merged: RelatedScholarshipStored[] = await enrichLinkedEssayScholarships(
    essay.id,
    seen
  );
  const remaining = ESSAY_GUIDE_RELATED_SCHOLARSHIPS_MAX - merged.length;
  if (remaining <= 0) return sortPreferDeadlineFirst(merged).slice(0, 5);

  const bodyHtml = deduplicateQuickSummaryBlocksInHtml(
    stripDisallowedAnchorsFromHtml(essay.content_html?.trim() ?? '')
  );
  const title = essay.title?.trim() || 'Essay guide';
  const signals = extractArticleSignals({
    title,
    metaTitle: title,
    metaDescription: essay.meta_description,
    bodyHtml
  });
  const rows = await fetchInternationalMatchingCatalogCached();
  const ranked = findScholarshipsForArticle(signals, title, rows);
  const picked = selectRelatedScholarshipsForArticle(ranked);

  for (const item of picked) {
    const slug = item.slug.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    merged.push({
      ...item,
      reason: item.reason || 'International-friendly scholarship related to this guide'
    });
    if (merged.length >= ESSAY_GUIDE_RELATED_SCHOLARSHIPS_MAX) break;
  }

  return sortPreferDeadlineFirst(merged).slice(
    0,
    ESSAY_GUIDE_RELATED_SCHOLARSHIPS_MAX
  );
}

export async function getRelatedScholarshipsForEssayGuide(
  essay: EssayDetailRow
): Promise<RelatedScholarshipStored[]> {
  const updated = essay.updated_at ?? '';
  return unstable_cache(
    () => computeRelatedScholarshipsForEssayGuide(essay),
    [
      'essay-guide-related-international-v1',
      essay.id,
      updated,
      String(ESSAY_GUIDE_RELATED_SCHOLARSHIPS_MAX)
    ],
    { revalidate: 300, tags: [`essay-guide-related:${essay.id}`] }
  )();
}
