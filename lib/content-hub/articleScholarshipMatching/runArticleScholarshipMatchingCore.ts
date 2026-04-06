/**
 * Shared matching pipeline (Node + Next server). No `server-only` — safe for tsx scripts.
 * Next routes should import via `runArticleScholarshipMatchingPipeline.ts` (adds server-only guard).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@/types_db';

import { extractArticleSignals } from './extractArticleSignals';
import { fetchScholarshipsForArticleMatching } from './fetchScholarshipsForArticleMatching';
import { findScholarshipsForArticle } from './scoreScholarshipsForArticle';
import { insertInlineScholarshipLinks } from './insertInlineScholarshipLinks';
import { selectRelatedScholarshipsForArticle } from './selectRelatedForArticle';
import { stripDisallowedAnchorsFromHtml } from './stripArticleAnchors';
import type {
  ArticleMatchDiagnostics,
  RelatedScholarshipStored,
  ScholarshipMatchDbRow
} from './types';
import { ARTICLE_MATCH_PIPELINE_VERSION } from './types';

function log(line: string) {
  console.log(`[resources:article-match] ${line}`);
}

export type RunArticleScholarshipMatchingInput = {
  title: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  bodyHtml: string;
};

export type RunArticleScholarshipMatchingResult = {
  bodyHtml: string;
  relatedScholarships: RelatedScholarshipStored[];
  diagnostics: ArticleMatchDiagnostics;
  /** JSON-safe for `content_posts.article_match_diagnostics` */
  diagnosticsJson: Json;
  /** JSON-safe for `content_posts.related_scholarships` */
  relatedJson: Json;
};

/**
 * Deterministic matching + optional inline internal links.
 * Call from your content job after AI text is saved (or before insert).
 *
 * Note: Legacy `runContentJob.ts` / anchor verification stages are not in this
 * repo — wire this function into the job that publishes `content_posts`.
 */
export async function runArticleScholarshipMatchingPipeline(
  supabase: SupabaseClient<Database>,
  input: RunArticleScholarshipMatchingInput
): Promise<RunArticleScholarshipMatchingResult> {
  log('scholarship article matching started');

  const strippedBody = stripDisallowedAnchorsFromHtml(input.bodyHtml);
  const signals = extractArticleSignals({
    title: input.title,
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
    bodyHtml: strippedBody
  });
  log(
    `article signals extracted: countries=${signals.countries.length} audiences=${signals.audiences.length} degrees=${signals.degrees.length} fields=${signals.fields.length} funding=${signals.fundingTypes.length} keywords=${signals.keywords.length}`
  );

  const rows = await fetchScholarshipsForArticleMatching(supabase);
  const ranked = findScholarshipsForArticle(
    signals,
    input.title,
    rows
  );

  log(
    `scholarship article matching complete: candidates=${ranked.length} catalogRows=${rows.length}`
  );

  const relatedScholarships = selectRelatedScholarshipsForArticle(ranked);
  log(`related scholarships selected: ${relatedScholarships.length}`);

  const rowBySlug = new Map<string, ScholarshipMatchDbRow>();
  for (const m of ranked) {
    const s = m.row.slug?.trim();
    if (s) rowBySlug.set(s, m.row);
  }

  const {
    html: withInline,
    inlineLinksInserted,
    inlineFallbackUsed
  } = insertInlineScholarshipLinks(strippedBody, relatedScholarships, rowBySlug, 3);
  log(
    `inline scholarship links inserted: ${inlineLinksInserted}, fallback: ${inlineFallbackUsed}`
  );

  const diagnostics: ArticleMatchDiagnostics = {
    version: ARTICLE_MATCH_PIPELINE_VERSION,
    signals,
    topMatches: ranked.slice(0, 12).map((m) => ({
      slug: m.row.slug.trim(),
      score: m.score
    })),
    inlineLinksInserted,
    inlineFallbackUsed,
    relatedSelected: relatedScholarships.length
  };

  return {
    bodyHtml: withInline,
    relatedScholarships,
    diagnostics,
    diagnosticsJson: diagnostics as unknown as Json,
    relatedJson: relatedScholarships as unknown as Json
  };
}
