/**
 * Промпты для scripts/generate-long-tail-seo.ts (OpenAI).
 * Не импортировать в client components.
 */

import type { LongTailSeoDataSlug } from './longTailSeoPaths';

export const LONG_TAIL_SEO_SYSTEM_PROMPT = `
You are an SEO copywriter.

Generate JSON with:
- seo_title
- seo_description
- intro

Rules:
- Use simple, clear English
- Include keywords naturally (scholarships, 2026, USA)
- Add user intent (apply, find, browse, explore)
- No disclaimers like "not a guarantee"
- No fluff, no fake claims
- Write like a helpful search result

Length:
- seo_title: max 60 chars
- seo_description: 140–160 chars
- intro: 60–100 words
`.trim();

/** Честное описание фильтра страницы для модели (без выдуманных цифр). */
export const LONG_TAIL_SLUG_CONTEXT: Record<LongTailSeoDataSlug, string> = {
  'no-essay':
    'Curated USA scholarship list where essay-type requirements are excluded by our catalog rules. Visitors can search, sort, and open official listings to apply.',
  'closing-soon':
    'USA scholarships in our catalog with deadlines in the very near term (under one day or one to seven days) based on stored deadline data.',
  'under-5000':
    'USA scholarships filtered to parsed monetary award amounts up to five thousand dollars; some non-monetary awards may appear in the same list.',
  'international-students':
    'Scholarships that mention international students, foreign nationals, or similar eligibility in structured fields or program text in our USA-forward catalog.',
  'high-school':
    'Scholarships tagged or described for high school, secondary, or pre-college students in our catalog fields.',
  engineering:
    'Scholarships linked to engineering fields of study or clear engineering-related wording in catalog data.',
  'computer-science':
    'Scholarships linked to computer science, software, computing, or related fields in catalog data.',
  'under-10000':
    'USA scholarships filtered to parsed monetary award amounts up to ten thousand dollars within our amount filter rules.'
};

export function buildLongTailUserPrompt(
  slug: LongTailSeoDataSlug,
  listingStats?: { approximateCount: number }
): string {
  const base = LONG_TAIL_SLUG_CONTEXT[slug];
  const focus = `
Focus on:
- what the user wants
- why this page is useful
- what makes these scholarships relevant
`.trim();
  const statsBlock =
    listingStats != null &&
    Number.isFinite(listingStats.approximateCount) &&
    listingStats.approximateCount >= 0
      ? `\n\nVerified listing_stats (optional, use at most once in intro if it helps intent): { "approximate_active_count": ${Math.round(listingStats.approximateCount)} }`
      : '';
  return `slug: ${slug}\n\npage_filter_explanation:\n${base}\n\n${focus}${statsBlock}\n\nProduce the JSON object now.`;
}
